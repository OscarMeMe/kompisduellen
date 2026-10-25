// Matchflödet för gissningsspelen, plus lobbyns topplista.
// Alla spel går till på samma sätt: alla gissar ett tal på tid, sedan avslöjas svaret.
// Det som skiljer spelen åt (tider, giltiga gissningar och poäng) finns i spelregler.ts.
// Rena funktioner utan React eller Supabase, så att de är lätta att testa och läsa.

import { rulesFor } from '@/lib/spelregler'

export const ROUND_OPTIONS = [3, 5, 10] as const

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

// En rad i lobbyns topplista. Gäller hela lobbyn, oavsett spel.
export type LeaderboardEntry = PlayerInfo & {
  wins: number // vunna matcher
  played: number // spelade matcher
}

export type GameState = {
  game: string // id från GAMES. Värden kan byta spel i väntrummet inför varje match.
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
  // Antal spelade matcher per spel, t.ex. { narmast: 2, 'gissa-priset': 1 }.
  gamesPlayed: Record<string, number>
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
    gamesPlayed: {},
    leaderboard: {},
  }
}

// Startar en ny runda: väljer rundans sak (om spelet har sådana) och startar klockan.
function startRound(state: GameState, round: number, now: number): GameState {
  const rules = rulesFor(state.game)
  const item = rules.pickItem?.(state.usedItemIds) ?? { itemId: null, usedItemIds: state.usedItemIds }
  return {
    ...state,
    ...item,
    phase: 'guessing',
    round,
    deadline: now + rules.guessSeconds * 1000,
    guesses: {},
  }
}

export function setRounds(state: GameState, rounds: number): GameState {
  if (state.phase !== 'waiting') return state
  return { ...state, rounds }
}

// Byter spel i väntrummet. Antal rundor och topplistan följer med.
export function setGame(state: GameState, game: string): GameState {
  if (state.phase !== 'waiting' || state.game === game) return state
  return { ...state, game }
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
  return startRound({ ...state, scores, players, lastResult: null }, 1, now)
}

export function isValidGuess(game: string, value: number): boolean {
  return rulesFor(game).isValidGuess(value)
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

// Avslutar rundan och delar ut poäng enligt spelets regler.
// Den eller de som fick flest poäng (över noll) vinner rundan.
export function resolveRound(state: GameState, now: number, target?: number): GameState {
  if (state.phase !== 'guessing') return state

  const rules = rulesFor(state.game)
  const outcome = rules.scoreRound(state.guesses, state.itemId, target)
  const best = Math.max(0, ...Object.values(outcome.points))
  const winners = best > 0 ? Object.keys(outcome.points).filter((id) => outcome.points[id] === best) : []

  const scores = { ...state.scores }
  for (const [id, gained] of Object.entries(outcome.points)) scores[id] = (scores[id] ?? 0) + gained

  return {
    ...state,
    phase: 'reveal',
    deadline: now + rules.revealSeconds * 1000,
    scores,
    lastResult: { ...outcome, guesses: state.guesses, winners, itemId: state.itemId },
  }
}

export function nextRound(state: GameState, now: number): GameState {
  if (state.phase !== 'reveal') return state
  if (state.round >= state.rounds) {
    return finishMatch({ ...state, phase: 'finished', deadline: null })
  }
  return startRound(state, state.round + 1, now)
}

// Den eller de med flest poäng i matchen. Delad seger ger alla på förstaplatsen en vinst.
// Fick ingen några poäng blir det ingen vinnare.
export function matchWinners(state: GameState): string[] {
  const best = Math.max(0, ...Object.keys(state.players).map((id) => state.scores[id] ?? 0))
  if (best === 0) return []
  return Object.keys(state.players).filter((id) => (state.scores[id] ?? 0) === best)
}

// Lägger matchens vinster på topplistan.
function finishMatch(state: GameState): GameState {
  const winners = matchWinners(state)
  const leaderboard = { ...state.leaderboard }
  for (const [id, info] of Object.entries(state.players)) {
    const previous = leaderboard[id]
    leaderboard[id] = {
      ...info,
      wins: (previous?.wins ?? 0) + (winners.includes(id) ? 1 : 0),
      played: (previous?.played ?? 0) + 1,
    }
  }
  return {
    ...state,
    leaderboard,
    matchesPlayed: state.matchesPlayed + 1,
    gamesPlayed: { ...state.gamesPlayed, [state.game]: (state.gamesPlayed[state.game] ?? 0) + 1 },
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

// Topplistan sorterad på antal vinster. Lika många vinster ger samma placering.
export function rankLeaderboard(state: GameState): RankedEntry[] {
  const list = Object.entries(state.leaderboard).map(([id, entry]) => ({ id, ...entry }))
  list.sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, 'sv'))
  return list.map((entry) => ({
    ...entry,
    place: 1 + list.filter((other) => other.wins > entry.wins).length,
  }))
}
