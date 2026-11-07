import { describe, expect, it } from 'vitest'
import { initialState, type GameState } from '@/lib/match'
import { botMustAct, botSight, decideBotMove, type BotLevel } from '@/lib/tantbot'
import { moveAllowed, startTantMatch, tantDeadline, tantMove, type TantHost, type TantMove } from '@/lib/tantpanik'
import { CARD_TYPES } from '@/lib/tantpanik-kort'

// Otillåtna drag i Exploderande Tanter: under hela matcher med bottar skickas slumpade drag som inte får gå igenom (fel
// tur, fel fas, kort man inte har, tre olika kort, Tantsnara i par, drag efter att man åkt ut, ett för sent Nope!). Inget
// av dem får ändra matchen: bordet, högen, händerna och slänghögen är desamma efteråt. De som ska stoppas av fas, tur
// eller att man är ute stoppas redan av moveAllowed.

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MATCHES = 150
const pick = <T,>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)]

// Det som ska vara oförändrat efter ett otillåtet drag. Beskedet och dragets nummer får ändras.
const snapshot = (host: TantHost) =>
  JSON.stringify([host.state.tantpanik, host.state.phase, host.state.deadline, host.secrets.deck, host.secrets.hands, host.secrets.discard, host.secrets.removed])

type Kind = 'tur' | 'fas' | 'ute' | 'kort' | 'tre' | 'snara' | 'sent-nope'

// Ett otillåtet drag för just det här läget, eller null om det inte går att hitta på ett av den sorten. phaseOrTurn =
// moveAllowed ska neka det redan på fas, tur eller att man är ute.
function illegal(host: TantHost, kind: Kind, random: () => number): { id: string; move: TantMove; phaseOrTurn: boolean } | null {
  const table = host.state.tantpanik!
  const alive = table.order.filter((id) => !table.out.includes(id))
  const hands = host.secrets.hands
  switch (kind) {
    case 'tur': {
      if (table.step !== 'turn') return null
      const other = alive.find((id) => id !== table.current)
      if (!other) return null
      const card = hands[other][0]
      return { id: other, move: card && random() < 0.5 ? { type: 'tPlay', cards: [card.id] } : { type: 'tDraw' }, phaseOrTurn: true }
    }
    case 'fas': {
      const moves: TantMove[] = [
        { type: 'tPlace', position: 0 },
        { type: 'tArrange', order: [0, 1, 2] },
        { type: 'tPick', index: 0 },
        { type: 'tGive', card: hands[table.current]?.[0]?.id ?? 'x' },
        { type: 'tNope', card: 'x', level: 0 },
        { type: 'tFinish' },
      ]
      const move = moves.find((candidate) => !moveAllowed(table, table.current, candidate) && random() < 0.6) ?? moves.find((candidate) => !moveAllowed(table, table.current, candidate))
      return move ? { id: table.current, move, phaseOrTurn: true } : null
    }
    case 'ute': {
      const gone = table.out[0]
      if (!gone) return null
      const moves: TantMove[] = [{ type: 'tDraw' }, { type: 'tNope', card: 'x', level: table.pending?.nopes ?? 0 }, { type: 'tPlace', position: 0 }, { type: 'tPick', index: 0 }]
      return { id: gone, move: pick(moves, random), phaseOrTurn: true }
    }
    case 'kort': {
      // Kort man inte har: någon annans, eller ett påhittat id.
      if (table.step !== 'turn') return null
      const others = alive.filter((id) => id !== table.current).flatMap((id) => hands[id])
      const card = others.length > 0 && random() < 0.7 ? pick(others, random).id : `påhittat-${Math.floor(random() * 1000)}`
      const target = alive.find((id) => id !== table.current)
      return { id: table.current, move: { type: 'tPlay', cards: [card], target }, phaseOrTurn: false }
    }
    case 'tre': {
      // Tre kort med olika namn är inget tretal.
      if (table.step !== 'turn') return null
      const hand = hands[table.current]
      const chosen = hand.filter((card, i) => hand.findIndex((other) => other.type === card.type) === i && card.type !== 'vild').slice(0, 3)
      if (chosen.length < 3) return null
      const target = alive.find((id) => id !== table.current)
      return { id: table.current, move: { type: 'tPlay', cards: chosen.map((card) => card.id), target, request: 'fika' }, phaseOrTurn: false }
    }
    case 'snara': {
      // Tantsnara i par eller tretal, också med en Vild tant.
      if (table.step !== 'turn') return null
      const hand = hands[table.current]
      const snaror = hand.filter((card) => card.type === 'snara')
      const vild = hand.find((card) => card.type === 'vild')
      const cards = snaror.length >= 2 ? snaror.slice(0, 2) : snaror.length === 1 && vild ? [snaror[0], vild] : null
      if (!cards) return null
      const target = alive.find((id) => id !== table.current)
      return { id: table.current, move: { type: 'tPlay', cards: cards.map((card) => card.id), target }, phaseOrTurn: false }
    }
    case 'sent-nope': {
      // Ett Nope! på en nivå i kedjan som redan passerats (två trycker samtidigt).
      if (table.step !== 'window' || !table.pending || table.pending.nopes === 0) return null
      const holder = alive.find((id) => hands[id].some((card) => card.type === 'nadu'))
      if (!holder) return null
      const card = hands[holder].find((c) => c.type === 'nadu')!
      return { id: holder, move: { type: 'tNope', card: card.id, level: table.pending.nopes - 1 }, phaseOrTurn: false }
    }
  }
}

const KINDS: Kind[] = ['tur', 'fas', 'ute', 'kort', 'tre', 'snara', 'sent-nope']

describe('otillåtna drag i Exploderande Tanter', () => {
  it(`stoppas alla och ändrar ingenting (${MATCHES} matcher)`, { timeout: 300_000 }, () => {
    const tried: Record<Kind, number> = { tur: 0, fas: 0, ute: 0, kort: 0, tre: 0, snara: 0, 'sent-nope': 0 }
    for (let seed = 1; seed <= MATCHES; seed++) {
      const random = seeded(seed)
      const players = 2 + (seed % 9)
      const ids = Array.from({ length: players }, (_, i) => `b${i}`)
      const bots: Record<string, BotLevel> = Object.fromEntries(ids.map((id, i) => [id, (['latt', 'normal', 'svar'] as BotLevel[])[(seed + i) % 3]]))
      // Tantsnara alltid på, och gärna många vilda tanter och snaror på handen, så att alla sorter går att pröva.
      const lobby: GameState = {
        ...initialState('tantpanik'),
        players: Object.fromEntries(ids.map((id) => [id, { name: id, avatar: '🙂', bot: bots[id] }])),
        tantSettings: { trap: true, level: (['normal', 'svar', 'kaos'] as const)[seed % 3] },
      }
      let host = startTantMatch(lobby, random)
      let now = 1000
      for (let step = 0; step < 4000 && host.state.phase === 'playing'; step++) {
        const table = host.state.tantpanik!
        // Först några otillåtna drag i det här läget.
        for (let k = 0; k < 2; k++) {
          const kind = pick(KINDS, random)
          const attempt = illegal(host, kind, random)
          if (!attempt) continue
          tried[kind]++
          if (attempt.phaseOrTurn) expect(moveAllowed(table, attempt.id, attempt.move), `frö ${seed}: ${kind} ${attempt.move.type}`).toBe(false)
          const before = snapshot(host)
          const after = tantMove(host, attempt.id, attempt.move, `otillatet-${seed}-${step}-${k}`, now, random)
          expect(snapshot(after), `frö ${seed} steg ${step}: ${kind} ${JSON.stringify(attempt.move)}`).toBe(before)
        }
        // Sedan spelet som vanligt.
        now += 500
        if (table.winner) {
          host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
          continue
        }
        if (table.step === 'window') {
          const noper = table.order.find((id) => decideBotMove(botSight(host, id)!, bots[id], seeded(seed + step))?.type === 'tNope')
          host = noper
            ? tantMove(host, noper, decideBotMove(botSight(host, noper)!, bots[noper], seeded(seed + step))!, null, now, random)
            : tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
          continue
        }
        const actor = table.order.find((id) => botMustAct(table, id))!
        const move = decideBotMove(botSight(host, actor)!, bots[actor], random)!
        host = tantMove(host, actor, move, null, now, random)
      }
      expect(host.state.phase, `frö ${seed}`).toBe('finished')
    }
    // Alla sorter har prövats många gånger.
    for (const kind of KINDS) expect(tried[kind], kind).toBeGreaterThan(20)
    void CARD_TYPES
  })
})
