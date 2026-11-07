// Botar i Exploderande Tanter. Värdens webbläsare spelar för dem, men botens beslut (decideBotMove) får bara se det en
// riktig spelare på botens plats får se: bordet som alla ser (state.tantpanik, med händelseloggen) och botens eget besked
// (myTantView: handen, det den tittat på med Se framtiden och korten den ska ordna). Högen, andras händer och var andra
// gömt tanten finns aldrig i det boten får (BotSight), och testerna i tantbot.test.ts kollar det. Boten minns bara det
// den själv sett eller gjort (BotMemory). Rena funktioner, med slumpen som parameter.
//
// Svårighet:
// - Lätt: mest slump. Drar oftast, spelar ibland ett slumpat kort och säger sällan Nope!.
// - Normal: riskregeln och enkel kunskap. Risken är tanter kvar i högen delat med kort i högen (offentligt). Låg risk:
//   drar och sparar skyddskorten. Hög risk: spelar skyddskort oftare och tittar med Se framtiden före ett drag. Vet den
//   att tanten ligger överst (Se framtiden, eller för att den själv gömde den där) drar den aldrig om den har ett
//   skyddskort. Nope! mot attacker och stölder mot sig, gömmer tanten överst när nästa ska dra, och stjäl från den som
//   har flest kort utan att slösa Nope! eller Desarmera.
// - Svår: som Normal, men tar risken på större allvar, och försöker skicka tanten vidare: lägger den överst med Ändra
//   framtiden innan den spelar Hoppa över eller Attack. Ber om Desarmera med tretal.

import {
  bombsInDeck,
  isCombo,
  myTantView,
  playableAlone,
  validTargets,
  type MyTantView,
  type TantCard,
  type TantEvent,
  type TantHost,
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

// Det boten minns av det den själv sett eller gjort: var den vet att en tant ligger (antal kort ovanför), och vilken
// händelse i loggen den läst fram till. bombAt glöms bort när någon blandar eller ändrar högen.
export type BotMemory = { n: number; bombAt: number | null }

export function newBotMemory(table: TantTable | null): BotMemory {
  return { n: table?.log.at(-1)?.n ?? 0, bombAt: null }
}

// Vad en händelse i loggen gör med platsen boten minns, sett uppifrån. Läser spelmotorns strukturerade händelse
// (deck i TantEvent), aldrig texten.
function deckEffect(event: TantEvent): 'top' | 'none' | 'forget' {
  switch (event.deck) {
    case 'top':
      return 'top'
    case 'shuffle':
    case 'arrange':
    case 'place':
      return 'forget'
    default:
      return 'none'
  }
}

// Läser det som hänt vid bordet sedan sist: varje kort som dras uppifrån flyttar tanten ett steg närmare toppen, ett kort
// underifrån ändrar inget, och blandas högen, ordnas den om eller göms en annan tant glöms platsen bort.
export function observe(memory: BotMemory, table: TantTable): BotMemory {
  let { bombAt } = memory
  let n = memory.n
  for (const event of table.log) {
    if (event.n <= memory.n) continue
    n = event.n
    if (bombAt === null) continue
    const effect = deckEffect(event)
    if (effect === 'forget') bombAt = null
    else if (effect === 'top') bombAt = bombAt === 0 ? null : bombAt - 1
  }
  return n === memory.n && bombAt === memory.bombAt ? memory : { n, bombAt }
}

// Efter botens eget drag: det den själv gjort med högen. table = bordet efter draget, så att botens egna händelser i
// loggen inte läses en gång till.
export function remember(memory: BotMemory, move: TantMove, sight: BotSight, after: TantTable): BotMemory {
  let bombAt = memory.bombAt
  if (move.type === 'tPlace') bombAt = move.position
  else if (move.type === 'tArrange' && sight.view.arrange) {
    const at = move.order.findIndex((index) => sight.view.arrange![index] === 'tant')
    bombAt = at >= 0 ? at : bombAt
  } else if (move.type === 'tDraw') bombAt = bombAt === null || bombAt === 0 ? null : bombAt - 1
  return { n: after.log.at(-1)?.n ?? memory.n, bombAt }
}

// Skyddskort: tar boten undan att dra, eller ändrar högen.
const ESCAPES: CardType[] = ['intemin', 'dubbelpass', 'dudar', 'underifran', 'blanda']
const PROTECTIVE: CardType[] = [...ESCAPES, 'tjuvkika', 'mobblera']

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
const PRECIOUS: CardType[] = ['fika', 'nadu', ...PROTECTIVE]

// Ett par eller tretal i handen: samma typ (eller en tant med en Vild tant). careful = aldrig Desarmera, Nope! eller
// skyddskort.
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

// Risken att nästa kort överst är en tant: tanter kvar i högen delat med kort i högen (offentligt).
export function drawRisk(table: TantTable): number {
  return table.deckCount > 0 ? bombsInDeck(table) / table.deckCount : 1
}

// Gränserna för låg och hög risk per svårighet.
const LOW_RISK = 0.15
const HIGH_RISK: Record<Exclude<BotLevel, 'latt'>, number> = { normal: 0.25, svar: 0.18 }

// Botens drag just nu, eller null om den inte ska göra något (inte dess tur, eller den väljer att vänta).
export function decideBotMove(sight: BotSight, level: BotLevel, random: Random, memory: BotMemory = newBotMemory(null)): TantMove | null {
  const { me, table, view } = sight
  if (table.winner || table.error || table.out.includes(me) || !table.order.includes(me)) return null
  const hand = view.hand
  const has = (type: CardType) => hand.find((card) => card.type === type)

  // Nope!: ett spelat kort väntar.
  if (table.step === 'window' && table.pending) {
    const pending = table.pending
    const nope = has('nadu')
    if (!nope || (pending.lastNopeBy ?? pending.by) === me) return null
    const nope0: TantMove = { type: 'tNope', card: nope.id, level: pending.nopes }
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

  // Ändra framtiden. Boten ska själv dra sedan, så tanterna läggs längst ned bland korten. Svår med Hoppa över eller
  // Attack på handen lägger i stället tanten överst och tar sig undan, så att nästa spelare får den.
  if (table.step === 'arrange' && view.arrange) {
    const cards = view.arrange
    const order = cards.map((_, i) => i)
    if (level === 'latt') return { type: 'tArrange', order }
    const passOn = level === 'svar' && (has('intemin') || has('dubbelpass') || has('dudar'))
    order.sort((a, b) => (passOn ? -1 : 1) * (Number(cards[a] === 'tant') - Number(cards[b] === 'tant')))
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

  // Vad boten vet om toppen: det den ser med Se framtiden, eller var den själv gömde eller lade tanten.
  const seen = view.peek
  const bombOnTop = seen?.[0] === 'tant' || memory.bombAt === 0
  const safeOnTop = seen !== null && seen !== undefined && seen.length > 0 && seen[0] !== 'tant' && memory.bombAt !== 0
  const risk = drawRisk(table)
  const escapes = ESCAPES.map((type) => has(type)).filter((card) => card !== undefined)
  const play = (card: TantCard | undefined) => (card ? playSingle(table, me, card, random, true) : null)

  // Tanten ligger överst: dra aldrig om det finns ett skyddskort. Svår lägger hellre tanten kvar och skickar den vidare.
  if (bombOnTop) {
    const order: CardType[] = level === 'svar' ? ['dubbelpass', 'dudar', 'intemin', 'underifran', 'blanda'] : ['intemin', 'dubbelpass', 'dudar', 'underifran', 'blanda']
    for (const type of order) {
      const move = play(has(type))
      if (move) return move
    }
    // Ändra framtiden kan lägga tanten längre ned (eller överst för nästa, för Svår).
    const arrange = play(has('mobblera'))
    if (arrange) return arrange
  }

  // Svår: ligger tanten bland de tre översta och boten kan ta sig undan, lägg den överst och skicka den vidare.
  if (level === 'svar' && !bombOnTop && seen?.includes('tant') && has('mobblera') && (has('intemin') || has('dubbelpass') || has('dudar'))) {
    const move = play(has('mobblera'))
    if (move) return move
  }

  // Hög risk och inget sett: titta först, eller spela ett skyddskort i stället för att dra.
  if (!safeOnTop && risk >= HIGH_RISK[level]) {
    if (!seen) {
      const look = play(has('tjuvkika'))
      if (look) return look
    }
    const chance = level === 'svar' ? 0.85 : Math.min(0.8, risk * 2)
    if (escapes.length > 0 && random() < chance) {
      const move = play(escapes[0])
      if (move) return move
    }
  }

  // Svår, mellanrisk: titta med Se framtiden om den har fler än ett.
  if (level === 'svar' && !seen && risk >= LOW_RISK && hand.filter((card) => card.type === 'tjuvkika').length > 1) {
    const look = play(has('tjuvkika'))
    if (look) return look
  }

  // Stjäl från den som har flest kort (bara med vanliga kort), och dra sedan.
  if (random() < (level === 'svar' ? 0.6 : 0.4)) {
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
