// Kontroll av meddelanden i lobbyns kanal. Alla som kan lobbykoden kan skicka vad som helst i kanalen, så inget
// används innan det kontrollerats här. Ett trasigt meddelande slängs i stället för att krascha skärmen.
// Gästerna tar bara emot läget, händer och värdbyten från den som är värd enligt närvarolistan (from). Det går inte
// att bevisa vem som skickat något utan inloggning, men det stoppar trasiga meddelanden och enkla försök att
// låtsas vara värd. Rena funktioner, så att de är lätta att testa.

import type { ImposterCard, ImposterMove, ImposterTable, MyImposterCard } from '@/lib/imposterjakten'
import { findThrowItem, type ThrowItemId } from '@/lib/kast'
import type { CardMove, CardTable, MyHand, Pick } from '@/lib/kort'
import { upgradeAvatars, initialState, type GameState, type RoundResult } from '@/lib/match'
import { DECK_CHANGES, isCardType, isTantLevel, type MyTantView, type TantMove, type TantTable } from '@/lib/tantpanik'
import type { CardType } from '@/lib/tantpanik-kort'

type Unknown = Record<string, unknown>

const isObject = (value: unknown): value is Unknown => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const orNull =
  <T>(check: (value: unknown) => value is T) =>
  (value: unknown): value is T | null =>
    value === null || check(value)
const listOf =
  <T>(check: (value: unknown) => value is T) =>
  (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(check)
const recordOf =
  <T>(check: (value: unknown) => value is T) =>
  (value: unknown): value is Record<string, T> =>
    isObject(value) && Object.values(value).every(check)
// Ett objekt där varje fält har rätt typ.
const shape =
  (fields: Record<string, (value: unknown) => boolean>) =>
  (value: unknown): value is Unknown =>
    isObject(value) && Object.entries(fields).every(([key, check]) => check(value[key]))

const PHASES = ['waiting', 'guessing', 'reveal', 'playing', 'finished']
const CARD_STEPS = ['question', 'choosing', 'judging', 'reveal']

const isPlayerInfo = shape({ name: isString, avatar: isString })
const isLeaderboardEntry = shape({ name: isString, avatar: isString, wins: isNumber, played: isNumber })

const isRoundResult = (value: unknown): value is RoundResult =>
  shape({
    target: isNumber,
    guesses: recordOf(isNumber),
    winners: listOf(isString),
    points: recordOf(isNumber),
    itemId: orNull(isString),
  })(value) && (value.times === undefined || recordOf(isNumber)(value.times))

const isCardTable = (value: unknown): value is CardTable =>
  shape({
    step: (step) => isString(step) && CARD_STEPS.includes(step),
    order: listOf(isString),
    judge: isString,
    prompt: isString,
    retried: isBoolean,
    chosen: listOf(isString),
    done: listOf(isString),
    submissions: listOf(shape({ key: isString, text: isString })),
    winner: orNull(isString),
    owners: orNull(recordOf(isString)),
    judgeAsleep: isBoolean,
    skipped: isBoolean,
    wins: listOf(shape({ round: isNumber, prompt: isString, text: isString, player: isString, asleep: isBoolean })),
  })(value)

const isImposterTable = (value: unknown): value is ImposterTable =>
  shape({
    step: (step) => isString(step) && ['kort', 'ledtradar', 'diskussion', 'rostning', 'gissning', 'facit'].includes(step),
    order: listOf(isString),
    turn: isNumber,
    clues: listOf(
      shape({
        player: isString,
        kind: (kind) => isString(kind) && ['ord', 'pass', 'sagt'].includes(kind),
        word: orNull(isString),
      }),
    ),
    read: listOf(isString),
    category: orNull(isString),
    hard: isBoolean,
    aloud: isBoolean,
    readyCount: isNumber,
    votedCount: isNumber,
    countdownStarted: isBoolean,
    votes: orNull(recordOf(isString)),
    tied: orNull(listOf(isString)),
    tieVotes: orNull(recordOf(isString)),
    pointers: recordOf(isString),
    accusation: orNull(shape({ accuser: isString, accused: isString, answered: isNumber, voters: isNumber })),
    accusers: listOf(isString),
    failedAccusation: orNull(isString),
    caught: orNull(isString),
    outcome: orNull(
      shape({
        kind: (kind) => isString(kind) && ['undan', 'gissade-ratt', 'gissade-fel', 'gav-upp', 'avbruten'].includes(kind),
        word: isString,
        imposter: isString,
        hint: orNull(isString),
        guess: orNull(isString),
        points: recordOf(isNumber),
        reason: orNull(isString),
      }),
    ),
  })(value)

const isTantEvent = shape({
  n: isNumber,
  text: isString,
  // Saknas när högen inte ändrades, och hos en värd med en äldre version.
  deck: (deck: unknown) => deck === undefined || (isString(deck) && (DECK_CHANGES as readonly string[]).includes(deck)),
})

const isTantTable = (value: unknown): value is TantTable =>
  shape({
    stats: (stats: unknown) =>
      stats === undefined ||
      shape({ moves: isNumber, stolen: isNumber, hidden: isNumber, nopes: recordOf(isNumber), steals: recordOf(isNumber), defuses: recordOf(isNumber) })(stats),
    order: listOf(isString),
    out: listOf(isString),
    current: isString,
    turnsLeft: isNumber,
    attacked: isBoolean,
    step: (step) => isString(step) && ['turn', 'window', 'give', 'arrange', 'place', 'pick'].includes(step),
    pending: orNull(
      shape({
        by: isString,
        kind: (kind) => isString(kind) && ['single', 'pair', 'triple'].includes(kind),
        cards: listOf(isCardType),
        target: orNull(isString),
        request: orNull(isCardType),
        nopes: isNumber,
        lastNopeBy: orNull(isString),
        // Saknas hos en värd med en äldre version.
        n: (n: unknown) => n === undefined || isNumber(n),
      }),
    ),
    favor: orNull(shape({ from: isString, to: isString })),
    // pick och level saknas hos en värd med en äldre version.
    pick: (pick: unknown) => pick === undefined || orNull(shape({ by: isString, from: isString, count: isNumber }))(pick),
    level: (level: unknown) => level === undefined || isTantLevel(level),
    deckCount: isNumber,
    discardTop: listOf(isCardType),
    discardCount: isNumber,
    handCounts: recordOf(isNumber),
    log: listOf(isTantEvent),
    trap: isBoolean,
    winner: orNull(isString),
    error: orNull(isString),
    // Saknas hos en värd med en äldre version.
    standIns: (ids: unknown) => ids === undefined || listOf(isString)(ids),
    // Saknas hos en värd med en äldre version.
    lastAction: (action: unknown) =>
      action === undefined ||
      orNull(
        shape({
          n: isNumber,
          kind: (kind) => isString(kind) && ['draw', 'bomb', 'play', 'take', 'trap'].includes(kind),
          from: (from: unknown) => from === undefined || isString(from),
          player: isString,
          card: orNull(isCardType),
          saved: orNull(isBoolean),
        }),
      )(action),
  })(value)

const isImposterSettings = shape({ hard: isBoolean, category: orNull(isString), aloud: isBoolean })

const isGameState = shape({
  game: isString,
  phase: (phase) => isString(phase) && PHASES.includes(phase),
  rounds: isNumber,
  savedRounds: orNull(isNumber),
  round: isNumber,
  deadline: orNull(isNumber),
  pause: orNull(shape({ by: isString, msLeft: isNumber })),
  guesses: recordOf(isNumber),
  guessTimes: recordOf(isNumber),
  scores: recordOf(isNumber),
  players: recordOf(isPlayerInfo),
  lastResult: orNull(isRoundResult),
  matchRounds: listOf(isRoundResult),
  itemId: orNull(isString),
  usedItemIds: listOf(isString),
  guessSeconds: isNumber,
  autoAdvance: isBoolean,
  throwsAllowed: isBoolean,
  throwStats: shape({ items: recordOf(isNumber), received: recordOf(shape({ name: isString, count: isNumber })) }),
  practice: isBoolean,
  rematchAt: orNull(isNumber),
  rematchWishes: listOf(isString),
  choosingGame: isBoolean,
  notice: orNull(isString),
  countdownKind: isString,
  matchesPlayed: isNumber,
  gamesPlayed: recordOf(isNumber),
  leaderboard: recordOf(isLeaderboardEntry),
  cards: orNull(isCardTable),
  imposter: orNull(isImposterTable),
  imposterSettings: isImposterSettings,
  usedWordIds: listOf(isString),
  imposterMatch: shape({ wordIds: listOf(isString), imposterCounts: recordOf(isNumber) }),
  tantpanik: orNull(isTantTable),
  tantSettings: shape({ trap: isBoolean, level: (level: unknown) => level === undefined || isTantLevel(level) }),
  matchPlayerIds: listOf(isString),
  benchBots: recordOf(isPlayerInfo),
  dressId: orNull(isString),
})

// En spelare i närvarolistan. Närvaron skickas av varje flik själv, så den kontrolleras som allt annat i kanalen: ett
// trasigt namn eller id får inte krascha värden (som bestämmer namnen i lobbyn) eller skärmen hos de andra.
export type PresenceInfo = { id: string; name: string; avatar: string; host: boolean; joinedAt: number; sendsFrom: boolean; noThrows: boolean }

// Längsta namnet (samma som i PlayerSetup och savePlayer) och längsta id:t och figuren som godtas.
const NAME_MAX = 20
const ID_MAX = 100

// null om något har fel typ eller saknas. Namnet kortas till den längd sajten själv tillåter.
export function parsePresence(meta: unknown): PresenceInfo | null {
  if (!isObject(meta)) return null
  const { id, name, avatar, host, joinedAt, sendsFrom, noThrows } = meta
  if (!isString(id) || id === '' || id.length > ID_MAX) return null
  if (!isString(name) || !isString(avatar) || avatar.length > ID_MAX) return null
  const trimmed = name.trim().slice(0, NAME_MAX)
  if (trimmed === '') return null
  return { id, name: trimmed, avatar, host: host === true, joinedAt: isNumber(joinedAt) ? joinedAt : 0, sendsFrom: sendsFrom === true, noThrows: noThrows === true }
}

// version = värdens version av sajten. Saknas hos en värd med en äldre version.
export type StateMessage = { state: GameState; sentAt: number; from: string | null; hands: Record<string, number>; version: number | null }

// Läget från värden. Fält som saknas (t.ex. från en värd med en äldre version av sajten) får sina startvärden.
// null om något har fel typ.
export function parseStateMessage(payload: unknown): StateMessage | null {
  if (!isObject(payload) || !isObject(payload.state) || !isNumber(payload.sentAt)) return null
  if (!isString(payload.state.game)) return null
  const state = { ...initialState(payload.state.game), ...payload.state }
  // Fälten för lika röster, sista gissningen och facit saknas hos en värd med en äldre version av sajten.
  if (isObject(state.imposter)) state.imposter = Object.assign({ tied: null, tieVotes: null, pointers: {}, accusation: null, accusers: [], failedAccusation: null, caught: null, outcome: null }, state.imposter)
  if (!isGameState(state)) return null
  // Lurig: ordet visas i facit, så en trasig text får inte komma med.
  const outcome = (state as GameState).imposter?.outcome
  if (outcome && outcome.imposterWord !== undefined && !isString(outcome.imposterWord)) return null
  const hands = isObject(payload.hands) && Object.values(payload.hands).every(isNumber) ? (payload.hands as Record<string, number>) : {}
  return { state: upgradeAvatars(state as GameState), sentAt: payload.sentAt, from: isString(payload.from) ? payload.from : null, hands, version: isNumber(payload.version) ? payload.version : null }
}

// En värd enligt närvarolistan. sendsFrom = värden skickar alltid med sitt id (from). Värdar med en äldre version
// av sajten gör inte det, och bara då godtas ett meddelande utan avsändare.
export type HostInfo = { id: string; sendsFrom: boolean }

// Kommer meddelandet från den som är värd just nu?
export function isFromHost(from: string | null, hosts: readonly HostInfo[]): boolean {
  return from === null ? hosts.some((host) => !host.sendsFrom) : hosts.some((host) => host.id === from)
}

const isPick = (value: unknown): value is Pick =>
  shape({ kind: (kind) => kind === 'card', card: isString })(value) ||
  shape({ kind: (kind) => kind === 'blank', text: isString })(value)

export function parseGuess(payload: unknown): { id: string; value: number } | null {
  return shape({ id: isString, value: isNumber })(payload) ? { id: payload.id as string, value: payload.value as number } : null
}

// Imposterjakten: den som har tur skriver på sitt ord (skickas högst varannan sekund, aldrig själva texten).
export function parseTyping(payload: unknown): { id: string } | null {
  return shape({ id: isString })(payload) ? { id: payload.id as string } : null
}

// En spelare önskar revansch eller ångrar sig (Jag vill ha revansch på slutskärmen).
export function parseRematchWish(payload: unknown): { id: string; wants: boolean } | null {
  return shape({ id: isString, wants: isBoolean })(payload) ? { id: payload.id as string, wants: payload.wants as boolean } : null
}

// Ett kast på en annan spelare. Slängs om saken är okänd, om någon kastar på sig själv, om avsändaren eller målet
// inte finns i lobbyn (närvarolistan), om målet inte tar emot kast eller om värden har stängt av kasten.
export function parseThrow(
  payload: unknown,
  lobby: { online: readonly { id: string; noThrows?: boolean }[]; throwsAllowed: boolean },
): { id: string; to: string; item: ThrowItemId } | null {
  if (!lobby.throwsAllowed || !shape({ id: isString, to: isString, item: isString })(payload)) return null
  const { id, to } = payload as { id: string; to: string }
  const item = findThrowItem(payload.item)
  if (!item || id === to) return null
  const target = lobby.online.find((player) => player.id === to)
  if (!target || target.noThrows || !lobby.online.some((player) => player.id === id)) return null
  return { id, to, item: item.id }
}

// Ett drag i ett kortspel eller i Imposterjakten. Ett skrivet ord får vara högst 100 tecken (värden kontrollerar det
// närmare, se checkClue).
// nr = dragets eget nummer, så att värden kan känna igen ett drag som skickats igen. Saknas hos äldre versioner av sajten.
export function parseMove(payload: unknown): { id: string; nr: string | null; move: CardMove | ImposterMove | TantMove } | null {
  const parsed = parseMoveBody(payload)
  if (!parsed) return null
  const { nr } = payload as Unknown
  return { ...parsed, nr: isString(nr) ? nr : null }
}

function parseMoveBody(payload: unknown): { id: string; move: CardMove | ImposterMove | TantMove } | null {
  if (!isObject(payload) || !isString(payload.id) || !isObject(payload.move)) return null
  const move = payload.move
  const tant = parseTantMove(move)
  if (tant) return { id: payload.id, move: tant }
  if (move.type === 'read' || move.type === 'pass') return { id: payload.id, move: { type: move.type } }
  if (move.type === 'said') {
    const typed = isString(move.word) && move.word.length <= 100
    return { id: payload.id, move: typed ? { type: 'said', word: move.word as string } : { type: 'said' } }
  }
  if (move.type === 'accuse' && isString(move.target)) return { id: payload.id, move: { type: 'accuse', target: move.target } }
  if (move.type === 'accuseVote' && isBoolean(move.yes)) return { id: payload.id, move: { type: 'accuseVote', yes: move.yes } }
  if (move.type === 'ready' && isBoolean(move.on)) return { id: payload.id, move: { type: 'ready', on: move.on } }
  if (move.type === 'vote' && isString(move.target)) return { id: payload.id, move: { type: 'vote', target: move.target } }
  if (move.type === 'guess' && isString(move.word) && move.word.length <= 100) {
    return { id: payload.id, move: { type: 'guess', word: move.word } }
  }
  if (move.type === 'giveUp') return { id: payload.id, move: { type: 'giveUp' } }
  if (move.type === 'point' && (move.target === null || isString(move.target))) {
    return { id: payload.id, move: { type: 'point', target: move.target } }
  }
  if (move.type === 'clue' && isString(move.word) && move.word.length <= 100) {
    return { id: payload.id, move: { type: 'clue', word: move.word } }
  }
  if (move.type === 'pick' && isPick(move.pick) && (move.done === undefined || isBoolean(move.done))) {
    return { id: payload.id, move: { type: 'pick', pick: move.pick, done: move.done } }
  }
  if (move.type === 'done') return { id: payload.id, move: { type: 'done' } }
  if (move.type === 'judge' && isString(move.key)) return { id: payload.id, move: { type: 'judge', key: move.key } }
  return null
}

// Exploderande Tanter. Värden kontrollerar resten: att korten finns på handen, att det är rätt fas och att målet går att välja.
function parseTantMove(move: Unknown): TantMove | null {
  switch (move.type) {
    case 'tDraw':
      return { type: 'tDraw' }
    case 'tPlay': {
      if (!listOf(isString)(move.cards) || move.cards.length < 1 || move.cards.length > 3) return null
      if (!(move.target === undefined || orNull(isString)(move.target))) return null
      if (!(move.request === undefined || orNull(isCardType)(move.request))) return null
      return { type: 'tPlay', cards: move.cards, target: (move.target as string | null | undefined) ?? null, request: (move.request as CardType | null | undefined) ?? null }
    }
    case 'tNope':
      if (!isString(move.card) || !isNumber(move.level) || !(move.play === undefined || isNumber(move.play))) return null
      return move.play === undefined ? { type: 'tNope', card: move.card, level: move.level } : { type: 'tNope', card: move.card, level: move.level, play: move.play }
    case 'tGive':
      return isString(move.card) ? { type: 'tGive', card: move.card } : null
    case 'tPlace':
      return isNumber(move.position) ? { type: 'tPlace', position: move.position } : null
    case 'tArrange':
      return listOf(isNumber)(move.order) && move.order.length <= 3 ? { type: 'tArrange', order: move.order } : null
    case 'tPick':
      return isNumber(move.index) ? { type: 'tPick', index: move.index } : null
    case 'tFinish':
      return { type: 'tFinish' }
    default:
      return null
  }
}

const isTantCard = shape({ id: isString, type: isCardType })

// Exploderande Tanter: min hand och det bara jag får veta. Meddelanden till andra spelare slängs.
export function parseTantView(payload: unknown): { to: string; from: string | null; seq: number | null; view: MyTantView } | null {
  if (!isObject(payload) || !isString(payload.to)) return null
  const view = payload.view
  const ok = shape({
    hand: listOf(isTantCard),
    peek: orNull(listOf(isCardType)),
    arrange: orNull(listOf(isCardType)),
    notice: orNull(isTantEvent),
    drew: (drew: unknown) => drew === undefined || orNull(shape({ n: isNumber, type: isCardType }))(drew),
    lost: (lost: unknown) => lost === undefined || orNull(shape({ n: isNumber, type: isCardType, to: isString }))(lost),
    handled: listOf(isString),
  })(view)
  if (!ok) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null, seq: isNumber(payload.seq) ? payload.seq : null, view: view as MyTantView }
}

const isMyHand = shape({ cards: listOf(isString), blank: isBoolean, pick: orNull(isPick) })

// Min hand i ett kortspel. null = ingen hand (t.ex. efter matchen).
export function parseHand(payload: unknown): { to: string; from: string | null; seq: number | null; hand: MyHand | null } | null {
  if (!isObject(payload) || !isString(payload.to)) return null
  if (payload.hand !== null && !isMyHand(payload.hand)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null, seq: isNumber(payload.seq) ? payload.seq : null, hand: payload.hand as MyHand | null }
}

const isImposterCard = (value: unknown): value is ImposterCard =>
  shape({ role: (role) => role === 'oskyldig', word: isString, category: orNull(isString) })(value) ||
  shape({ role: (role) => role === 'imposter', hint: orNull(isString), category: orNull(isString) })(value) ||
  shape({ role: (role) => role === 'lurig', word: isString, category: orNull(isString) })(value)

// Mitt kort i Imposterjakten (som hand i kortspelen). card null = inte med i omgången.
export function parseImposterCard(payload: unknown): { to: string; from: string | null; seq: number | null; card: MyImposterCard } | null {
  if (!isObject(payload) || !isString(payload.to) || !isObject(payload.card)) return null
  const { card, rejectedAt, ready, vote } = payload.card
  const accuseVote = isBoolean(payload.card.accuseVote) ? payload.card.accuseVote : null
  if (!(card === null || isImposterCard(card)) || !orNull(isNumber)(rejectedAt)) return null
  if (!isBoolean(ready) || !orNull(isString)(vote)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null, seq: isNumber(payload.seq) ? payload.seq : null, card: { card, rejectedAt, ready, vote, accuseVote } }
}

export function parseHandover(payload: unknown): { to: string; from: string | null } | null {
  if (!isObject(payload) || !isString(payload.to)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null }
}
