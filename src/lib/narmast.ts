// Spellogik för gissningsspelen "Närmast vinner" och "Gissa priset".
// Båda går till på samma sätt: alla gissar ett tal på tid, sedan avslöjas svaret.
// Rena funktioner utan React eller Supabase, så att de är lätta att testa och läsa.

import { findPriceItem, PRICE_ITEMS, pricePoints } from '@/lib/prisdata'

export const ROUND_OPTIONS = [3, 5, 10] as const
export const MIN_NUMBER = 1
export const MAX_NUMBER = 100
export const MAX_PRICE = 1_000_000_000_000

export const PRICE_GAME = 'gissa-priset'

export function guessSeconds(game: string): number {
  return game === PRICE_GAME ? 20 : 15
}

// Gissa priset får lite längre tid så att man hinner läsa faktameningen.
export function revealSeconds(game: string): number {
  return game === PRICE_GAME ? 8 : 6
}

export type Phase = 'waiting' | 'guessing' | 'reveal' | 'finished'

export type PlayerInfo = {
  name: string
  avatar: string
}

export type RoundResult = {
  target: number
  guesses: Record<string, number>
  winners: string[]
  // Poäng som varje spelare fick just den här rundan.
  points: Record<string, number>
  // Gissa priset: vilken sak rundan gällde.
  itemId: string | null
}

// En rad i lobbyns topplista. Poängen från varje avslutad match läggs på här.
export type LeaderboardEntry = PlayerInfo & {
  points: number
  wins: number
}

export type GameState = {
  game: string // id från GAMES, så att alla vet vilket spel topplistan gäller
  phase: Phase
  rounds: number
  round: number
  // Tidpunkt (värdens klocka, ms) då gissningen eller visningen tar slut.
  deadline: number | null
  guesses: Record<string, number>
  scores: Record<string, number>
  players: Record<string, PlayerInfo>
  lastResult: RoundResult | null
  // Gissa priset: saken som visas i rundan, och saker som redan varit med.
  itemId: string | null
  usedItemIds: string[]
  matchesPlayed: number
  leaderboard: Record<string, LeaderboardEntry>
}

export type RankedPlayer = PlayerInfo & {
  id: string
  score: number
  place: number
}

export type RankedEntry = LeaderboardEntry & {
  id: string
  place: number
}

export function initialState(game = 'narmast'): GameState {
  return {
    game,
    phase: 'waiting',
    rounds: 5,
    round: 0,
    deadline: null,
    guesses: {},
    scores: {},
    players: {},
    lastResult: null,
    itemId: null,
    usedItemIds: [],
    matchesPlayed: 0,
    leaderboard: {},
  }
}

// Gissa priset: välj en slumpad sak som inte varit med än. När alla använts börjar listan om.
function pickItem(state: GameState): Pick<GameState, 'itemId' | 'usedItemIds'> {
  if (state.game !== PRICE_GAME) return { itemId: null, usedItemIds: state.usedItemIds }
  let unused = PRICE_ITEMS.filter((item) => !state.usedItemIds.includes(item.id))
  let used = state.usedItemIds
  if (unused.length === 0) {
    unused = PRICE_ITEMS
    used = []
  }
  const item = unused[Math.floor(Math.random() * unused.length)]
  return { itemId: item.id, usedItemIds: [...used, item.id] }
}

export function setRounds(state: GameState, rounds: number): GameState {
  if (state.phase !== 'waiting') return state
  return { ...state, rounds }
}

// Lägger till spelare som anslutit. Befintliga poäng behålls.
export function addPlayers(state: GameState, players: Record<string, PlayerInfo>): GameState {
  let changed = false
  const nextPlayers = { ...state.players }
  const nextScores = { ...state.scores }
  for (const [id, info] of Object.entries(players)) {
    const existing = nextPlayers[id]
    if (!existing || existing.name !== info.name || existing.avatar !== info.avatar) {
      nextPlayers[id] = info
      changed = true
    }
    if (nextScores[id] === undefined) {
      nextScores[id] = 0
      changed = true
    }
  }
  return changed ? { ...state, players: nextPlayers, scores: nextScores } : state
}

export function startGame(state: GameState, onlineIds: string[], now: number): GameState {
  // Ny match: bara de som är med just nu, alla börjar på noll.
  const players: Record<string, PlayerInfo> = {}
  const scores: Record<string, number> = {}
  for (const id of onlineIds) {
    if (state.players[id]) {
      players[id] = state.players[id]
      scores[id] = 0
    }
  }
  return {
    ...state,
    ...pickItem(state),
    phase: 'guessing',
    round: 1,
    deadline: now + guessSeconds(state.game) * 1000,
    guesses: {},
    scores,
    players,
    lastResult: null,
  }
}

export function isValidGuess(game: string, value: number): boolean {
  // Gissa priset: kronor med upp till två decimaler (gamla priser kan vara några ören).
  if (game === PRICE_GAME) {
    const hasMaxTwoDecimals = Math.abs(Math.round(value * 100) - value * 100) < 1e-6
    return Number.isFinite(value) && value >= 0.01 && value <= MAX_PRICE && hasMaxTwoDecimals
  }
  return Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER
}

export function addGuess(state: GameState, playerId: string, value: number): GameState {
  if (state.phase !== 'guessing') return state
  if (!isValidGuess(state.game, value)) return state
  if (state.guesses[playerId] !== undefined) return state
  if (!state.players[playerId]) return state
  return { ...state, guesses: { ...state.guesses, [playerId]: value } }
}

export function everyoneHasGuessed(state: GameState, onlineIds: string[]): boolean {
  const active = onlineIds.filter((id) => state.players[id])
  return active.length > 0 && active.every((id) => state.guesses[id] !== undefined)
}

export function randomTarget(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER
}

// Avslutar rundan och delar ut poäng.
// Närmast vinner: talet slumpas nu, och den eller de som är närmast får 1 poäng.
// Gissa priset: priset på rundans sak, och alla får 0–100 poäng efter hur nära de var i procent.
export function resolveRound(state: GameState, now: number, target?: number): GameState {
  if (state.phase !== 'guessing') return state

  const entries = Object.entries(state.guesses)
  const points: Record<string, number> = {}
  let winners: string[] = []
  let answer: number

  if (state.game === PRICE_GAME) {
    answer = target ?? findPriceItem(state.itemId)?.priceSek ?? 0
    for (const [id, guess] of entries) points[id] = pricePoints(guess, answer)
    const best = Math.max(0, ...Object.values(points))
    if (best > 0) winners = entries.filter(([id]) => points[id] === best).map(([id]) => id)
  } else {
    answer = target ?? randomTarget()
    if (entries.length > 0) {
      const best = Math.min(...entries.map(([, guess]) => Math.abs(guess - answer)))
      winners = entries.filter(([, guess]) => Math.abs(guess - answer) === best).map(([id]) => id)
    }
    for (const id of winners) points[id] = 1
  }

  const scores = { ...state.scores }
  for (const [id, gained] of Object.entries(points)) scores[id] = (scores[id] ?? 0) + gained

  return {
    ...state,
    phase: 'reveal',
    deadline: now + revealSeconds(state.game) * 1000,
    scores,
    lastResult: { target: answer, guesses: state.guesses, winners, points, itemId: state.itemId },
  }
}

export function nextRound(state: GameState, now: number): GameState {
  if (state.phase !== 'reveal') return state
  if (state.round >= state.rounds) {
    return finishMatch({ ...state, phase: 'finished', deadline: null })
  }
  return {
    ...state,
    ...pickItem(state),
    phase: 'guessing',
    round: state.round + 1,
    deadline: now + guessSeconds(state.game) * 1000,
    guesses: {},
  }
}

// Lägger matchens poäng på topplistan. Den eller de med flest poäng får en vinst.
function finishMatch(state: GameState): GameState {
  const best = Math.max(0, ...Object.values(state.scores))
  const leaderboard = { ...state.leaderboard }
  for (const [id, info] of Object.entries(state.players)) {
    const score = state.scores[id] ?? 0
    const previous = leaderboard[id]
    leaderboard[id] = {
      ...info,
      points: (previous?.points ?? 0) + score,
      wins: (previous?.wins ?? 0) + (best > 0 && score === best ? 1 : 0),
    }
  }
  return { ...state, leaderboard, matchesPlayed: state.matchesPlayed + 1 }
}

export function backToWaiting(state: GameState): GameState {
  const scores: Record<string, number> = {}
  for (const id of Object.keys(state.players)) scores[id] = 0
  return {
    ...state,
    phase: 'waiting',
    round: 0,
    deadline: null,
    guesses: {},
    scores,
    lastResult: null,
    itemId: null,
  }
}

// Sorterar på poäng. Lika poäng ger samma placering (1, 2, 2, 4 …).
export function rankPlayers(state: GameState): RankedPlayer[] {
  const list = Object.entries(state.players).map(([id, info]) => ({
    id,
    ...info,
    score: state.scores[id] ?? 0,
  }))
  list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'sv'))
  return list.map((player) => ({
    ...player,
    place: 1 + list.filter((other) => other.score > player.score).length,
  }))
}

// Topplistan sorterad på totala poäng, sedan antal vinster. Lika ger samma placering.
export function rankLeaderboard(state: GameState): RankedEntry[] {
  const list = Object.entries(state.leaderboard).map(([id, entry]) => ({ id, ...entry }))
  const better = (a: LeaderboardEntry, b: LeaderboardEntry) => b.points - a.points || b.wins - a.wins
  list.sort((a, b) => better(a, b) || a.name.localeCompare(b.name, 'sv'))
  return list.map((entry) => ({
    ...entry,
    place: 1 + list.filter((other) => better(entry, other) > 0).length,
  }))
}
