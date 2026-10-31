// Imposterjakten: alla utom en får samma hemliga ord. Impostern får inte ordet (i Normal bara en vag ledtråd) och
// måste smälta in. Alla ger ett ord var som hör ihop med det hemliga ordet, två varv, och sedan diskuterar och
// röstar gruppen (diskussionen och omröstningen kommer i nästa steg).
//
// Som i kortspelen ligger det hemliga (ordet, vem som är impostern och avvisade ord) i ImposterSecrets, som bara
// värden har och som aldrig skickas med det vanliga tillståndet. Varje spelare får sitt kort (myImposterCard) i ett
// eget meddelande. Det alla ser av omgången ligger i ImposterTable. Rena funktioner utan React eller Supabase.

import type { GameState } from '@/lib/match'
import words from '@/lib/imposterjakten.json'

export const IMPOSTER_GAME = 'imposterjakten'

// Ett ord i ordlistan. ledtrad = imposterns hjälpledtråd i Normal. godkanda = former som räknas som ordet (i
// kontrollen av ledtrådar och i sista gissningen). nara (ett närliggande ord) och svarighet (latt, mellan eller klurig)
// används inte än.
export type ImposterWord = {
  id: string
  ord: string
  kategori: string
  ledtrad: string
  nara: string
  godkanda: string[]
  svarighet: string
}

export const WORDS: readonly ImposterWord[] = words

// Kategorierna i den ordning de först förekommer i ordlistan.
export const CATEGORIES: readonly string[] = [...new Set(WORDS.map((word) => word.kategori))]

export function findWord(id: string): ImposterWord | undefined {
  return WORDS.find((word) => word.id === id)
}

// Förklaringen i väntrummet ("Så spelas det") och hur poängen räknas.
export const IMPOSTER_HOW_TO =
  'Alla utom en får samma hemliga ord. Impostern får inte ordet och måste smälta in. Ni ger ett ord var som hör ihop med det hemliga ordet, två varv. Sedan diskuterar ni och röstar fram vem ni tror är impostern.'

export const IMPOSTER_SCORING: string[] = [
  'Kommer impostern undan får den 2 poäng.',
  'Fångas impostern men gissar ordet rätt får den 1 poäng.',
  'Fångas impostern och gissar fel får alla oskyldiga 2 poäng.',
  'I Normal får impostern en vag ledtråd. I Svår får den ingenting.',
]

// När alla ord visats börjar listan om, men de senaste står kvar som använda (som i Gissa priset).
export const RECENT_AFTER_RESET = 20
export const ROUND_OPTIONS = [3, 5, 7] as const
export const DEFAULT_ROUNDS = 3
// Varje spelare ger ett ord per varv.
export const CLUE_ROUNDS = 2
export const MAX_CLUE_LENGTH = 30

// Värdens val i väntrummet. hard = Svår (impostern får ingen ledtråd). category = null för Blandat.
// aloud = associationerna sägs högt i stället för att skrivas i appen.
export type ImposterSettings = { hard: boolean; category: string | null; aloud: boolean }

export const DEFAULT_SETTINGS: ImposterSettings = { hard: false, category: null, aloud: false }

// Inställningarna i ord, för deltagarnas sammanfattning i väntrummet.
export function imposterSettingsSummary(settings: ImposterSettings): [string, string][] {
  return [
    ['Svårighet', settings.hard ? 'Svår' : 'Normal'],
    ['Kategori', settings.category ?? 'Blandat'],
    ['Associationer', settings.aloud ? 'Säg högt' : 'Skriv i appen'],
  ]
}

// kort: alla läser sitt kort. ledtradar: ett ord var i turordning, två varv. diskussion: allas ord syns kvar.
export type ImposterStep = 'kort' | 'ledtradar' | 'diskussion'

// En tur i ledtrådsvarven: ett skrivet ord, pass eller "sa sitt ord högt".
export type Clue = { player: string; kind: 'ord' | 'pass' | 'sagt'; word: string | null }

// Det alla får se av omgången. Inställningarna låses när matchen startar och följer med i tabellen.
export type ImposterTable = {
  step: ImposterStep
  // Turordningen (alla i omgången). Startspelaren slumpas och samma ordning gäller båda varven.
  order: string[]
  // Antal gjorda turer. Den som har tur är order[turn % order.length].
  turn: number
  clues: Clue[]
  // Vilka som tryckt Jag har läst. Bara antalet visas.
  read: string[]
  // Kategorin om värden valt en, annars null. Den syns för alla, även impostern.
  category: string | null
  hard: boolean
  aloud: boolean
}

// Det bara värden vet. rejected = när varje spelares senaste ord avvisades, så att bara den spelaren får beskedet.
export type ImposterSecrets = { kind: 'imposter'; wordId: string; imposter: string; rejected: Record<string, number> }

export type ImposterCard =
  | { role: 'oskyldig'; word: string; category: string | null }
  | { role: 'imposter'; hint: string | null; category: string | null }

// Det en spelare får veta: sitt kort (null = inte med i omgången) och när ens senaste ord avvisades.
export type MyImposterCard = { card: ImposterCard | null; rejectedAt: number | null }

export type ImposterMove = { type: 'read' } | { type: 'clue'; word: string } | { type: 'pass' } | { type: 'said' }

export type ImposterHost = { state: GameState; secrets: ImposterSecrets }

type Random = () => number

export function isImposterSecrets(secrets: unknown): secrets is ImposterSecrets {
  return typeof secrets === 'object' && secrets !== null && (secrets as { kind?: unknown }).kind === 'imposter'
}

export function isImposterMove(move: { type: string }): move is ImposterMove {
  return ['read', 'clue', 'pass', 'said'].includes(move.type)
}

// Ord jämförs utan hänsyn till stora och små bokstäver och onödiga mellanslag. Å, ä och ö skiljs åt.
export function normalizeWord(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')
}

// Ett slumpat ord som inte visats än (i kategorin om värden valt en). Är alla använda börjar listan om, men de
// senaste RECENT_AFTER_RESET står kvar som använda. usedWordIds = listan efter en eventuell omstart, utan det nya ordet
// (det läggs till när omgången är slut, så att det aldrig syns i tillståndet medan det är hemligt).
export function pickWord(
  usedWordIds: readonly string[],
  category: string | null,
  random: Random = Math.random,
): { wordId: string; usedWordIds: string[] } {
  const pool = WORDS.filter((word) => category === null || word.kategori === category)
  const list = pool.length > 0 ? pool : WORDS
  let used = [...usedWordIds]
  let unused = list.filter((word) => !used.includes(word.id))
  if (unused.length === 0) {
    used = used.slice(-RECENT_AFTER_RESET)
    unused = list.filter((word) => !used.includes(word.id))
    // Kategorin har färre ord än spärren: allt utom det senaste ordet går bra.
    if (unused.length === 0) unused = list.filter((word) => word.id !== used.at(-1))
    if (unused.length === 0) unused = [...list]
  }
  return { wordId: unused[Math.floor(random() * unused.length)].id, usedWordIds: used }
}

// Delar ut en omgång: ett ord, exakt en imposter och en turordning med slumpad startspelare.
export function dealRound(
  players: readonly string[],
  settings: ImposterSettings,
  usedWordIds: readonly string[],
  random: Random = Math.random,
): { table: ImposterTable; secrets: ImposterSecrets; usedWordIds: string[] } {
  const picked = pickWord(usedWordIds, settings.category, random)
  const imposter = players[Math.floor(random() * players.length)]
  const start = Math.floor(random() * players.length)
  const order = [...players.slice(start), ...players.slice(0, start)]
  return {
    table: {
      step: 'kort',
      order,
      turn: 0,
      clues: [],
      read: [],
      category: settings.category,
      hard: settings.hard,
      aloud: settings.aloud,
    },
    secrets: { kind: 'imposter', wordId: picked.wordId, imposter, rejected: {} },
    usedWordIds: picked.usedWordIds,
  }
}

// Kortet för en spelare. Oskyldiga får ordet. Impostern får ledtråden i Normal och ingenting i Svår.
// Kategorin syns för alla bara om värden valt en. null om spelaren inte är med i omgången.
export function cardFor(secrets: ImposterSecrets, table: ImposterTable, playerId: string): ImposterCard | null {
  if (!table.order.includes(playerId)) return null
  const word = findWord(secrets.wordId)
  if (!word) return null
  if (playerId === secrets.imposter) {
    return { role: 'imposter', hint: table.hard ? null : word.ledtrad, category: table.category }
  }
  return { role: 'oskyldig', word: word.ord, category: table.category }
}

export function myImposterCard(secrets: ImposterSecrets, table: ImposterTable, playerId: string): MyImposterCard {
  return { card: cardFor(secrets, table, playerId), rejectedAt: secrets.rejected[playerId] ?? null }
}

export function totalTurns(table: ImposterTable): number {
  return table.order.length * CLUE_ROUNDS
}

// Den som har tur just nu, eller null när varven är klara.
export function currentTurn(table: ImposterTable): string | null {
  if (table.step !== 'ledtradar' || table.turn >= totalTurns(table)) return null
  return table.order[table.turn % table.order.length]
}

// Vilket varv (1 eller 2) som pågår.
export function clueRound(table: ImposterTable): number {
  return Math.min(CLUE_ROUNDS, Math.floor(table.turn / Math.max(1, table.order.length)) + 1)
}

// Kontroll av ett skrivet ord: exakt ett ord (sammansatta ord är okej), inte det hemliga ordet, en godkänd form av
// det eller något som innehåller det, och inte ett ord som redan sagts i omgången.
export function checkClue(
  text: string,
  word: ImposterWord,
  earlier: readonly Clue[],
): { ok: true; word: string } | { ok: false } {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > MAX_CLUE_LENGTH || !/^[\p{L}\p{N}-]+$/u.test(trimmed)) return { ok: false }
  const normalized = normalizeWord(trimmed)
  const forms = [word.ord, ...word.godkanda].map(normalizeWord)
  if (forms.some((form) => normalized.includes(form))) return { ok: false }
  if (earlier.some((clue) => clue.word !== null && normalizeWord(clue.word) === normalized)) return { ok: false }
  return { ok: true, word: trimmed }
}

// Ny match: inställningarna låses och första omgången delas ut. state har redan matchens spelare och rundor.
export function startImposterMatch(state: GameState, random: Random = Math.random): ImposterHost {
  return startImposterRound(state, 1, Object.keys(state.players), random)
}

function startImposterRound(state: GameState, round: number, players: readonly string[], random: Random): ImposterHost {
  const dealt = dealRound(players, state.imposterSettings, state.usedWordIds, random)
  return {
    state: { ...state, phase: 'playing', round, deadline: null, imposter: dealt.table, usedWordIds: dealt.usedWordIds },
    secrets: dealt.secrets,
  }
}

// Ordet har visats och räknas som använt.
function markUsed(state: GameState, secrets: ImposterSecrets): GameState {
  return { ...state, usedWordIds: [...state.usedWordIds.filter((id) => id !== secrets.wordId), secrets.wordId] }
}

function withTable(host: ImposterHost, table: ImposterTable): ImposterHost {
  return { ...host, state: { ...host.state, imposter: table } }
}

// Har alla i omgången som är kvar läst sitt kort?
function everyoneRead(table: ImposterTable, activeIds: readonly string[]): boolean {
  const present = table.order.filter((id) => activeIds.includes(id))
  return present.length > 0 && present.every((id) => table.read.includes(id))
}

function toClues(host: ImposterHost): ImposterHost {
  const table = host.state.imposter!
  return withTable(host, { ...table, step: 'ledtradar' })
}

// En tur är gjord. Efter sista turen i andra varvet börjar diskussionen.
function addClue(host: ImposterHost, clue: Clue): ImposterHost {
  const table = host.state.imposter!
  const turn = table.turn + 1
  const step: ImposterStep = turn >= totalTurns(table) ? 'diskussion' : 'ledtradar'
  return withTable(host, { ...table, turn, step, clues: [...table.clues, clue] })
}

// Ett drag från en spelare. Fel drag vid fel tillfälle ignoreras.
export function imposterMove(
  host: ImposterHost,
  playerId: string,
  move: ImposterMove,
  activeIds: readonly string[],
  now: number,
): ImposterHost {
  const table = host.state.imposter
  if (host.state.phase !== 'playing' || !table || !table.order.includes(playerId)) return host

  if (move.type === 'read') {
    if (table.step !== 'kort' || table.read.includes(playerId)) return host
    const next = withTable(host, { ...table, read: [...table.read, playerId] })
    return everyoneRead(next.state.imposter!, activeIds) ? toClues(next) : next
  }

  if (currentTurn(table) !== playerId) return host
  if (move.type === 'said') return table.aloud ? addClue(host, { player: playerId, kind: 'sagt', word: null }) : host
  if (table.aloud) return host
  if (move.type === 'pass') return addClue(host, { player: playerId, kind: 'pass', word: null })

  const word = findWord(host.secrets.wordId)
  const checked = word ? checkClue(move.word, word, table.clues) : { ok: false as const }
  if (!checked.ok) {
    return { ...host, secrets: { ...host.secrets, rejected: { ...host.secrets.rejected, [playerId]: now } } }
  }
  return addClue(host, { player: playerId, kind: 'ord', word: checked.word })
}

// Värden: alla har inte tryckt Jag har läst, men omgången går vidare ändå.
export function imposterStartAnyway(host: ImposterHost): ImposterHost {
  const table = host.state.imposter
  if (host.state.phase !== 'playing' || table?.step !== 'kort') return host
  return toClues(host)
}

// Kan värden dela ut ett nytt ord? Bara innan första associationen.
export function canChangeWord(table: ImposterTable | null): boolean {
  return table !== null && (table.step === 'kort' || (table.step === 'ledtradar' && table.turn === 0))
}

// Värden: någon förstod inte ordet. Ord, imposter och turordning delas ut på nytt, och alla läser sitt nya kort.
export function imposterNewWord(host: ImposterHost, activeIds: readonly string[], random: Random = Math.random): ImposterHost {
  const { state, secrets } = host
  if (state.phase !== 'playing' || !canChangeWord(state.imposter)) return host
  const players = state.imposter!.order.filter((id) => activeIds.includes(id))
  return startImposterRound(markUsed(state, secrets), state.round, players.length > 0 ? players : state.imposter!.order, random)
}

// Värden går vidare till nästa omgång efter diskussionen, eller avslutar matchen efter sista omgången.
// Nya spelare som väntat är med från nästa omgång.
export function imposterNextRound(host: ImposterHost, activeIds: readonly string[], random: Random = Math.random): ImposterHost {
  const { state, secrets } = host
  if (state.phase !== 'playing' || state.imposter?.step !== 'diskussion') return host
  const used = markUsed(state, secrets)
  if (state.round >= state.rounds) return { ...host, state: { ...used, phase: 'finished', deadline: null } }
  const players = Object.keys(state.players).filter((id) => activeIds.includes(id))
  return startImposterRound(used, state.round + 1, players, random)
}

// Någon har kommit eller gått. Har alla som är kvar läst sitt kort går omgången vidare.
export function imposterPresence(host: ImposterHost, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter
  if (host.state.phase !== 'playing' || table?.step !== 'kort') return host
  return everyoneRead(table, activeIds) ? toClues(host) : host
}
