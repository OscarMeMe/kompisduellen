// Imposterjakten: alla utom en får samma hemliga ord. Impostern får inte ordet (i Normal bara en vag ledtråd) och
// måste smälta in. Alla ger ett ord var som hör ihop med det hemliga ordet, två varv. Sedan diskuterar gruppen, och när
// mer än hälften är redo börjar en nedräkning till omröstningen. Fångas impostern får den gissa ordet. Facit visar
// ordet, impostern, allas röster och poängen.
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
export const ROUND_OPTIONS = [1, 2, 3] as const
export const DEFAULT_ROUNDS = 3
// Varje spelare ger ett ord per varv.
export const CLUE_ROUNDS = 2
export const MAX_CLUE_LENGTH = 30
// Nedräkningen till omröstningen när mer än hälften är redo.
export const COUNTDOWN_SECONDS = 30

// Värdens val i väntrummet. hard = Svår (impostern får ingen ledtråd). category = null för Blandat.
// aloud = ni sitter tillsammans och säger orden högt, i stället för att skriva dem i appen.
export type ImposterSettings = { hard: boolean; category: string | null; aloud: boolean }

export const DEFAULT_SETTINGS: ImposterSettings = { hard: false, category: null, aloud: false }

// Inställningarna i ord, för deltagarnas sammanfattning i väntrummet.
export function imposterSettingsSummary(settings: ImposterSettings): [string, string][] {
  return [
    ['Svårighet', settings.hard ? 'Svår' : 'Normal'],
    ['Kategori', settings.category ?? 'Blandat'],
    ['Sitter ni tillsammans?', settings.aloud ? 'Ja, vi säger orden högt' : 'Nej, vi skriver orden'],
  ]
}

// kort: alla läser sitt kort. ledtradar: ett ord var i turordning, två varv. diskussion: allas ord syns kvar och man
// markerar när man är redo att rösta. rostning: hemlig omröstning. gissning: impostern är fast och gissar ordet.
// facit: ordet, impostern, rösterna och poängen.
export type ImposterStep = 'kort' | 'ledtradar' | 'diskussion' | 'rostning' | 'gissning' | 'facit'

// Hur omgången slutade. undan: en oskyldig fick flest röster (eller lika röster två gånger). gissade-ratt och
// gissade-fel: impostern fångades och gissade. gav-upp: impostern fångades och gav upp. avbruten: inga poäng.
export type OutcomeKind = 'undan' | 'gissade-ratt' | 'gissade-fel' | 'gav-upp' | 'avbruten'

// Facit för en omgång. Ordet och impostern blir offentliga först här. hint = ledtråden i Normal. points = poängen för
// omgången (bara de som fick poäng). reason = varför omgången avbröts.
export type ImposterOutcome = {
  kind: OutcomeKind
  word: string
  imposter: string
  hint: string | null
  guess: string | null
  points: Record<string, number>
  reason: string | null
}

// En tur i ledtrådsvarven: ett skrivet ord, pass eller "sa sitt ord högt" (då kan ordet också vara inskrivet).
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
  // Hur många som är redo att rösta och hur många som har röstat. Vilka syns inte.
  readyCount: number
  votedCount: number
  // Nedräkningen till omröstningen har startat (bara en gång per omgång). Den slutar vid state.deadline.
  countdownStarted: boolean
  // Allas röster (vem → på vem), först när alla har röstat. null innan dess.
  votes: Record<string, string> | null
  // Efter lika röster: de lika placerade, de enda som går att rösta på i den extra omröstningen. null annars.
  tied: string[] | null
  // Rösterna från den första omröstningen när det blev lika, så att bordet kan visa dem innan den nya diskussionen.
  // Försvinner när den extra omröstningen öppnas.
  tieVotes: Record<string, string> | null
  // Peka ut (vem → på vem) under diskussionen. Offentligt och skilt från den hemliga omröstningen. Försvinner när
  // omröstningen öppnas.
  pointers: Record<string, string>
  // Impostern som fick flest röster och nu gissar ordet. null innan dess.
  caught: string | null
  outcome: ImposterOutcome | null
}

// Det bara värden vet. rejected = när varje spelares senaste ord avvisades, så att bara den spelaren får beskedet.
// ready = vilka som är redo att rösta. votes = rösterna innan de visas.
export type ImposterSecrets = {
  kind: 'imposter'
  wordId: string
  imposter: string
  rejected: Record<string, number>
  ready: string[]
  votes: Record<string, string>
}

export type ImposterCard =
  | { role: 'oskyldig'; word: string; category: string | null }
  | { role: 'imposter'; hint: string | null; category: string | null }

// Det en spelare får veta: sitt kort (null = inte med i omgången), när ens senaste ord avvisades, om man är redo att
// rösta och vem man har röstat på.
export type MyImposterCard = { card: ImposterCard | null; rejectedAt: number | null; ready: boolean; vote: string | null }

export type ImposterMove =
  | { type: 'read' }
  | { type: 'clue'; word: string }
  | { type: 'pass' }
  | { type: 'said'; word?: string }
  | { type: 'ready'; on: boolean }
  | { type: 'vote'; target: string }
  | { type: 'point'; target: string | null }
  | { type: 'guess'; word: string }
  | { type: 'giveUp' }

export type ImposterHost = { state: GameState; secrets: ImposterSecrets }

type Random = () => number

export function isImposterSecrets(secrets: unknown): secrets is ImposterSecrets {
  return typeof secrets === 'object' && secrets !== null && (secrets as { kind?: unknown }).kind === 'imposter'
}

export function isImposterMove(move: { type: string }): move is ImposterMove {
  return ['read', 'clue', 'pass', 'said', 'ready', 'vote', 'point', 'guess', 'giveUp'].includes(move.type)
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
      readyCount: 0,
      votedCount: 0,
      countdownStarted: false,
      votes: null,
      tied: null,
      tieVotes: null,
      pointers: {},
      caught: null,
      outcome: null,
    },
    secrets: { kind: 'imposter', wordId: picked.wordId, imposter, rejected: {}, ready: [], votes: {} },
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
  return {
    card: cardFor(secrets, table, playerId),
    rejectedAt: secrets.rejected[playerId] ?? null,
    ready: secrets.ready.includes(playerId),
    vote: secrets.votes[playerId] ?? null,
  }
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

// Hur en spärrad form jämförs med en ledtråd. anywhere: formen får inte finnas någonstans i ledtråden. start: ledtråden
// får inte vara formen eller börja med den. whole: ledtråden får bara inte vara exakt formen.
export type BlockRule = { form: string; how: 'anywhere' | 'start' | 'whole' }

// Kortare former än så här spärras inte var de än står.
const SHORT_FORM = 5

// Ett personnamn: flera ord som alla börjar med stor bokstav (Charlotte Kalla, Carl XVI Gustaf). Titlar som Allsång på
// Skansen och Beer pong räknas inte.
function isPersonName(ord: string): boolean {
  const parts = ord.trim().split(/\s+/)
  return parts.length > 1 && parts.every((part) => /^\p{Lu}/u.test(part))
}

// Former som en ledtråd inte får likna: ordet, de godkända formerna och varje del på minst 4 bokstäver i ett ord med
// mellanslag (så att "Skansen" spärras för Allsång på Skansen).
// - Former på minst 5 bokstäver spärras var de än står (fredagsafterwork för Afterwork).
// - Är själva ordet kort, som Torg, spärras dess korta former också i början av ledtråden (torgstånd, men inte storgata).
// - Övriga korta former, som förkortningar och smeknamn (ps, qr, bea), spärras bara som exakt samma ord.
// - Delar av personnamn och personens smeknamn (kalla, mede, håkan, carl) spärras bara som hela ord, så att kallare och
//   medeltid går igenom.
export function blockRules(word: ImposterWord): BlockRule[] {
  const ord = normalizeWord(word.ord)
  const shortWord = !ord.includes(' ') && ord.length < SHORT_FORM
  const person = isPersonName(word.ord)
  const forms = [...new Set([ord, ...word.godkanda.map(normalizeWord)])]
  const parts = forms.flatMap((form) => form.split(' ')).filter((part) => part.length >= 4 && !forms.includes(part))
  const rules = new Map<string, BlockRule['how']>()
  for (const form of [...forms, ...parts]) {
    const single = !form.includes(' ')
    let how: BlockRule['how']
    if (person && single) how = 'whole'
    else if (form.length >= SHORT_FORM) how = 'anywhere'
    else how = shortWord ? 'start' : 'whole'
    if (!rules.has(form)) rules.set(form, how)
  }
  return [...rules].map(([form, how]) => ({ form, how }))
}

function looksLike(clue: string, { form, how }: BlockRule): boolean {
  if (how === 'anywhere') return clue.includes(form)
  if (how === 'start') return clue.startsWith(form)
  return clue === form
}

// Kontroll av ett skrivet ord: exakt ett ord (sammansatta ord är okej), inte det hemliga ordet, en godkänd form av
// det eller något som liknar det (se blockRules), och inte ett ord som redan sagts i omgången.
export function checkClue(
  text: string,
  word: ImposterWord,
  earlier: readonly Clue[],
): { ok: true; word: string } | { ok: false } {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > MAX_CLUE_LENGTH || !/^[\p{L}\p{N}-]+$/u.test(trimmed)) return { ok: false }
  const normalized = normalizeWord(trimmed)
  if (blockRules(word).some((rule) => looksLike(normalized, rule))) return { ok: false }
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

// En tur är gjord. Efter sista turen i andra varvet börjar diskussionen. Turer för spelare som lämnat hoppas över.
function addClue(host: ImposterHost, clue: Clue, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter!
  const turn = table.turn + 1
  const step: ImposterStep = turn >= totalTurns(table) ? 'diskussion' : 'ledtradar'
  return skipAway(withTable(host, { ...table, turn, step, clues: [...table.clues, clue] }), activeIds)
}

// Hoppar över turer för spelare som lämnat omgången.
function skipAway(host: ImposterHost, activeIds: readonly string[]): ImposterHost {
  let table = host.state.imposter!
  let changed = false
  for (let turn = currentTurn(table); turn !== null && !activeIds.includes(turn); turn = currentTurn(table)) {
    const next = table.turn + 1
    table = { ...table, turn: next, step: next >= totalTurns(table) ? 'diskussion' : 'ledtradar' }
    changed = true
  }
  return changed ? withTable(host, table) : host
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
  if (move.type === 'ready') return markReady(host, playerId, move.on, activeIds, now)
  if (move.type === 'vote') return castVote(host, playerId, move.target, activeIds)
  if (move.type === 'point') return pointAt(host, playerId, move.target, activeIds)
  if (move.type === 'guess' || move.type === 'giveUp') {
    if (table.step !== 'gissning' || table.caught !== playerId) return host
    // Poängen går bara till dem som fortfarande är med i omgången.
    const scorers = present(table, activeIds)
    if (move.type === 'giveUp') return finishRound(host, 'gav-upp', null, null, scorers)
    const word = findWord(host.secrets.wordId)
    const guess = move.word.trim().replace(/\s+/g, ' ')
    if (!guess || !word) return host
    return finishRound(host, isCorrectGuess(guess, word) ? 'gissade-ratt' : 'gissade-fel', guess, null, scorers)
  }

  if (currentTurn(table) !== playerId) return host
  if (move.type === 'said') {
    if (!table.aloud) return host
    // Ordet är redan sagt, så turen går vidare även om det inskrivna ordet inte går att visa (t.ex. det hemliga ordet).
    const secret = findWord(host.secrets.wordId)
    const typed = move.word?.trim() && secret ? checkClue(move.word, secret, table.clues) : null
    return addClue(host, { player: playerId, kind: 'sagt', word: typed?.ok ? typed.word : null }, activeIds)
  }
  if (table.aloud) return host
  if (move.type === 'pass') return addClue(host, { player: playerId, kind: 'pass', word: null }, activeIds)

  const word = findWord(host.secrets.wordId)
  const checked = word ? checkClue(move.word, word, table.clues) : { ok: false as const }
  if (!checked.ok) {
    return { ...host, secrets: { ...host.secrets, rejected: { ...host.secrets.rejected, [playerId]: now } } }
  }
  return addClue(host, { player: playerId, kind: 'ord', word: checked.word }, activeIds)
}

// Värden, när ni säger orden högt: den som har tur har glömt att trycka Klar, så turen går vidare.
export function imposterSkipTurn(host: ImposterHost, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter
  const turn = table ? currentTurn(table) : null
  if (!table || !table.aloud || !turn) return host
  return addClue(host, { player: turn, kind: 'sagt', word: null }, activeIds)
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

// Spelarna i omgången som fortfarande är med.
function present(table: ImposterTable, activeIds: readonly string[]): string[] {
  return table.order.filter((id) => activeIds.includes(id))
}

// Startar en nedräkning? Bara när mer än hälften av spelarna i omgången är redo. Exakt hälften räcker inte.
export function moreThanHalf(count: number, players: number): boolean {
  return count * 2 > players
}

// Diskussionen: räkna redo-markeringarna. Är alla redo öppnas omröstningen direkt. Är mer än hälften redo startar
// nedräkningen, en gång per omgång.
function checkReady(host: ImposterHost, activeIds: readonly string[], now: number): ImposterHost {
  const table = host.state.imposter!
  const players = present(table, activeIds)
  const ready = host.secrets.ready.filter((id) => players.includes(id))
  const counted = withTable(host, { ...table, readyCount: ready.length })
  if (players.length > 0 && ready.length === players.length) return openVoting(counted)
  if (!table.countdownStarted && moreThanHalf(ready.length, players.length)) {
    return {
      ...counted,
      state: {
        ...counted.state,
        deadline: now + COUNTDOWN_SECONDS * 1000,
        imposter: { ...counted.state.imposter!, countdownStarted: true },
      },
    }
  }
  return counted
}

// Redo att rösta (on) eller inte. Under nedräkningen går det inte att ta tillbaka, men fler kan bli redo.
function markReady(host: ImposterHost, playerId: string, on: boolean, activeIds: readonly string[], now: number): ImposterHost {
  const table = host.state.imposter!
  if (table.step !== 'diskussion' || !activeIds.includes(playerId)) return host
  const has = host.secrets.ready.includes(playerId)
  if (has === on || (!on && table.countdownStarted)) return host
  const ready = on ? [...host.secrets.ready, playerId] : host.secrets.ready.filter((id) => id !== playerId)
  return checkReady({ ...host, secrets: { ...host.secrets, ready } }, activeIds, now)
}

// Peka ut under diskussionen: en pil från spelaren till en annan spelare i omgången, eller ingen (target null). Går att
// byta och ta bort när som helst fram till omröstningen.
function pointAt(host: ImposterHost, playerId: string, target: string | null, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter!
  if (table.step !== 'diskussion' || !activeIds.includes(playerId)) return host
  if (target !== null && (target === playerId || !table.order.includes(target) || !activeIds.includes(target))) return host
  if ((table.pointers[playerId] ?? null) === target) return host
  const pointers = { ...table.pointers }
  if (target === null) delete pointers[playerId]
  else pointers[playerId] = target
  return withTable(host, { ...table, pointers })
}

// Pilar från eller till någon som lämnat försvinner.
function keepPointers(table: ImposterTable, activeIds: readonly string[]): ImposterTable {
  const entries = Object.entries(table.pointers)
  const kept = entries.filter(([from, to]) => activeIds.includes(from) && activeIds.includes(to))
  return kept.length === entries.length ? table : { ...table, pointers: Object.fromEntries(kept) }
}

// Omröstningen öppnas. Pilarna och rösterna från en tidigare omröstning försvinner.
function openVoting(host: ImposterHost): ImposterHost {
  const table = host.state.imposter!
  return {
    ...host,
    state: { ...host.state, deadline: null, imposter: { ...table, step: 'rostning', votedCount: 0, pointers: {}, tieVotes: null } },
  }
}

// Omröstningen: en röst var på en annan spelare i omgången (efter lika röster bara på de lika placerade). En bekräftad
// röst går inte att ändra. När alla som är kvar har röstat räknas rösterna (se checkVotes).
function castVote(host: ImposterHost, voter: string, target: string, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter!
  const candidates = table.tied ?? table.order
  if (table.step !== 'rostning' || voter === target || !candidates.includes(target) || !activeIds.includes(target)) return host
  if (host.secrets.votes[voter] !== undefined) return host
  const votes = { ...host.secrets.votes, [voter]: target }
  return checkVotes({ ...host, secrets: { ...host.secrets, votes } }, activeIds)
}

// Har alla som är kvar röstat? Då visas rösterna. Ensamt flest röster på impostern: den får gissa ordet. Ensamt flest
// på en oskyldig: impostern kom undan. Lika första gången: en ny diskussion och en extra omröstning bara mellan de lika
// placerade. Lika igen: impostern kom undan.
function checkVotes(host: ImposterHost, activeIds: readonly string[]): ImposterHost {
  const table = host.state.imposter!
  const players = present(table, activeIds)
  const voted = players.filter((id) => host.secrets.votes[id] !== undefined)
  if (players.length === 0 || voted.length < players.length) return withTable(host, { ...table, votedCount: voted.length })

  const votes = Object.fromEntries(voted.map((id) => [id, host.secrets.votes[id]]))
  const { top } = tallyVotes(votes)
  const revealed = withTable(host, { ...table, votedCount: voted.length, votes })
  if (top.length === 1) {
    if (top[0] === host.secrets.imposter) return withTable(revealed, { ...revealed.state.imposter!, step: 'gissning', caught: top[0] })
    return finishRound(revealed, 'undan', null, null, players)
  }
  if (top.length > 1 && table.tied === null) {
    return {
      state: {
        ...host.state,
        deadline: null,
        imposter: {
          ...table,
          step: 'diskussion',
          tied: top,
          tieVotes: votes,
          readyCount: 0,
          votedCount: 0,
          countdownStarted: false,
          votes: null,
        },
      },
      secrets: { ...host.secrets, ready: [], votes: {} },
    }
  }
  return finishRound(revealed, 'undan', null, null, players)
}

// Rösterna ihop: hur många röster var och en fick, och vem eller vilka som fick flest (flera vid lika).
export function tallyVotes(votes: Record<string, string>): { counts: Record<string, number>; top: string[] } {
  const counts: Record<string, number> = {}
  for (const target of Object.values(votes)) counts[target] = (counts[target] ?? 0) + 1
  const most = Math.max(0, ...Object.values(counts))
  return { counts, top: most > 0 ? Object.keys(counts).filter((id) => counts[id] === most) : [] }
}

// Sista gissningen: rätt om den är ordet eller en godkänd form, utan hänsyn till stora och små bokstäver och onödiga
// mellanslag. Å, ä och ö skiljs åt. Det räcker inte att gissningen innehåller ordet.
export function isCorrectGuess(guess: string, word: ImposterWord): boolean {
  const normalized = normalizeWord(guess)
  return normalized.length > 0 && [word.ord, ...word.godkanda].map(normalizeWord).includes(normalized)
}

// Poängen för en omgång. Kommer impostern undan får den 2. Fångas den men gissar rätt får den 1. Gissar den fel eller
// ger upp får alla oskyldiga som är kvar i omgången 2. En avbruten omgång ger inga poäng.
export const IMPOSTER_ESCAPES = 2
export const IMPOSTER_GUESSES_RIGHT = 1
export const INNOCENTS_WIN = 2

export function roundPoints(kind: OutcomeKind, imposter: string, order: readonly string[]): Record<string, number> {
  if (kind === 'undan') return { [imposter]: IMPOSTER_ESCAPES }
  if (kind === 'gissade-ratt') return { [imposter]: IMPOSTER_GUESSES_RIGHT }
  if (kind === 'gissade-fel' || kind === 'gav-upp') {
    return Object.fromEntries(order.filter((id) => id !== imposter).map((id) => [id, INNOCENTS_WIN]))
  }
  return {}
}

// Omgången är slut: poängen läggs till och facit visas. Ordet räknas som använt. scorers = spelarna i omgången som
// fortfarande är med, så att den som lämnat inte får poäng.
function finishRound(
  host: ImposterHost,
  kind: OutcomeKind,
  guess: string | null,
  reason: string | null,
  scorers: readonly string[] = [],
): ImposterHost {
  const { state, secrets } = host
  const table = state.imposter!
  const word = findWord(secrets.wordId)
  const points = roundPoints(kind, secrets.imposter, scorers)
  const scores = { ...state.scores }
  for (const [id, gained] of Object.entries(points)) scores[id] = (scores[id] ?? 0) + gained
  const outcome: ImposterOutcome = {
    kind,
    word: word?.ord ?? '',
    imposter: secrets.imposter,
    hint: table.hard ? null : (word?.ledtrad ?? null),
    guess,
    points,
    reason,
  }
  return {
    ...host,
    state: { ...markUsed(state, secrets), scores, deadline: null, imposter: { ...table, step: 'facit', outcome } },
  }
}

// Värden avbryter omgången (Avbryt omgången): inga poäng, och omgången räknas inte.
export function imposterAbortRound(host: ImposterHost, reason = 'Värden avbröt omgången.'): ImposterHost {
  const table = host.state.imposter
  if (host.state.phase !== 'playing' || !table || table.step === 'facit') return host
  return finishRound(host, 'avbruten', null, reason)
}

// Värdens timer: nedräkningen är slut och omröstningen öppnas. Gör bara något om klockan som löpte ut fortfarande är
// den som gäller.
export function imposterDeadline(host: ImposterHost, now: number, deadline: number): ImposterHost {
  const { state } = host
  const table = state.imposter
  if (state.phase !== 'playing' || table?.step !== 'diskussion' || !table.countdownStarted) return host
  if (state.deadline !== deadline || now < deadline) return host
  return openVoting(host)
}

// Minst så många spelare behövs i en omgång.
export const MIN_PLAYERS = 3

// Kan värden starta en ny omgång efter facit? Det krävs minst tre spelare som är med.
export function canStartNextRound(state: GameState, activeIds: readonly string[]): boolean {
  return Object.keys(state.players).filter((id) => activeIds.includes(id)).length >= MIN_PLAYERS
}

// Värden går vidare efter facit: nästa omgång, eller prispallen efter sista omgången. En avbruten omgång räknas inte,
// så då kommer en ny omgång med samma nummer. Nya spelare som väntat är med från nästa omgång.
export function imposterNextRound(host: ImposterHost, activeIds: readonly string[], random: Random = Math.random): ImposterHost {
  const { state } = host
  const table = state.imposter
  if (state.phase !== 'playing' || table?.step !== 'facit') return host
  const completed = table.outcome?.kind === 'avbruten' ? state.round - 1 : state.round
  if (completed >= state.rounds) return { ...host, state: { ...state, phase: 'finished', deadline: null } }
  if (!canStartNextRound(state, activeIds)) return host
  const players = Object.keys(state.players).filter((id) => activeIds.includes(id))
  return startImposterRound(state, completed + 1, players, random)
}

// De lika placerade som är kvar. Är färre än två kvar blir det en vanlig omröstning igen.
function keepTied(table: ImposterTable, activeIds: readonly string[]): ImposterTable {
  if (!table.tied) return table
  const tied = table.tied.filter((id) => activeIds.includes(id))
  if (tied.length === table.tied.length) return table
  return { ...table, tied: tied.length >= 2 ? tied : null }
}

// Någon har kommit eller gått. Lämnar impostern, eller är färre än tre kvar i omgången, avbryts omgången utan poäng.
// Annars fortsätter den utan spelaren: turer hoppas över, trösklarna räknas om, spelarens röst stryks och den som röstat
// på spelaren får rösta om.
export function imposterPresence(host: ImposterHost, activeIds: readonly string[], now: number): ImposterHost {
  const table = host.state.imposter
  if (host.state.phase !== 'playing' || !table || table.step === 'facit') return host
  if (!activeIds.includes(host.secrets.imposter)) {
    return finishRound(host, 'avbruten', null, 'Omgången avbröts eftersom impostern lämnade.')
  }
  if (present(table, activeIds).length < MIN_PLAYERS) {
    return finishRound(host, 'avbruten', null, 'Omgången avbröts eftersom för få spelare är kvar.')
  }
  if (table.step === 'kort') return everyoneRead(table, activeIds) ? toClues(host) : host
  if (table.step === 'ledtradar') return skipAway(host, activeIds)
  if (table.step === 'diskussion') {
    const kept = keepPointers(keepTied(table, activeIds), activeIds)
    const next = checkReady(kept === table ? host : withTable(host, kept), activeIds, now)
    const same =
      kept === table &&
      next.state.imposter!.readyCount === table.readyCount &&
      next.state.imposter!.step === table.step &&
      next.state.deadline === host.state.deadline
    return same ? host : next
  }
  if (table.step === 'rostning') {
    const kept = keepTied(table, activeIds)
    const candidates = kept.tied ?? kept.order
    const votes = Object.fromEntries(
      Object.entries(host.secrets.votes).filter(([voter, target]) => activeIds.includes(voter) && candidates.includes(target) && activeIds.includes(target)),
    )
    const changed = kept !== table || Object.keys(votes).length !== Object.keys(host.secrets.votes).length
    const next = checkVotes({ state: { ...host.state, imposter: kept }, secrets: { ...host.secrets, votes } }, activeIds)
    const same = !changed && next.state.imposter!.votedCount === table.votedCount && next.state.imposter!.step === table.step
    return same ? host : next
  }
  return host
}
