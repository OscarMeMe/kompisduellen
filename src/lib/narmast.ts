// Spellogik för "Närmast vinner". Rena funktioner utan React eller Supabase,
// så att de är lätta att testa och läsa.

export const GUESS_SECONDS = 15
export const REVEAL_SECONDS = 6
export const ROUND_OPTIONS = [3, 5, 10] as const
export const MIN_NUMBER = 1
export const MAX_NUMBER = 100

export type Phase = 'waiting' | 'guessing' | 'reveal' | 'finished'

export type PlayerInfo = {
  name: string
  avatar: string
}

export type RoundResult = {
  target: number
  guesses: Record<string, number>
  winners: string[]
}

export type GameState = {
  phase: Phase
  rounds: number
  round: number
  // Tidpunkt (värdens klocka, ms) då gissningen eller visningen tar slut.
  deadline: number | null
  guesses: Record<string, number>
  scores: Record<string, number>
  players: Record<string, PlayerInfo>
  lastResult: RoundResult | null
}

export type RankedPlayer = PlayerInfo & {
  id: string
  score: number
  place: number
}

export function initialState(): GameState {
  return {
    phase: 'waiting',
    rounds: 5,
    round: 0,
    deadline: null,
    guesses: {},
    scores: {},
    players: {},
    lastResult: null,
  }
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
    phase: 'guessing',
    round: 1,
    deadline: now + GUESS_SECONDS * 1000,
    guesses: {},
    scores,
    players,
    lastResult: null,
  }
}

export function isValidGuess(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER
}

export function addGuess(state: GameState, playerId: string, value: number): GameState {
  if (state.phase !== 'guessing') return state
  if (!isValidGuess(value)) return state
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

// Avslutar rundan: slumpar talet och ger poäng till den eller de som är närmast.
export function resolveRound(state: GameState, now: number, target = randomTarget()): GameState {
  if (state.phase !== 'guessing') return state

  const entries = Object.entries(state.guesses)
  let winners: string[] = []
  if (entries.length > 0) {
    const best = Math.min(...entries.map(([, guess]) => Math.abs(guess - target)))
    winners = entries.filter(([, guess]) => Math.abs(guess - target) === best).map(([id]) => id)
  }

  const scores = { ...state.scores }
  for (const id of winners) scores[id] = (scores[id] ?? 0) + 1

  return {
    ...state,
    phase: 'reveal',
    deadline: now + REVEAL_SECONDS * 1000,
    scores,
    lastResult: { target, guesses: state.guesses, winners },
  }
}

export function nextRound(state: GameState, now: number): GameState {
  if (state.phase !== 'reveal') return state
  if (state.round >= state.rounds) {
    return { ...state, phase: 'finished', deadline: null }
  }
  return {
    ...state,
    phase: 'guessing',
    round: state.round + 1,
    deadline: now + GUESS_SECONDS * 1000,
    guesses: {},
  }
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
