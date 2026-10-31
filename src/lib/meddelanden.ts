// Kontroll av meddelanden i lobbyns kanal. Alla som kan lobbykoden kan skicka vad som helst i kanalen, så inget
// används innan det kontrollerats här. Ett trasigt meddelande slängs i stället för att krascha skärmen.
// Gästerna tar bara emot läget, händer och värdbyten från den som är värd enligt närvarolistan (from). Det går inte
// att bevisa vem som skickat något utan inloggning, men det stoppar trasiga meddelanden och enkla försök att
// låtsas vara värd. Rena funktioner, så att de är lätta att testa.

import type { ImposterCard, ImposterMove, ImposterTable, MyImposterCard } from '@/lib/imposterjakten'
import { findThrowItem, type ThrowItemId } from '@/lib/kast'
import type { CardMove, CardTable, MyHand, Pick } from '@/lib/kort'
import { initialState, type GameState, type RoundResult } from '@/lib/match'

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
    step: (step) => isString(step) && ['kort', 'ledtradar', 'diskussion'].includes(step),
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
})

export type StateMessage = { state: GameState; sentAt: number; from: string | null }

// Läget från värden. Fält som saknas (t.ex. från en värd med en äldre version av sajten) får sina startvärden.
// null om något har fel typ.
export function parseStateMessage(payload: unknown): StateMessage | null {
  if (!isObject(payload) || !isObject(payload.state) || !isNumber(payload.sentAt)) return null
  if (!isString(payload.state.game)) return null
  const state = { ...initialState(payload.state.game), ...payload.state }
  if (!isGameState(state)) return null
  return { state: state as GameState, sentAt: payload.sentAt, from: isString(payload.from) ? payload.from : null }
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
export function parseMove(payload: unknown): { id: string; move: CardMove | ImposterMove } | null {
  if (!isObject(payload) || !isString(payload.id) || !isObject(payload.move)) return null
  const move = payload.move
  if (move.type === 'read' || move.type === 'pass' || move.type === 'said') return { id: payload.id, move: { type: move.type } }
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

const isMyHand = shape({ cards: listOf(isString), blank: isBoolean, pick: orNull(isPick) })

// Min hand i ett kortspel. null = ingen hand (t.ex. efter matchen).
export function parseHand(payload: unknown): { to: string; from: string | null; hand: MyHand | null } | null {
  if (!isObject(payload) || !isString(payload.to)) return null
  if (payload.hand !== null && !isMyHand(payload.hand)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null, hand: payload.hand as MyHand | null }
}

const isImposterCard = (value: unknown): value is ImposterCard =>
  shape({ role: (role) => role === 'oskyldig', word: isString, category: orNull(isString) })(value) ||
  shape({ role: (role) => role === 'imposter', hint: orNull(isString), category: orNull(isString) })(value)

// Mitt kort i Imposterjakten (som hand i kortspelen). card null = inte med i omgången.
export function parseImposterCard(payload: unknown): { to: string; from: string | null; card: MyImposterCard } | null {
  if (!isObject(payload) || !isString(payload.to) || !isObject(payload.card)) return null
  const { card, rejectedAt } = payload.card
  if (!(card === null || isImposterCard(card)) || !orNull(isNumber)(rejectedAt)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null, card: { card, rejectedAt } }
}

export function parseHandover(payload: unknown): { to: string; from: string | null } | null {
  if (!isObject(payload) || !isString(payload.to)) return null
  return { to: payload.to, from: isString(payload.from) ? payload.from : null }
}
