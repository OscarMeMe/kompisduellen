// Botar i Exploderande Tanter. Värdens webbläsare spelar för dem, men botens beslut (decideBotMove) får bara se det en
// riktig spelare på botens plats får se: bordet som alla ser (state.tantpanik) och botens eget besked (myTantView: handen,
// det den tittat på med Se framtiden och korten den ska ordna). Högen, andras händer och var tanten gömts finns aldrig
// i det boten får (BotSight), och testerna i tantbot.test.ts kollar det. Rena funktioner, med slumpen som parameter.
//
// Svårighet:
// - Lätt: mest slump. Drar oftast, spelar ibland ett slumpat kort och säger sällan Nope!.
// - Normal: enkla regler. Nope! mot attacker och stölder mot sig själv, Hoppa över eller Attack när Se framtiden visar en
//   tant överst, gömmer tanten överst när nästa ska dra, och stjäl från den som har flest kort.
// - Svår: som Normal, men räknar också risken att dra en tant (tanter i högen delat med kort i högen) och använder Se
//   framtiden, Hoppa över och Attack när risken är hög, och ber om ett Desarmera-kort med tretal.

import {
  bombsInDeck,
  isCombo,
  myTantView,
  playableAlone,
  validTargets,
  type MyTantView,
  type TantHost,
  type TantCard,
  type TantMove,
  type TantTable,
} from '@/lib/tantpanik'
import { CARDS, type CardType } from '@/lib/tantpanik-kort'

type Random = () => number

export type BotLevel = 'latt' | 'normal' | 'svar'
export const BOT_LEVELS: readonly BotLevel[] = ['latt', 'normal', 'svar']
export const BOT_LEVEL_NAMES: Record<BotLevel, string> = { latt: 'Lätt', normal: 'Normal', svar: 'Svår' }
// Botarnas namn, i den ordning de läggs till.
export const BOT_NAMES = ['Bot-Berit', 'Bot-Gunnel', 'Bot-Margit', 'Bot-Inga', 'Bot-Solveig', 'Bot-Ulla']
export const MAX_BOTS = 4

export function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === 'string' && (BOT_LEVELS as string[]).includes(value)
}

// Det enda boten får se: bordet som alla ser och sitt eget besked, precis som en riktig spelare.
export type BotSight = { me: string; table: TantTable; view: MyTantView }

// Kort boten helst behåller, och helst ger bort (lägst värde först).
const KEEP_ORDER: CardType[] = ['fika', 'nadu', 'intemin', 'dubbelpass', 'dudar', 'tjuvkika', 'mobblera', 'underifran', 'blanda', 'tjanst', 'snara', 'vild']

function value(type: CardType): number {
  const index = KEEP_ORDER.indexOf(type)
  return index < 0 ? 0 : KEEP_ORDER.length - index
}

function pick<T>(list: readonly T[], random: Random): T {
  return list[Math.floor(random() * list.length)]
}

function nextAlive(table: TantTable, id: string): string {
  const start = table.order.indexOf(id)
  for (let step = 1; step <= table.order.length; step++) {
    const other = table.order[(start + step) % table.order.length]
    if (!table.out.includes(other)) return other
  }
  return id
}

// Den med flest kort bland dem som går att välja.
function richest(table: TantTable, ids: string[]): string | null {
  return [...ids].sort((a, b) => (table.handCounts[b] ?? 0) - (table.handCounts[a] ?? 0))[0] ?? null
}

// Kort som en klok bot aldrig slösar på ett par eller tretal: de räddar livet eller stoppar attacker.
const PRECIOUS: CardType[] = ['fika', 'nadu']

// Ett par eller tretal i handen: samma typ (eller en tant med en Vild tant). careful = aldrig Desarmera eller Nope!.
function findCombo(hand: TantCard[], size: 2 | 3, careful: boolean): TantCard[] | null {
  for (const card of hand) {
    if (card.type === 'vild' || (careful && PRECIOUS.includes(card.type))) continue
    const same = hand.filter((other) => other.type === card.type)
    const wild = CARDS[card.type].kind === 'collect' ? hand.filter((other) => other.type === 'vild') : []
    const chosen = [...same, ...wild].slice(0, size)
    if (chosen.length === size && isCombo(chosen.map((c) => c.type))) return chosen
  }
  return null
}

function playSingle(table: TantTable, me: string, card: TantCard, random: Random, smart: boolean): TantMove | null {
  if (!playableAlone(card.type)) return null
  if (card.type === 'dudar') {
    const targets = validTargets(table, me, false)
    if (targets.length === 0) return null
    return { type: 'tPlay', cards: [card.id], target: smart ? nextAlive(table, me) : pick(targets, random) }
  }
  if (card.type === 'tjanst') {
    const targets = validTargets(table, me, true)
    if (targets.length === 0) return null
    return { type: 'tPlay', cards: [card.id], target: smart ? richest(table, targets) : pick(targets, random) }
  }
  return { type: 'tPlay', cards: [card.id] }
}

function stealMove(table: TantTable, me: string, hand: TantCard[], random: Random, level: BotLevel): TantMove | null {
  const targets = validTargets(table, me, true)
  if (targets.length === 0) return null
  const target = level === 'latt' ? pick(targets, random) : richest(table, targets)!
  const careful = level !== 'latt'
  const triple = level === 'svar' ? findCombo(hand, 3, careful) : null
  if (triple) return { type: 'tPlay', cards: triple.map((c) => c.id), target, request: 'fika' }
  const pair = findCombo(hand, 2, careful)
  return pair ? { type: 'tPlay', cards: pair.map((c) => c.id), target } : null
}

// Botens drag just nu, eller null om den inte ska göra något (inte dess tur, eller den väljer att vänta).
export function decideBotMove(sight: BotSight, level: BotLevel, random: Random): TantMove | null {
  const { me, table, view } = sight
  if (table.winner || table.error || table.out.includes(me) || !table.order.includes(me)) return null
  const hand = view.hand
  const has = (type: CardType) => hand.find((card) => card.type === type)

  // Nope!: ett spelat kort väntar.
  if (table.step === 'window' && table.pending) {
    const pending = table.pending
    const nope = has('nadu')
    if (!nope || (pending.lastNopeBy ?? pending.by) === me) return null
    const level0 = pending.nopes
    const nope0: TantMove = { type: 'tNope', card: nope.id, level: level0 }
    // Mitt eget kort har stoppats: stoppa stoppet.
    if (pending.by === me && pending.nopes % 2 === 1) return level === 'latt' ? (random() < 0.3 ? nope0 : null) : nope0
    if (pending.nopes % 2 === 1) return null
    if (level === 'latt') return random() < 0.12 ? nope0 : null
    const card = pending.cards[0]
    const againstMe =
      pending.target === me ||
      (pending.kind === 'single' && card === 'dubbelpass' && nextAlive(table, pending.by) === me)
    const harmful = pending.kind !== 'single' || card === 'dudar' || card === 'dubbelpass' || card === 'tjanst'
    if (againstMe && harmful) return nope0
    return level === 'svar' && pending.kind === 'single' && card === 'tjuvkika' && random() < 0.2 ? nope0 : null
  }

  // Tjänst: någon ber boten om ett kort. Ger bort det minst värdefulla.
  if (table.step === 'give' && table.favor?.from === me) {
    if (hand.length === 0) return null
    const card = level === 'latt' ? pick(hand, random) : [...hand].sort((a, b) => value(a.type) - value(b.type))[0]
    return { type: 'tGive', card: card.id }
  }

  // Par eller Tantsnara: välj ett kort bland baksidorna (som en riktig spelare vet boten inget om dem).
  if (table.step === 'pick' && table.pick?.by === me) return { type: 'tPick', index: Math.floor(random() * table.pick.count) }

  if (table.current !== me) return null

  // Göm tanten: överst när nästa ska dra (Normal och Svår), annars någonstans i högen.
  if (table.step === 'place') {
    if (level === 'latt') return { type: 'tPlace', position: Math.floor(random() * (table.deckCount + 1)) }
    return { type: 'tPlace', position: random() < 0.75 ? 0 : Math.min(table.deckCount, 1) }
  }

  // Ändra framtiden: lägg tanterna längst ned bland korten, eftersom boten själv ska dra sedan.
  if (table.step === 'arrange' && view.arrange) {
    const order = view.arrange.map((_, i) => i)
    if (level === 'latt') return { type: 'tArrange', order }
    order.sort((a, b) => Number(view.arrange![a] === 'tant') - Number(view.arrange![b] === 'tant'))
    return { type: 'tArrange', order }
  }

  if (table.step !== 'turn') return null

  // Lätt: drar oftast, spelar ibland något.
  if (level === 'latt') {
    const r = random()
    if (r < 0.15) {
      const steal = stealMove(table, me, hand, random, level)
      if (steal) return steal
    }
    if (r < 0.35) {
      const playable = hand.filter((card) => playableAlone(card.type))
      if (playable.length > 0) {
        const move = playSingle(table, me, pick(playable, random), random, false)
        if (move) return move
      }
    }
    return { type: 'tDraw' }
  }

  const topIsBomb = view.peek?.[0] === 'tant'
  const topIsSafe = view.peek !== null && view.peek !== undefined && view.peek.length > 0 && view.peek[0] !== 'tant'
  const risk = table.deckCount > 0 ? bombsInDeck(table) / table.deckCount : 1
  const escape = (['intemin', 'dubbelpass', 'dudar', 'underifran', 'blanda', 'mobblera'] as CardType[])
    .map((type) => has(type))
    .find((card) => card !== undefined)

  // Se framtiden visade en tant överst: kom undan.
  if (topIsBomb && escape) {
    const move = playSingle(table, me, escape, random, true)
    if (move) return move
  }

  // Svår: hög risk och inget sett. Titta först, eller kom undan.
  if (level === 'svar' && !topIsSafe && view.peek === null) {
    const look = has('tjuvkika')
    if (look && risk > 0.12) return { type: 'tPlay', cards: [look.id] }
    if (risk > 0.3 && escape && !has('fika')) {
      const move = playSingle(table, me, escape, random, true)
      if (move) return move
    }
  }

  // Stjäl från den som har flest kort.
  if (random() < (level === 'svar' ? 0.7 : 0.5)) {
    const steal = stealMove(table, me, hand, random, level)
    if (steal) return steal
  }
  return { type: 'tDraw' }
}

// Hur länge boten "tänker" innan draget (ms): 1–3 sekunder, men snabbare för Nope! så att den hinner.
export function botDelay(sight: BotSight, random: Random): number {
  if (sight.table.step === 'window') return 900 + random() * 1800
  return 1000 + random() * 2000
}

// Det boten får se, byggt precis som för en riktig spelare: bordet som alla får (state.tantpanik) och botens eget
// meddelande (myTantView). Inget annat från värdens hemliga data följer med.
export function botSight(host: TantHost, botId: string): BotSight | null {
  const table = host.state.tantpanik
  if (!table) return null
  return { me: botId, table, view: myTantView(host.secrets, table, botId) }
}
