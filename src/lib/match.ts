// Matchflödet för alla spel, plus lobbyns topplista.
// Gissningsspelen går till på samma sätt: alla gissar ett tal på tid, sedan avslöjas svaret.
// Det som skiljer dem åt (tider, giltiga gissningar och poäng) finns i spelregler.ts.
// Kortspelen (t.ex. Kortkaos) har fasen 'playing' och följer rundflödet i kort.ts. Värden har då
// också hemlig data (CardSecrets) som aldrig skickas ut, så värdens funktioner tar och ger HostState.
// Rena funktioner utan React eller Supabase, så att de är lätta att testa och läsa.

import { findGame } from '@/lib/games'
import {
  advanceCardReveal,
  cardDeadline,
  cardMove,
  cardPresence,
  startCardMatch,
  type CardGameRules,
  type CardHost,
  type CardMove,
  type CardSecrets,
  type CardTable,
} from '@/lib/kort'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'

// Antal rundor att välja mellan i gissningsspelen. Kortspelen har egna (roundOptionsFor).
export const ROUND_OPTIONS = [3, 5, 10] as const
const DEFAULT_ROUNDS = 5

// Så många rundor har en provomgång med en spelare (Testa själv).
export const PRACTICE_ROUNDS = 1

// Nedräkningen före en match: första starten (alla får se regeln) eller en revansch.
export type CountdownKind = 'first' | 'rematch'

export type Phase = 'waiting' | 'guessing' | 'reveal' | 'playing' | 'finished'

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
  // Hur många millisekunder in i rundan varje spelare svarade. Saknas för svar utan tid (och i äldre sparade matcher).
  times?: Record<string, number>
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
  // Lobbyns valda antal rundor medan en provomgång (som bara har PRACTICE_ROUNDS) pågår, så att det kommer tillbaka.
  savedRounds: number | null
  round: number
  // Tidpunkt (värdens klocka, ms) då gissningen eller visningen tar slut.
  // null under facit när värden går vidare själv.
  deadline: number | null
  // Värden har pausat facit: namnet och hur lång tid som var kvar (ms). null = inte pausat.
  pause: { by: string; msLeft: number } | null
  guesses: Record<string, number>
  // När i rundan (ms efter start) varje gissning kom in.
  guessTimes: Record<string, number>
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
  // Revansch: när matchen startar av sig själv (värdens klocka, ms). null = ingen revansch på väg.
  rematchAt: number | null
  // Värden har tryckt Byt spel och väljer nästa spel. De andra ser det tills värden väljer eller startar.
  choosingGame: boolean
  // Ett meddelande till gruppen i väntrummet, t.ex. att en match avbröts när värden lämnade. Försvinner när en match startar.
  notice: string | null
  // Vad nedräkningen gäller: matchens första start eller en revansch.
  countdownKind: CountdownKind
  matchesPlayed: number
  // Antal spelade matcher per spel, t.ex. { narmast: 2, 'gissa-priset': 1 }.
  gamesPlayed: Record<string, number>
  leaderboard: Record<string, LeaderboardEntry>
  // Kortspelen: det alla får se av rundan. null i gissningsspelen.
  cards: CardTable | null
}

// Värdens tillstånd: det som skickas ut till alla, och kortspelens hemliga data.
export type HostState = {
  state: GameState
  secrets: CardSecrets | null
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
    rounds: defaultRoundsFor(game),
    savedRounds: null,
    round: 0,
    deadline: null,
    pause: null,
    guesses: {},
    guessTimes: {},
    scores: {},
    players: {},
    lastResult: null,
    matchRounds: [],
    itemId: null,
    usedItemIds: [],
    guessSeconds: rulesFor('gissa-priset').guessSeconds,
    autoAdvance: true,
    practice: false,
    rematchAt: null,
    countdownKind: 'rematch',
    choosingGame: false,
    notice: null,
    matchesPlayed: 0,
    gamesPlayed: {},
    leaderboard: {},
    cards: null,
  }
}

export function roundOptionsFor(game: string): readonly number[] {
  return cardRulesFor(game)?.roundOptions ?? ROUND_OPTIONS
}

export function defaultRoundsFor(game: string): number {
  return cardRulesFor(game)?.defaultRounds ?? DEFAULT_ROUNDS
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
    pause: null,
    guesses: {},
    guessTimes: {},
  }
}

export function setRounds(state: GameState, rounds: number): GameState {
  if (state.phase !== 'waiting') return state
  return { ...state, rounds }
}

// Byter spel i väntrummet. Tempo och topplistan följer med, och antalet rundor om det nya spelet har
// samma val att välja mellan. Annars blir det spelets förval.
export function setGame(state: GameState, game: string): GameState {
  if (state.phase !== 'waiting') return state
  if (state.game === game) return state.choosingGame ? { ...state, choosingGame: false } : state
  const sameOptions = roundOptionsFor(game).join() === roundOptionsFor(state.game).join()
  return { ...state, game, choosingGame: false, rounds: sameOptions ? state.rounds : defaultRoundsFor(game) }
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
  const ready = matchPlayers(state, onlineIds)
  return ready ? startRound(ready, 1, now) : state
}

// Ny match: bara de som är med just nu, alla börjar på noll. null om matchen inte kan starta.
function matchPlayers(state: GameState, onlineIds: string[]): GameState | null {
  if (state.phase !== 'waiting') return null
  const players: Record<string, PlayerInfo> = {}
  const scores: Record<string, number> = {}
  for (const id of onlineIds) {
    if (state.players[id]) {
      players[id] = state.players[id]
      scores[id] = 0
    }
  }
  const count = Object.keys(players).length
  if (!canStart(state.game, count)) return null
  const practice = count === 1
  // En provomgång är kort. Lobbyns inställning sparas och kommer tillbaka i väntrummet.
  const rounds = practice ? PRACTICE_ROUNDS : (state.savedRounds ?? state.rounds)
  const savedRounds = practice ? (state.savedRounds ?? state.rounds) : null
  return {
    ...state,
    rounds,
    savedRounds,
    scores,
    players,
    lastResult: null,
    matchRounds: [],
    practice,
    rematchAt: null,
    choosingGame: false,
    notice: null,
  }
}

export function isValidGuess(game: string, value: number): boolean {
  return rulesFor(game).isValidGuess(value)
}

// now = när gissningen kom in (värdens klocka). Med den sparas också hur snabbt spelaren svarade.
export function addGuess(state: GameState, playerId: string, value: number, now?: number): GameState {
  if (state.phase !== 'guessing') return state
  if (!isValidGuess(state.game, value)) return state
  if (state.guesses[playerId] !== undefined) return state
  if (!state.players[playerId]) return state
  const next = { ...state, guesses: { ...state.guesses, [playerId]: value } }
  if (now === undefined || state.deadline === null) return next
  const elapsed = Math.max(0, now - (state.deadline - guessSecondsFor(state) * 1000))
  return { ...next, guessTimes: { ...state.guessTimes, [playerId]: elapsed } }
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

  const result: RoundResult = { ...outcome, guesses: state.guesses, winners, itemId: state.itemId, times: state.guessTimes }
  return {
    ...state,
    phase: 'reveal',
    // Går värden vidare själv står facit kvar utan klocka.
    deadline: autoAdvanceFor(state) ? now + rules.revealSeconds * 1000 : null,
    pause: null,
    scores,
    lastResult: result,
    matchRounds: [...state.matchRounds, result],
  }
}

export function nextRound(state: GameState, now: number): GameState {
  if (state.phase !== 'reveal') return state
  if (state.round >= state.rounds) {
    return finishMatch({ ...state, phase: 'finished', deadline: null, pause: null })
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

// Värden pausar nedräkningen efter facit. round är rundan som visades, så att ett dubbeltryck eller ett
// tryck i en gammal vy aldrig pausar fel runda. Går bara när en nedräkning löper (inte redan pausad).
export function pauseReveal(state: GameState, now: number, round: number, by: string): GameState {
  if (state.phase !== 'reveal' || state.round !== round || state.deadline === null || state.pause) return state
  return { ...state, deadline: null, pause: { by, msLeft: Math.max(0, state.deadline - now) } }
}

// Värden fortsätter: nedräkningen går vidare med den tid som var kvar.
export function resumeReveal(state: GameState, now: number, round: number): GameState {
  if (state.phase !== 'reveal' || state.round !== round || !state.pause) return state
  return { ...state, deadline: now + state.pause.msLeft, pause: null }
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

// Byt spel efter en match: tillbaka till väntrummet i samma lobby med spelvalet i bild. Gör ingenting om matchen
// inte är slut, så att ett dubbeltryck inte gör något extra.
export function changeGame(state: GameState): GameState {
  const waiting = backToWaiting(state)
  return waiting === state ? state : { ...waiting, choosingGame: true }
}

export function backToWaiting(state: GameState): GameState {
  if (state.phase !== 'finished') return state
  const scores: Record<string, number> = {}
  for (const id of Object.keys(state.players)) scores[id] = 0
  return {
    ...state,
    phase: 'waiting',
    rounds: state.savedRounds ?? state.rounds,
    savedRounds: null,
    round: 0,
    deadline: null,
    pause: null,
    guesses: {},
    guessTimes: {},
    scores,
    lastResult: null,
    matchRounds: [],
    itemId: null,
    practice: false,
    rematchAt: null,
    choosingGame: false,
    notice: null,
    cards: null,
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

// Ungefär var man ligger, utan exakt placering. Ingen får se "sist av fyra" mitt i matchen.
export type StandingKind = 'none' | 'leader' | 'shared' | 'close' | 'last' | 'top' | 'middle'

export type RoundStanding = {
  kind: StandingKind
  // Gick upp minst en placering i rundan. Aldrig i första rundan, då alla stod på noll.
  climbed: boolean
  // Nästa runda är den sista och toppen ligger inom en rundas poäng.
  decider: boolean
  // De som leder matchen efter rundan (flera vid lika poäng). Tom om ingen har poäng än.
  leaderIds: string[]
}

// Var en spelare står i matchen efter facit, och hur det ändrades av rundan.
// Skiljer matchledaren från rundans vinnare (lastResult.winners).
export function roundStanding(state: GameState, playerId: string): RoundStanding | null {
  const result = state.lastResult
  if (!result || !state.players[playerId]) return null
  const ids = Object.keys(state.players)
  const after = (id: string) => state.scores[id] ?? 0
  const before = (id: string) => after(id) - (result.points[id] ?? 0)
  const placeOf = (score: (id: string) => number) => 1 + ids.filter((id) => score(id) > score(playerId)).length
  const scores = ids.map(after).sort((a, b) => b - a)
  const best = Math.max(0, scores[0] ?? 0)
  const leaderIds = best > 0 ? ids.filter((id) => after(id) === best) : []
  // "Nära" = högst så mycket som någon fått i en enda runda hittills (1 i Närmast vinner, upp till 100 i Gissa priset).
  const roundMax = Math.max(1, ...[...state.matchRounds, result].flatMap((round) => Object.values(round.points)))
  const place = placeOf(after)
  const gap = best - after(playerId)

  let kind: StandingKind
  if (leaderIds.length === 0) kind = 'none'
  else if (leaderIds.includes(playerId)) kind = leaderIds.length === 1 ? 'leader' : 'shared'
  else if (gap <= roundMax) kind = 'close'
  else if (after(playerId) === scores[scores.length - 1]) kind = 'last'
  else kind = place <= Math.ceil(ids.length / 2) ? 'top' : 'middle'

  return {
    kind,
    climbed: state.round > 1 && place < placeOf(before),
    decider: state.round === state.rounds - 1 && best > 0 && best - (scores[1] ?? 0) <= roundMax,
    leaderIds,
  }
}

// Hur stor del av vinnarens poäng en spelare har (0–1), för stapelhöjden på prispallen.
// Lika poäng ger samma andel. Har ingen poäng blir alla staplar lika höga.
export function podiumShare(score: number, best: number): number {
  if (best <= 0) return 1
  return Math.min(1, Math.max(0, score / best))
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

// Värdens funktioner för alla spel. Gissningsspelen går vidare till funktionerna ovan precis som
// förut. Kortspelen följer kort.ts. activeIds = spelarna som är med (online eller nyss tappat nätet).

type Random = () => number

// Kör ett steg i ett kortspel. Tar matchen slut läggs den in i topplistan och hemligheterna släpps.
function withCards(host: HostState, step: (host: CardHost, rules: CardGameRules) => CardHost): HostState {
  const rules = cardRulesFor(host.state.game)
  if (!rules || !host.secrets || host.state.phase !== 'playing') return host
  const next = step({ state: host.state, secrets: host.secrets }, rules)
  if (next.state === host.state && next.secrets === host.secrets) return host
  if (next.state.phase === 'finished') return { state: finishMatch(next.state), secrets: null }
  return next
}

export function hostStart(host: HostState, onlineIds: string[], now: number, random: Random = Math.random): HostState {
  const rules = cardRulesFor(host.state.game)
  if (!rules) {
    const state = startGame(host.state, onlineIds, now)
    return state === host.state ? host : { state, secrets: null }
  }
  const ready = matchPlayers(host.state, onlineIds)
  return ready ? startCardMatch(ready, rules, now, random) : host
}

// Tiden för den gemensamma nedräkningen före en revansch.
export const REMATCH_SECONDS = 3

// Revansch: tillbaka till väntrummet med samma spel och samma inställningar, och en nedräkning som alla ser.
// Gör ingenting om matchen inte är slut, så ett dubbelklick startar inte två gånger.
// Värden kan ändra inställningarna på resultatsidan. De gäller den nya matchen och ogiltiga val ignoreras.
export type RematchSettings = { rounds?: number; guessSeconds?: number; autoAdvance?: boolean }

export function hostRematch(host: HostState, now: number, settings: RematchSettings = {}): HostState {
  let state = backToWaiting(host.state)
  if (state === host.state) return host
  if (settings.rounds !== undefined && roundOptionsFor(state.game).includes(settings.rounds)) {
    state = setRounds(state, settings.rounds)
  }
  state = setTempo(state, settings)
  return { state: { ...state, rematchAt: now + REMATCH_SECONDS * 1000, countdownKind: 'rematch' }, secrets: null }
}

// Första starten: värden trycker Starta och alla ser en gemensam nedräkning med en kort regel innan rundan börjar.
// Gör ingenting om en nedräkning redan pågår (dubbelklick) eller om för få är med.
export function hostCountdownStart(host: HostState, onlineIds: string[], now: number): HostState {
  const { state } = host
  if (state.phase !== 'waiting' || state.rematchAt !== null) return host
  if (!canStart(state.game, onlineIds.filter((id) => state.players[id]).length)) return host
  return {
    ...host,
    state: { ...state, rematchAt: now + REMATCH_SECONDS * 1000, countdownKind: 'first', choosingGame: false },
  }
}

export function cancelRematch(host: HostState): HostState {
  if (host.state.rematchAt === null) return host
  return { ...host, state: { ...host.state, rematchAt: null } }
}

// Nedräkningen är slut: starta matchen. Går den inte att starta (för få spelare är kvar) avbryts revanschen.
// Gäller bara om klockan som löpte ut (at) fortfarande är den som gäller, så att en gammal timer aldrig startar något.
export function hostRematchStart(
  host: HostState,
  onlineIds: string[],
  now: number,
  at: number,
  random: Random = Math.random,
): HostState {
  if (host.state.phase !== 'waiting' || host.state.rematchAt !== at || now < at) return host
  const started = hostStart(host, onlineIds, now, random)
  return started === host ? cancelRematch(host) : started
}

export function hostDeadline(
  host: HostState,
  now: number,
  deadline: number,
  activeIds: string[],
  random: Random = Math.random,
): HostState {
  if (host.state.phase === 'playing') {
    return withCards(host, (cards, rules) => cardDeadline(cards, rules, now, deadline, activeIds, random))
  }
  const state = handleDeadline(host.state, now, deadline)
  return state === host.state ? host : { ...host, state }
}

export function hostAdvance(host: HostState, now: number, round: number, activeIds: string[]): HostState {
  if (host.state.phase === 'playing') {
    return withCards(host, (cards, rules) => advanceCardReveal(cards, rules, now, round, activeIds))
  }
  const state = advanceFromReveal(host.state, now, round)
  return state === host.state ? host : { ...host, state }
}

export function hostMove(
  host: HostState,
  playerId: string,
  move: CardMove,
  activeIds: string[],
  now: number,
  random: Random = Math.random,
): HostState {
  return withCards(host, (cards, rules) => cardMove(cards, rules, playerId, move, activeIds, now, random))
}

export function hostPresence(host: HostState, activeIds: string[], now: number, random: Random = Math.random): HostState {
  return withCards(host, (cards, rules) => cardPresence(cards, rules, activeIds, now, random))
}

// Värdens sparade lobby efter en omladdning (se saveHostLobby). Fält som inte fanns när den sparades
// får sina startvärden. null om datan är trasig, eller om ett kortspel saknar sin hemliga data.
export function restoreHostState(saved: unknown): HostState | null {
  if (!saved || typeof saved !== 'object') return null
  const { state, secrets } = saved as Partial<HostState>
  if (!state || typeof state.phase !== 'string' || typeof state.game !== 'string') return null
  const restored: GameState = { ...initialState(state.game), ...state }
  if (restored.phase === 'playing' && !secrets) return null
  return { state: restored, secrets: secrets ?? null }
}
