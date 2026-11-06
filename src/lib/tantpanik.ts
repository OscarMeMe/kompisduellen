// Exploderande Tanter: alla turas om att dra kort ur en gemensam hög. Drar du en exploderande tant är du ute, om du inte har en
// Desarmera-kort. Då gömmer du tanten i högen igen. Övriga kort hjälper dig att slippa dra, se vad som ligger överst, ta kort
// från andra eller skicka vidare turer. Sist kvar vinner. Reglerna och våra egna beslut står i docs/spec-tantpanik.md
// (del 2 gäller före del 1) och sammanfattas i CLAUDE.md.
//
// Som i Kortkaos och Imposterjakten äger värden matchen. Leken, allas händer, kort som tittats på och var en tant gömts
// ligger i TantSecrets, som bara värden har och som aldrig skickas med det vanliga tillståndet. Det alla får se ligger i
// TantTable (state.tantpanik), och varje spelare får sin hand och det bara den får veta i ett eget meddelande
// (myTantView). Rena funktioner utan React eller Supabase, med slump och klocka som parametrar.
//
// Faser (TantTable.step) och vad som får göras i dem:
// - turn: den som har tur spelar kort (tPlay) eller drar (tDraw). Ingen annan gör något.
// - window: ett spelat kort väntar i NOPE_SECONDS. Alla som är kvar och har Nope! kan stoppa (tNope), även den som
//   spelade kortet. Varje Nope! börjar om tiden. När tiden gått händer kortet om antalet Nope! är jämnt.
// - give: Tjänst. Den utpekade väljer ett kort att ge (tGive).
// - arrange: Ändra framtiden. Den som spelade lägger de översta korten i ny ordning (tArrange).
// - place: den som drog en tant och hade ett Desarmera-kort gömmer tanten i högen (tPlace). Turen tar slut.

import type { GameState } from '@/lib/match'
import {
  BOMBS_TOTAL,
  CARDS,
  CARD_TYPES,
  DECK,
  NOPE_SECONDS,
  START_CARDS,
  TRAP_COUNT,
  cardName,
  groupsFor,
  type CardType,
} from '@/lib/tantpanik-kort'

export const TANT_GAME = 'tantpanik'

type Random = () => number

export type TantCard = { id: string; type: CardType }

export type TantSettings = { trap: boolean }
export const DEFAULT_TANT_SETTINGS: TantSettings = { trap: true }

// Ett spelat kort (eller par, tretal) som väntar på att Nope!-tiden går ut.
export type TantPending = {
  by: string
  kind: 'single' | 'pair' | 'triple'
  // Korten som spelades. Ligger redan i slänghögen, även om de stoppas.
  cards: CardType[]
  target: string | null
  // Tretal: kortet man ber om.
  request: CardType | null
  // Hur många Nope! som spelats. Udda = stoppat just nu.
  nopes: number
  lastNopeBy: string | null
}

export type TantStep = 'turn' | 'window' | 'give' | 'arrange' | 'place'

export type TantEvent = { n: number; text: string }

// Det alla ser.
export type TantTable = {
  // Spelarna i turordning, även de som är ute.
  order: string[]
  // De som är ute, i den ordning de åkte ut.
  out: string[]
  current: string
  // Turer kvar för den som har tur, inklusive den pågående.
  turnsLeft: number
  // Turerna kommer från en attack. En ny attack skickar då vidare alla turer kvar plus två.
  attacked: boolean
  step: TantStep
  pending: TantPending | null
  // Tjänst: vem som ska ge till vem.
  favor: { from: string; to: string } | null
  deckCount: number
  // De översta korten i slänghögen (överst sist) och hur många som ligger där.
  discardTop: CardType[]
  discardCount: number
  handCounts: Record<string, number>
  log: TantEvent[]
  trap: boolean
  winner: string | null
  // Något har gått fel som inte ska kunna hända (t.ex. tom draghög). Matchen står still tills värden avbryter.
  error: string | null
}

// Bara värden har det här.
export type TantSecrets = {
  kind: 'tantpanik'
  // Index 0 är överst.
  deck: TantCard[]
  hands: Record<string, TantCard[]>
  discard: TantCard[]
  // Korten från spelare som åkt ut, med baksidan upp.
  removed: TantCard[]
  // Tanten som ska gömmas (steget place).
  bomb: TantCard | null
  // Korten som tagits upp för Ändra framtiden (steget arrange).
  arranging: TantCard[]
  // Det någon tittat på med Se framtiden eller Ändra framtiden, och ett kort besked till var och en.
  peek: Record<string, CardType[]>
  notices: Record<string, TantEvent>
  // Dragens nummer som värden har hanterat, per spelare, så att samma drag aldrig räknas två gånger.
  handled: Record<string, string[]>
  eventCount: number
}

export type TantHost = { state: GameState; secrets: TantSecrets }

// Det bara jag får se.
export type MyTantView = {
  hand: TantCard[]
  peek: CardType[] | null
  // Ändra framtiden: korten jag ska ordna (överst först).
  arrange: CardType[] | null
  notice: TantEvent | null
  handled: string[]
}

export type TantMove =
  | { type: 'tDraw' }
  | {
      type: 'tPlay'
      cards: string[]
      target?: string | null
      request?: CardType | null
    }
  | { type: 'tNope'; card: string; level: number }
  | { type: 'tGive'; card: string }
  | { type: 'tPlace'; position: number }
  | { type: 'tArrange'; order: number[] }

const MOVE_TYPES = ['tDraw', 'tPlay', 'tNope', 'tGive', 'tPlace', 'tArrange']

export function isTantMove(move: { type: string }): move is TantMove {
  return MOVE_TYPES.includes(move.type)
}

export function isTantSecrets(secrets: unknown): secrets is TantSecrets {
  return typeof secrets === 'object' && secrets !== null && (secrets as { kind?: unknown }).kind === 'tantpanik'
}

export function isCardType(value: unknown): value is CardType {
  return typeof value === 'string' && (CARD_TYPES as string[]).includes(value)
}

// Hur många som får vara med. Det finns nio tanter, så tio spelare är högst.
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = BOMBS_TOTAL + 1

const LOG_KEPT = 12
const HANDLED_KEPT = 30

export function shuffleCards<T>(items: readonly T[], random: Random): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// Id:n är slumpade och säger ingenting om vilket kort det är.
function makeIds(count: number, random: Random): string[] {
  const ids = new Set<string>()
  while (ids.size < count) {
    let id = ''
    for (let i = 0; i < 10; i++) id += Math.floor(random() * 36).toString(36)
    ids.add(id)
  }
  return [...ids]
}

// Leken före utdelningen, utan tanterna: korten från kortgrupperna för antalet spelare, plus fällorna om de är på.
export function deckTypes(players: number, trap: boolean): CardType[] {
  const types: CardType[] = []
  for (const group of groupsFor(players)) {
    for (const [type, count] of Object.entries(DECK[group]) as [CardType, number][]) {
      for (let i = 0; i < count; i++) types.push(type)
    }
  }
  if (trap) for (let i = 0; i < TRAP_COUNT; i++) types.push('snara')
  return types
}

// Delar ut och lägger tanterna i högen. Var och en får ett Desarmera-kort och sju kort till. Ingen tant på handen från början.
export function dealTant(
  playerIds: readonly string[],
  trap: boolean,
  random: Random,
): { deck: TantCard[]; hands: Record<string, TantCard[]> } {
  const types = deckTypes(playerIds.length, trap)
  const total = types.length + playerIds.length - 1
  const ids = makeIds(total, random)
  let next = 0
  const make = (type: CardType): TantCard => ({ id: ids[next++], type })
  const all = types.map(make)
  const hands: Record<string, TantCard[]> = {}
  // Ett Desarmera-kort till var och en. Övriga blandas in i leken.
  for (const id of playerIds) {
    const index = all.findIndex((card) => card.type === 'fika')
    hands[id] = index >= 0 ? all.splice(index, 1) : []
  }
  let deck = shuffleCards(all, random)
  for (const id of playerIds) hands[id].push(...deck.splice(0, START_CARDS))
  const bombs = Array.from({ length: playerIds.length - 1 }, () => make('tant'))
  deck = shuffleCards([...deck, ...bombs], random)
  return { deck, hands }
}

export function startTantMatch(ready: GameState, random: Random): TantHost {
  const ids = shuffleCards(Object.keys(ready.players), random)
  const trap = ready.tantSettings.trap
  const { deck, hands } = dealTant(ids, trap, random)
  const secrets: TantSecrets = {
    kind: 'tantpanik',
    deck,
    hands,
    discard: [],
    removed: [],
    bomb: null,
    arranging: [],
    peek: {},
    notices: {},
    handled: {},
    eventCount: 1,
  }
  const table: TantTable = {
    order: ids,
    out: [],
    current: ids[0],
    turnsLeft: 1,
    attacked: false,
    step: 'turn',
    pending: null,
    favor: null,
    deckCount: 0,
    discardTop: [],
    discardCount: 0,
    handCounts: {},
    log: [{ n: 1, text: `Matchen börjar. ${nameOf(ready, ids[0])} börjar.` }],
    trap,
    winner: null,
    error: null,
  }
  return sync({
    state: {
      ...ready,
      phase: 'playing',
      rounds: 1,
      round: 1,
      deadline: null,
      pause: null,
      tantpanik: table,
    },
    secrets,
  })
}

// Ett kortnamn som avslutar en mening: "Du drog Blanda." men "Du drog Nope!", utan en extra punkt.
function endName(type: CardType): string {
  const name = cardName(type)
  return /[.!?]$/.test(name) ? name : `${name}.`
}

function nameOf(state: GameState, id: string): string {
  return state.players[id]?.name ?? 'Någon'
}

function aliveIds(table: TantTable): string[] {
  return table.order.filter((id) => !table.out.includes(id))
}

// Nästa spelare som är kvar, efter id i turordningen.
function nextAlive(table: TantTable, id: string): string {
  const start = table.order.indexOf(id)
  for (let step = 1; step <= table.order.length; step++) {
    const other = table.order[(start + step) % table.order.length]
    if (!table.out.includes(other)) return other
  }
  return id
}

// Räknar om det alla ser från den hemliga datan. Exporterad för testerna.
export function sync(host: TantHost): TantHost {
  const table = host.state.tantpanik
  if (!table) return host
  const { secrets } = host
  const handCounts: Record<string, number> = {}
  for (const id of table.order) handCounts[id] = secrets.hands[id]?.length ?? 0
  const next: TantTable = {
    ...table,
    deckCount: secrets.deck.length,
    discardTop: secrets.discard.slice(-3).map((card) => card.type),
    discardCount: secrets.discard.length,
    handCounts,
  }
  return { ...host, state: { ...host.state, tantpanik: next } }
}

// Ett steg i matchen arbetar på kopior, så att det gamla tillståndet aldrig ändras.
type Draft = {
  state: GameState
  table: TantTable
  secrets: TantSecrets
  random: Random
}

function draft(host: TantHost, random: Random): Draft {
  const { secrets } = host
  return {
    random,
    state: host.state,
    table: {
      ...host.state.tantpanik!,
      log: [...host.state.tantpanik!.log],
      out: [...host.state.tantpanik!.out],
    },
    secrets: {
      ...secrets,
      deck: [...secrets.deck],
      hands: Object.fromEntries(Object.entries(secrets.hands).map(([id, cards]) => [id, [...cards]])),
      discard: [...secrets.discard],
      removed: [...secrets.removed],
      arranging: [...secrets.arranging],
      peek: { ...secrets.peek },
      notices: { ...secrets.notices },
      handled: { ...secrets.handled },
    },
  }
}

function finish(d: Draft): TantHost {
  let state: GameState = { ...d.state, tantpanik: d.table }
  if (d.table.winner) {
    // Poängen är placeringen: den som åkte ut först får 1, vinnaren lika många som antalet spelare.
    const scores: Record<string, number> = {}
    d.table.out.forEach((id, index) => (scores[id] = index + 1))
    scores[d.table.winner] = d.table.order.length
    state = { ...state, phase: 'finished', deadline: null, scores }
  }
  return sync({ state, secrets: d.secrets })
}

function log(d: Draft, text: string) {
  d.secrets.eventCount += 1
  d.table.log = [...d.table.log, { n: d.secrets.eventCount, text }].slice(-LOG_KEPT)
}

function notify(d: Draft, id: string, text: string) {
  d.secrets.eventCount += 1
  d.secrets.notices[id] = { n: d.secrets.eventCount, text }
}

function name(d: Draft, id: string): string {
  return nameOf(d.state, id)
}

// Turen är slut. Finns fler turer kvar fortsätter samma spelare, annars går turen vidare med en vanlig tur.
function endTurn(d: Draft) {
  delete d.secrets.peek[d.table.current]
  if (d.table.turnsLeft > 1) {
    d.table.turnsLeft -= 1
    return
  }
  d.table.current = nextAlive(d.table, d.table.current)
  d.table.turnsLeft = 1
  d.table.attacked = false
}

// Attack och Riktad attack: turen slutar utan drag och target får två turer, eller alla turer kvar plus två om den som
// spelade själv var attackerad.
function attack(d: Draft, target: string) {
  const turns = d.table.attacked ? d.table.turnsLeft + 2 : 2
  delete d.secrets.peek[d.table.current]
  d.table.current = target
  d.table.turnsLeft = turns
  d.table.attacked = true
}

function eliminate(d: Draft, id: string) {
  d.secrets.removed.push(...(d.secrets.hands[id] ?? []))
  d.secrets.hands[id] = []
  delete d.secrets.peek[id]
  d.table.out.push(id)
  const alive = aliveIds(d.table)
  if (alive.length === 1) {
    d.table.winner = alive[0]
    log(d, `${name(d, alive[0])} är sist kvar och vinner!`)
    return
  }
  // Turer kvar försvinner med spelaren, och nästa som är kvar får en vanlig tur.
  if (d.table.current === id) {
    d.table.current = nextAlive(d.table, id)
    d.table.turnsLeft = 1
    d.table.attacked = false
  }
}

// Drar ett kort, överst eller underst. En tant visas direkt.
function draw(d: Draft, from: 'top' | 'bottom') {
  const id = d.table.current
  if (d.secrets.deck.length === 0) {
    d.table.error = 'Draghögen är tom, och det ska inte kunna hända. Värden kan avbryta matchen.'
    log(d, 'Draghögen är tom.')
    return
  }
  const card = from === 'top' ? d.secrets.deck.shift()! : d.secrets.deck.pop()!
  // Det man tittat på stämmer inte längre.
  d.secrets.peek = {}
  if (card.type !== 'tant') {
    d.secrets.hands[id].push(card)
    notify(d, id, `Du drog ${endName(card.type)}`)
    log(d, from === 'top' ? `${name(d, id)} drog ett kort.` : `${name(d, id)} drog det understa kortet.`)
    endTurn(d)
    return
  }
  const hand = d.secrets.hands[id]
  const fika = hand.findIndex((other) => other.type === 'fika')
  if (fika >= 0) {
    d.secrets.discard.push(...hand.splice(fika, 1))
    d.secrets.bomb = card
    d.table.step = 'place'
    log(d, `${name(d, id)} drog en exploderande tant, men desarmerade den! Nu gömmer ${name(d, id)} tanten i högen.`)
    return
  }
  d.secrets.discard.push(card)
  log(d, `${name(d, id)} drog en exploderande tant och är ute!`)
  eliminate(d, id)
}

// Flyttar ett kort från en hand till en annan. Tantsnaran slår igen bara vid stöld (par och tretal), aldrig vid en
// tjänst eller i motstölden, så det blir aldrig en kedja.
function transfer(
  d: Draft,
  fromId: string,
  toId: string,
  cardId: string,
  reason: 'pair_theft' | 'triple_request' | 'favor' | 'trap_retaliation',
) {
  const from = d.secrets.hands[fromId]
  const index = from.findIndex((card) => card.id === cardId)
  if (index < 0) return
  const [card] = from.splice(index, 1)
  const theft = reason === 'pair_theft' || reason === 'triple_request'
  if (card.type === 'snara' && theft) {
    d.secrets.discard.push(card)
    const thief = d.secrets.hands[toId]
    const back = shuffleCards(thief, d.random).slice(0, 2)
    for (const taken of back) transfer(d, toId, fromId, taken.id, 'trap_retaliation')
    log(d, `Tantsnara! ${name(d, toId)} gick i fällan, och ${name(d, fromId)} tog ${back.length} kort tillbaka.`)
    notify(d, toId, `Det var en Tantsnara! ${name(d, fromId)} tog ${back.length} kort från dig.`)
    notify(
      d,
      fromId,
      back.length > 0
        ? `Fällan slog igen! Du fick ${back.map((c) => cardName(c.type)).join(' och ')}.`
        : 'Fällan slog igen, men tjuven hade inga kort.',
    )
    return
  }
  d.secrets.hands[toId].push(card)
  if (reason === 'trap_retaliation') return
  notify(
    d,
    toId,
    reason === 'favor' ? `${name(d, fromId)} gav dig ${endName(card.type)}` : `Du tog ${cardName(card.type)} från ${name(d, fromId)}.`,
  )
  notify(
    d,
    fromId,
    reason === 'favor' ? `Du gav ${cardName(card.type)} till ${name(d, toId)}.` : `${name(d, toId)} tog din ${endName(card.type)}`,
  )
}

// Kan korten spelas tillsammans som par eller tretal? Samma titel räcker, även för vanliga kort. En vild tant kan ersätta
// en tantsort, men kräver minst en riktig tant och matchar aldrig andra kort.
export function isCombo(types: readonly CardType[]): boolean {
  if (types.length < 2 || types.length > 3 || types.includes('tant')) return false
  if (types.includes('vild')) {
    const real = types.filter((type) => type !== 'vild')
    return real.length > 0 && real.every((type) => type === real[0]) && CARDS[real[0]].kind === 'collect'
  }
  return types.every((type) => type === types[0])
}

// Vilka kort man kan be om med ett tretal: allt utom tanten själv.
export const REQUESTABLE: readonly CardType[] = CARD_TYPES.filter((type) => type !== 'tant')

// Ett kort som spelas ensamt: behövs ett mål?
export function needsTarget(type: CardType): boolean {
  return type === 'dudar' || type === 'tjanst'
}

// Kort som går att spela ensamma på sin tur.
export function playableAlone(type: CardType): boolean {
  return CARDS[type].kind === 'action'
}

// Andra spelare man kan välja som mål. Stöld och tjänst kräver att målet har kort.
export function validTargets(table: TantTable, me: string, needsCards: boolean): string[] {
  return aliveIds(table).filter((id) => id !== me && (!needsCards || (table.handCounts[id] ?? 0) > 0))
}

function startWindow(d: Draft, pending: TantPending, now: number) {
  d.table.step = 'window'
  d.table.pending = pending
  d.state = { ...d.state, deadline: now + NOPE_SECONDS * 1000 }
}

type Result = Draft | 'invalid'

function play(d: Draft, playerId: string, move: Extract<TantMove, { type: 'tPlay' }>, now: number): Result {
  if (d.table.step !== 'turn' || d.table.current !== playerId) return 'invalid'
  const hand = d.secrets.hands[playerId]
  if (new Set(move.cards).size !== move.cards.length) return 'invalid'
  const cards = move.cards.map((id) => hand.find((card) => card.id === id))
  if (cards.length === 0 || cards.some((card) => !card)) return 'invalid'
  const types = cards.map((card) => card!.type)
  const target = move.target ?? null
  let pending: TantPending
  if (types.length === 1) {
    const type = types[0]
    if (!playableAlone(type)) return 'invalid'
    if (needsTarget(type)) {
      if (!target || !validTargets(d.table, playerId, type === 'tjanst').includes(target)) return 'invalid'
    }
    pending = {
      by: playerId,
      kind: 'single',
      cards: types,
      target: needsTarget(type) ? target : null,
      request: null,
      nopes: 0,
      lastNopeBy: null,
    }
  } else {
    if (!isCombo(types)) return 'invalid'
    if (!target || !validTargets(d.table, playerId, true).includes(target)) return 'invalid'
    const triple = types.length === 3
    const request = move.request ?? null
    if (triple && (!request || !REQUESTABLE.includes(request))) return 'invalid'
    pending = {
      by: playerId,
      kind: triple ? 'triple' : 'pair',
      cards: types,
      target,
      request: triple ? request : null,
      nopes: 0,
      lastNopeBy: null,
    }
  }
  d.secrets.hands[playerId] = hand.filter((card) => !move.cards.includes(card.id))
  d.secrets.discard.push(...(cards as TantCard[]))
  delete d.secrets.peek[playerId]
  log(d, playText(d, pending))
  startWindow(d, pending, now)
  return d
}

function playText(d: Draft, pending: TantPending): string {
  const who = name(d, pending.by)
  const target = pending.target ? name(d, pending.target) : ''
  if (pending.kind === 'pair') return `${who} spelade ett par och vill ta ett kort från ${target}.`
  if (pending.kind === 'triple') return `${who} spelade ett tretal och ber ${target} om ${endName(pending.request!)}`
  const type = pending.cards[0]
  if (type === 'dudar') return `${who} spelade Riktad attack på ${target}.`
  if (type === 'tjanst') return `${who} ber ${target} om en tjänst.`
  return `${who} spelade ${endName(type)}`
}

function nope(d: Draft, playerId: string, move: Extract<TantMove, { type: 'tNope' }>, now: number): Result {
  const pending = d.table.pending
  if (d.table.step !== 'window' || !pending || d.table.out.includes(playerId) || !d.table.order.includes(playerId)) return 'invalid'
  // Draget gäller kedjan som den såg ut när spelaren tryckte. Har någon hunnit före gäller det inte.
  if (move.level !== pending.nopes) return 'invalid'
  const hand = d.secrets.hands[playerId]
  const index = hand.findIndex((card) => card.id === move.card && card.type === 'nadu')
  if (index < 0) return 'invalid'
  d.secrets.discard.push(...hand.splice(index, 1))
  const nopes = pending.nopes + 1
  d.table.pending = { ...pending, nopes, lastNopeBy: playerId }
  d.state = { ...d.state, deadline: now + NOPE_SECONDS * 1000 }
  log(
    d,
    nopes % 2 === 1
      ? `${name(d, playerId)}: Nope! Kortet stoppas.`
      : `${name(d, playerId)}: Nope! Stoppet stoppas, så kortet gäller igen.`,
  )
  return d
}

// Nope!-tiden är slut: kortet händer, om det inte är stoppat.
function resolve(d: Draft, random: Random) {
  const pending = d.table.pending!
  d.table.pending = null
  d.table.step = 'turn'
  d.state = { ...d.state, deadline: null }
  if (pending.nopes % 2 === 1) {
    log(d, 'Kortet stoppades och händer inte.')
    return
  }
  const by = pending.by
  const alive = (id: string | null) => id !== null && !d.table.out.includes(id)
  if (pending.kind === 'pair' || pending.kind === 'triple') {
    const target = pending.target!
    const hand = d.secrets.hands[target] ?? []
    if (!alive(target) || hand.length === 0) {
      log(d, `${name(d, target)} hade inga kort.`)
      return
    }
    if (pending.kind === 'pair') {
      const card = hand[Math.floor(random() * hand.length)]
      log(d, `${name(d, by)} tog ett slumpat kort från ${name(d, target)}.`)
      transfer(d, target, by, card.id, 'pair_theft')
      return
    }
    const matches = hand.filter((card) => card.type === pending.request)
    if (matches.length === 0) {
      log(d, `${name(d, target)} hade ingen ${endName(pending.request!)}`)
      return
    }
    log(d, `${name(d, target)} fick ge ${name(d, by)} ${endName(pending.request!)}`)
    transfer(d, target, by, matches[Math.floor(random() * matches.length)].id, 'triple_request')
    return
  }
  switch (pending.cards[0]) {
    case 'dubbelpass':
      attack(d, nextAlive(d.table, by))
      log(d, `${name(d, d.table.current)} har ${d.table.turnsLeft} turer.`)
      return
    case 'dudar':
      attack(d, alive(pending.target) ? pending.target! : nextAlive(d.table, by))
      log(d, `${name(d, d.table.current)} har ${d.table.turnsLeft} turer.`)
      return
    case 'intemin':
      endTurn(d)
      return
    case 'tjuvkika':
      d.secrets.peek[by] = d.secrets.deck.slice(0, 3).map((card) => card.type)
      return
    case 'mobblera': {
      const count = Math.min(3, d.secrets.deck.length)
      if (count === 0) return
      d.secrets.arranging = d.secrets.deck.splice(0, count)
      d.table.step = 'arrange'
      return
    }
    case 'blanda':
      d.secrets.deck = shuffleCards(d.secrets.deck, random)
      d.secrets.peek = {}
      log(d, 'Högen är blandad.')
      return
    case 'underifran':
      draw(d, 'bottom')
      return
    case 'tjanst': {
      const target = pending.target!
      if (!alive(target) || (d.secrets.hands[target]?.length ?? 0) === 0) {
        log(d, `${name(d, target)} hade inga kort att ge.`)
        return
      }
      d.table.step = 'give'
      d.table.favor = { from: target, to: by }
      return
    }
  }
}

function applyMove(d: Draft, playerId: string, move: TantMove, now: number): Result {
  const { table } = d
  if (table.winner || table.error) return 'invalid'
  switch (move.type) {
    case 'tDraw':
      if (table.step !== 'turn' || table.current !== playerId) return 'invalid'
      draw(d, 'top')
      return d
    case 'tPlay':
      return play(d, playerId, move, now)
    case 'tNope':
      return nope(d, playerId, move, now)
    case 'tGive': {
      if (table.step !== 'give' || table.favor?.from !== playerId) return 'invalid'
      if (!d.secrets.hands[playerId].some((card) => card.id === move.card)) return 'invalid'
      const { from, to } = table.favor
      log(d, `${name(d, from)} gav ${name(d, to)} ett kort.`)
      transfer(d, from, to, move.card, 'favor')
      table.favor = null
      table.step = 'turn'
      return d
    }
    case 'tPlace': {
      const bomb = d.secrets.bomb
      if (table.step !== 'place' || table.current !== playerId || !bomb) return 'invalid'
      if (!Number.isInteger(move.position) || move.position < 0 || move.position > d.secrets.deck.length) return 'invalid'
      d.secrets.deck.splice(move.position, 0, bomb)
      d.secrets.bomb = null
      table.step = 'turn'
      log(d, `${name(d, playerId)} har gömt tanten i högen.`)
      endTurn(d)
      return d
    }
    case 'tArrange': {
      const cards = d.secrets.arranging
      if (table.step !== 'arrange' || table.current !== playerId) return 'invalid'
      const order = move.order
      const isPermutation = order.length === cards.length && [...order].sort((a, b) => a - b).every((value, i) => value === i)
      if (!isPermutation) return 'invalid'
      const arranged = order.map((i) => cards[i])
      d.secrets.deck = [...arranged, ...d.secrets.deck]
      d.secrets.arranging = []
      d.secrets.peek[playerId] = arranged.map((card) => card.type)
      table.step = 'turn'
      log(d, `${name(d, playerId)} möblerade om högen.`)
      return d
    }
  }
}

// Ett drag från en spelare. nr = dragets nummer: ett drag som redan hanterats gör ingenting, och alla nya drag sparas
// som hanterade (även ogiltiga), så att spelaren ser att värden fått dem.
export function tantMove(host: TantHost, playerId: string, move: TantMove, nr: string | null, now: number, random: Random): TantHost {
  if (!host.state.tantpanik || host.state.phase !== 'playing') return host
  const seen = host.secrets.handled[playerId] ?? []
  if (nr !== null && seen.includes(nr)) return host
  const d = draft(host, random)
  const result = applyMove(d, playerId, move, now)
  const done = result === 'invalid' ? draft(host, random) : result
  if (result === 'invalid') notify(done, playerId, 'Det gick inte just nu.')
  if (nr !== null) done.secrets.handled[playerId] = [...seen, nr].slice(-HANDLED_KEPT)
  return finish(done)
}

// Värdens klocka: Nope!-tiden är slut. Gäller bara om klockan som löpte ut fortfarande är den som gäller.
export function tantDeadline(host: TantHost, now: number, deadline: number, random: Random): TantHost {
  const table = host.state.tantpanik
  if (!table || host.state.deadline !== deadline || now < deadline || table.step !== 'window' || !table.pending) return host
  const d = draft(host, random)
  resolve(d, random)
  return finish(d)
}

// Det bara spelaren får se.
export function myTantView(secrets: TantSecrets, table: TantTable, playerId: string): MyTantView {
  return {
    hand: secrets.hands[playerId] ?? [],
    peek: secrets.peek[playerId] ?? null,
    arrange: table.step === 'arrange' && table.current === playerId ? secrets.arranging.map((card) => card.type) : null,
    notice: secrets.notices[playerId] ?? null,
    handled: secrets.handled[playerId] ?? [],
  }
}

// Alla kort i matchen, var de än ligger. Ska alltid vara lika många.
export function countAllCards(secrets: TantSecrets): number {
  return (
    secrets.deck.length +
    Object.values(secrets.hands).reduce((sum, hand) => sum + hand.length, 0) +
    secrets.discard.length +
    secrets.removed.length +
    secrets.arranging.length +
    (secrets.bomb ? 1 : 0)
  )
}

// Väntrummets val. Gäller bara i väntrummet.
export function setTantSettings(state: GameState, settings: Partial<TantSettings>): GameState {
  if (state.phase !== 'waiting' || settings.trap === undefined || settings.trap === state.tantSettings.trap) return state
  return {
    ...state,
    tantSettings: { ...state.tantSettings, trap: settings.trap },
  }
}

// Vem som ska göra något just nu: den som har tur, den som ska ge ett kort, eller alla med Nope! under ett spelat kort.
export function waitingFor(table: TantTable): string | null {
  if (table.winner) return null
  if (table.step === 'give') return table.favor?.from ?? null
  if (table.step === 'window') return null
  return table.current
}

export const TANT_HOW_TO =
  'Turas om att spela kort och dra ur högen. Drar du en exploderande tant är du ute, om du inte har ett Desarmera-kort. Sist kvar vinner.'

export const TANT_SCORING = [
  'Vinnaren är den som är sist kvar.',
  'Placeringen avgör poängen: den som åker ut först får 1 poäng, vinnaren lika många som antalet spelare.',
]
