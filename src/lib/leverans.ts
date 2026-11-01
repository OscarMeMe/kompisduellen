// Ett meddelande i kanalen kan försvinna utan att anslutningen bryts. Därför skickas spelarens drag igen, med en kort
// paus mellan försöken och en gräns, tills värdens läge visar att det kommit fram. Varje drag har ett eget nummer, så
// att värden inte räknar samma drag två gånger. Rena funktioner, så att de är lätta att testa.

import type { ImposterMove, MyImposterCard } from '@/lib/imposterjakten'
import type { CardMove, MyHand } from '@/lib/kort'
import type { GameState } from '@/lib/match'

// Pausen mellan försöken (ms) och hur många gånger ett drag eller en gissning skickas igen. En sista paus efter det sista
// försöket, och sedan ges det upp: tillsammans cirka 30 sekunder.
export const RESEND_MS = 3000
export const RESEND_MAX_TRIES = 9
// Så många dragnummer kommer värden ihåg per spelare.
const SEEN_MOVES_KEPT = 30

export type AnyMove = CardMove | ImposterMove

// Det jag vet just nu: läget från värden och det värden skickat bara till mig.
export type MoveView = { state: GameState; id: string; hand: MyHand | null; card: MyImposterCard | null }

// Hur det såg ut när draget skickades, för att se när det har hänt något.
type Sent = { scope: string; turn: number; rejectedAt: number | null; accusation: string | null }

// failed = försöken har tagit slut, och spelaren får välja att skicka igen. Draget ligger kvar, för läget kan ännu visa
// att det kommit fram.
export type PendingMove = { nr: string; move: AnyMove; sent: Sent; sentAt: number; tries: number; failed: boolean }

// Vad spelaren ser: inget (ok), en diskret rad medan det skickas igen (sending) eller ett besked med en knapp (failed).
export type Delivery = 'ok' | 'sending' | 'failed'

// Omgången, rundan och (efter lika röster) den extra omröstningen. Ändras det gäller inte draget längre.
function moveScope(state: GameState): string {
  const { imposter, cards } = state
  if (imposter) return `${state.phase}|${state.round}|${imposter.order.join()}|${imposter.tied?.join() ?? ''}`
  return `${state.phase}|${state.round}|${cards?.prompt ?? ''}`
}

function accusationKey(state: GameState): string | null {
  const accusation = state.imposter?.accusation
  return accusation ? `${accusation.accuser}>${accusation.accused}` : null
}

export function newPendingMove(nr: string, move: AnyMove, view: MoveView, now: number): PendingMove {
  return {
    nr,
    move,
    sent: {
      scope: moveScope(view.state),
      turn: view.state.imposter?.turn ?? 0,
      rejectedAt: view.card?.rejectedAt ?? null,
      accusation: accusationKey(view.state),
    },
    sentAt: now,
    tries: 0,
    failed: false,
  }
}

// Drag som ersätter varandra: ett nytt val eller ett nytt ord gör att det förra inte ska skickas igen.
function moveSlot(move: AnyMove): string {
  if (move.type === 'clue' || move.type === 'pass' || move.type === 'said') return 'turn'
  if (move.type === 'guess' || move.type === 'giveUp') return 'final'
  return move.type
}

export function addPendingMove(list: readonly PendingMove[], pending: PendingMove): PendingMove[] {
  return [...list.filter((other) => moveSlot(other.move) !== moveSlot(pending.move)), pending]
}

// Visar läget att draget har kommit fram, eller att det inte längre behövs (spelet har gått vidare)?
export function moveArrived(pending: PendingMove, view: MoveView): boolean {
  const { move, sent } = pending
  const { state, id, hand, card } = view
  if (state.phase !== 'playing' || moveScope(state) !== sent.scope) return true
  const table = state.imposter
  if (table) {
    switch (move.type) {
      case 'read':
        return table.step !== 'kort' || table.read.includes(id)
      case 'clue':
      case 'pass':
      case 'said':
        return table.step !== 'ledtradar' || table.turn !== sent.turn || (card?.rejectedAt ?? null) !== sent.rejectedAt
      // Pågår någon annans anklagelse ska mitt försök inte skickas igen efteråt, då har allt ändrats.
      case 'accuse':
        return table.accusation !== null || table.accusers.includes(id) || table.step === 'rostning' || table.step === 'gissning' || table.step === 'facit'
      case 'accuseVote':
        return accusationKey(state) !== sent.accusation || (card?.accuseVote ?? null) !== null
      case 'ready':
        return table.step !== 'diskussion' || card?.ready === move.on || (!move.on && table.countdownStarted)
      case 'vote':
        return table.step !== 'rostning' || card?.vote === move.target
      case 'point':
        return table.step !== 'diskussion' || (table.pointers[id] ?? null) === move.target
      case 'guess':
      case 'giveUp':
        return table.step !== 'gissning'
      default:
        return true
    }
  }
  const cards = state.cards
  if (!cards) return true
  switch (move.type) {
    case 'pick': {
      if (cards.step !== 'choosing' || cards.done.includes(id)) return true
      if (move.done) return false
      const pick = hand?.pick
      if (!pick || pick.kind !== move.pick.kind) return false
      return pick.kind === 'blank' || (move.pick.kind === 'card' && pick.card === move.pick.card)
    }
    case 'done':
      return cards.step !== 'choosing' || cards.done.includes(id)
    case 'judge':
      return cards.step !== 'judging'
    default:
      return true
  }
}

// Ett varv i klockan: drag som kommit fram eller nått gränsen släpps, och de som väntat länge nog skickas igen.
export function resendMoves(list: readonly PendingMove[], view: MoveView, now: number): { keep: PendingMove[]; send: PendingMove[] } {
  const keep: PendingMove[] = []
  const send: PendingMove[] = []
  for (const pending of list) {
    if (moveArrived(pending, view)) continue
    if (pending.failed || now - pending.sentAt < RESEND_MS) {
      keep.push(pending)
    } else if (pending.tries < RESEND_MAX_TRIES) {
      const next = { ...pending, sentAt: now, tries: pending.tries + 1 }
      keep.push(next)
      send.push(next)
    } else {
      keep.push({ ...pending, failed: true })
    }
  }
  return { keep, send }
}

export function moveDelivery(list: readonly PendingMove[]): Delivery {
  if (list.some((pending) => pending.failed)) return 'failed'
  return list.some((pending) => pending.tries > 0) ? 'sending' : 'ok'
}

// Spelaren tryckte Tryck igen: drag som gett upp skickas direkt och får nya försök. Samma nummer, så att värden inte
// räknar ett drag två gånger om det ändå kom fram.
export function retryMoves(list: readonly PendingMove[], now: number): { keep: PendingMove[]; send: PendingMove[] } {
  const keep = list.map((pending) => (pending.failed ? { ...pending, failed: false, tries: 1, sentAt: now } : pending))
  return { keep, send: keep.filter((pending, i) => pending !== list[i]) }
}

// Min gissning: skickas den igen, eller har försöken tagit slut?
export function guessDelivery(input: { missing: boolean; tries: number }): Delivery {
  if (!input.missing || input.tries === 0) return 'ok'
  return input.tries > RESEND_MAX_TRIES ? 'failed' : 'sending'
}

// Ett kort eller ett domarval som aldrig nådde värden. Rundans tid tog slut medan det skickades.
export type LostMove = { kind: 'card' | 'judge'; round: number; prompt: string }

// Tiden tog slut innan läget visade att draget kommit fram. Kortet räknas som framme om jag syns bland dem som valt, även
// om handen med valet aldrig kom. Domarens val gick förlorat om domaren räknas som somnad. Andra drag har antingen ingen
// tidsgräns eller går att göra om. Bara samma frågekort räknas: i ett nytt läge går det inte att säga vad som hände med
// draget, och det får inte visas i fel runda.
export function lostMove(pending: PendingMove, view: MoveView): LostMove | null {
  const { state, id } = view
  const cards = state.cards
  if (state.phase !== 'playing' || !cards) return null
  if (moveScope(state) !== pending.sent.scope) return null
  if (pending.move.type === 'pick') {
    if (cards.step === 'choosing' || cards.chosen.includes(id)) return null
    return { kind: 'card', round: state.round, prompt: cards.prompt }
  }
  if (pending.move.type === 'judge') {
    if (cards.step === 'judging' || !cards.judgeAsleep) return null
    return { kind: 'judge', round: state.round, prompt: cards.prompt }
  }
  return null
}

// Raden i facit. guessRound = rundan då jag skickade en gissning, lost = senaste kortet eller domarvalet som gick förlorat.
export function lostMoveText(state: GameState, id: string, guessRound: number | null, lost: LostMove | null): string | null {
  if (state.phase === 'reveal') {
    const missing = guessRound === state.round && state.lastResult && state.lastResult.guesses[id] === undefined
    return missing ? 'Din gissning kom inte fram' : null
  }
  const cards = state.cards
  if (state.phase !== 'playing' || cards?.step !== 'reveal' || lost?.round !== state.round || lost.prompt !== cards.prompt) return null
  return lost.kind === 'card' ? 'Ditt kort kom inte fram' : 'Ditt val kom inte fram'
}

// Värden: har det här draget redan räknats? Bara drag som ändrat något sparas, så att ett drag som kom vid fel tillfälle
// (t.ex. under en anklagelse) kan räknas när det kommer igen.
export function isSeenMove(seen: Readonly<Record<string, string[]>>, playerId: string, nr: string | null): boolean {
  return nr !== null && (seen[playerId] ?? []).includes(nr)
}

export function rememberMove(seen: Record<string, string[]>, playerId: string, nr: string | null) {
  if (nr !== null) seen[playerId] = [...(seen[playerId] ?? []), nr].slice(-SEEN_MOVES_KEPT)
}
