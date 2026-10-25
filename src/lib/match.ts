// Matchflödet för gissningsspelen, plus lobbyns topplista.
// Alla spel går till på samma sätt: alla gissar ett tal på tid, sedan avslöjas svaret.
// Det som skiljer spelen åt (tider, giltiga gissningar och poäng) finns i spelregler.ts.
// Rena funktioner utan React eller Supabase, så att de är lätta att testa och läsa.

import { findGame } from '@/lib/games'
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
  // null under facit när värden går vidare själv.
  deadline: number | null
  guesses: Record<string, number>
  scores: Record<string, number>
  players: Record<string, PlayerInfo>
  lastResult: RoundResult | null
  // Alla rundor i matchen, för höjdpunkterna efter matchen.
  matchRounds: RoundResult[]
  // Gissa priset: saken som visas i rundan, och saker som redan varit med.
  itemId: string | null
  usedItemIds: string[]
  // Lobbyns tempo. Gäller spel som har guessSecondsOptions (Gissa priset).
  guessSeconds: number
  // true = nästa runda startar av sig själv efter facit. false = värden går vidare.
  autoAdvance: boolean
  // Matchen har bara en spelare: en provomgång som inte räknas i topplistan.
  practice: boolean
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

export function initialState(game = 'gissa-priset'): GameState {
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
    matchRounds: [],
    itemId: null,
    usedItemIds: [],
    guessSeconds: rulesFor('gissa-priset').guessSeconds,
    autoAdvance: true,
    practice: false,
    matchesPlayed: 0,
    gamesPlayed: {},
    leaderboard: {},
  }
}

// Har spelet tempoinställningar (svarstid och vem som går vidare efter facit)?
export function hasTempoSettings(game: string): boolean {
  return rulesFor(game).guessSecondsOptions !== undefined
}

// Svarstiden i matchen: lobbyns val om spelet har tempoinställningar, annars spelets egen tid.
export function guessSecondsFor(state: Pick<GameState, 'game' | 'guessSeconds'>): number {
  const rules = rulesFor(state.game)
  return rules.guessSecondsOptions?.includes(state.guessSeconds) ? state.guessSeconds : rules.guessSeconds
}

// Går matchen vidare av sig själv efter facit? Spel utan tempoinställningar gör det alltid.
export function autoAdvanceFor(state: Pick<GameState, 'game' | 'autoAdvance'>): boolean {
  return hasTempoSettings(state.game) ? state.autoAdvance : true
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
    deadline: now + guessSecondsFor(state) * 1000,
    guesses: {},
  }
}

export function setRounds(state: GameState, rounds: number): GameState {
  if (state.phase !== 'waiting') return state
  return { ...state, rounds }
}

// Byter spel i väntrummet. Antal rundor, tempo och topplistan följer med.
export function setGame(state: GameState, game: string): GameState {
  if (state.phase !== 'waiting' || state.game === game) return state
  return { ...state, game }
}

// Värdens tempoval i väntrummet. Svarstider som spelet inte erbjuder ignoreras.
export function setTempo(state: GameState, tempo: { guessSeconds?: number; autoAdvance?: boolean }): GameState {
  if (state.phase !== 'waiting') return state
  const options = rulesFor(state.game).guessSecondsOptions ?? []
  const guessSeconds =
    tempo.guessSeconds !== undefined && options.includes(tempo.guessSeconds) ? tempo.guessSeconds : state.guessSeconds
  const autoAdvance = tempo.autoAdvance ?? state.autoAdvance
  if (guessSeconds === state.guessSeconds && autoAdvance === state.autoAdvance) return state
  return { ...state, guessSeconds, autoAdvance }
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

// Kan en match starta med så här många i lobbyn? Spel med soloPractice får starta som provomgång
// med en spelare. Annars krävs spelets minsta antal spelare.
export function canStart(game: string, playerCount: number): boolean {
  const minPlayers = findGame(game)?.minPlayers ?? 2
  if (playerCount >= minPlayers) return true
  return playerCount === 1 && rulesFor(game).soloPractice === true
}

export function startGame(state: GameState, onlineIds: string[], now: number): GameState {
  if (state.phase !== 'waiting') return state
  // Ny match: bara de som är med just nu, alla börjar på noll.
  const players: Record<string, PlayerInfo> = {}
  const scores: Record<string, number> = {}
  for (const id of onlineIds) {
    if (state.players[id]) {
      players[id] = state.players[id]
      scores[id] = 0
    }
  }
  const count = Object.keys(players).length
  if (!canStart(state.game, count)) return state
  return startRound(
    { ...state, scores, players, lastResult: null, matchRounds: [], practice: count === 1 },
    1,
    now,
  )
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

  const result: RoundResult = { ...outcome, guesses: state.guesses, winners, itemId: state.itemId }
  return {
    ...state,
    phase: 'reveal',
    // Går värden vidare själv står facit kvar utan klocka.
    deadline: autoAdvanceFor(state) ? now + rules.revealSeconds * 1000 : null,
    scores,
    lastResult: result,
    matchRounds: [...state.matchRounds, result],
  }
}

export function nextRound(state: GameState, now: number): GameState {
  if (state.phase !== 'reveal') return state
  if (state.round >= state.rounds) {
    return finishMatch({ ...state, phase: 'finished', deadline: null })
  }
  return startRound(state, state.round + 1, now)
}

// Värdens timer. Gör bara något om klockan som löpte ut fortfarande är den som gäller, så att en
// gammal timer aldrig avslutar en ny runda (t.ex. om värden precis hoppade fram).
export function handleDeadline(state: GameState, now: number, deadline: number): GameState {
  if (state.deadline !== deadline || now < deadline) return state
  if (state.phase === 'guessing') return resolveRound(state, now)
  if (state.phase === 'reveal') return nextRound(state, now)
  return state
}

// Värden går vidare från facit. round är rundan som visades när värden klickade, så att ett
// dubbelklick (eller ett klick samtidigt som timern) aldrig hoppar över en runda.
export function advanceFromReveal(state: GameState, now: number, round: number): GameState {
  if (state.phase !== 'reveal' || state.round !== round) return state
  return nextRound(state, now)
}

// Den eller de med flest poäng i matchen. Delad seger ger alla på förstaplatsen en vinst.
// Fick ingen några poäng blir det ingen vinnare.
export function matchWinners(state: GameState): string[] {
  const best = Math.max(0, ...Object.keys(state.players).map((id) => state.scores[id] ?? 0))
  if (best === 0) return []
  return Object.keys(state.players).filter((id) => (state.scores[id] ?? 0) === best)
}

// Lägger matchens vinster på topplistan. En provomgång med en spelare räknas inte.
function finishMatch(state: GameState): GameState {
  if (state.practice) return state
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
  if (state.phase !== 'finished') return state
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
    matchRounds: [],
    itemId: null,
    practice: false,
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
