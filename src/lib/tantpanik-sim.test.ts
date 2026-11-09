import { describe, expect, it } from 'vitest'
import { initialState, type GameState } from '@/lib/match'
import { botFallbackMove, botMustAct, botSight, decideBotMove, newBotMemory, observe, remember, type BotLevel, type BotMemory } from '@/lib/tantbot'
import {
  bombCount,
  countAllCards,
  levelFor,
  moveAllowed,
  startTantMatch,
  tantDeadline,
  tantMove,
  type TantHost,
  type TantLevel,
  type TantMove,
  type TantSecrets,
} from '@/lib/tantpanik'
import { trapCount, type CardType } from '@/lib/tantpanik-kort'

// Stort simuleringstest av Exploderande Tanter: många hela matcher med bara bottar, med kontroller efter varje steg.
// Varje match har ett eget slumpfrö (seed), så ett fel går att återskapa med samma frö. Antalet matcher kan ökas med
// miljövariabeln TANT_SIM (t.ex. TANT_SIM=10000 npx vitest run src/lib/tantpanik-sim.test.ts).

// Styrbar slump (mulberry32).
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const MATCHES = Number(env.TANT_SIM ?? 3240)
// Tak för antal steg i en match. En vanlig match tar några hundra.
const MAX_STEPS = 6000
const LEVELS: TantLevel[] = ['normal', 'svar', 'kaos']
const BOT_LEVELS: BotLevel[] = ['latt', 'normal', 'svar']

type Config = { players: number; level: TantLevel; trap: boolean; seed: number }

// Alla kombinationer av spelarantal, nivå och Tantsnara, om och om igen med nya frön tills MATCHES är nått.
function configs(): Config[] {
  const list: Config[] = []
  for (let seed = 1; list.length < MATCHES; seed++) {
    const players = 2 + (seed % 9)
    const level = LEVELS[Math.floor(seed / 9) % 3]
    const trap = Math.floor(seed / 27) % 2 === 0
    list.push({ players, level, trap, seed })
  }
  return list
}

// Alla kort i högen, händerna, slänghögen och de undanlagda, per typ.
function typeCounts(secrets: TantSecrets): Record<string, number> {
  const counts: Record<string, number> = {}
  const all = [
    ...secrets.deck,
    ...Object.values(secrets.hands).flat(),
    ...secrets.discard,
    ...secrets.removed,
    ...secrets.arranging,
    ...(secrets.bomb ? [secrets.bomb] : []),
  ]
  for (const card of all) counts[card.type] = (counts[card.type] ?? 0) + 1
  return counts
}

// Det som skickas till alla (läget) får inte innehålla några kort-id från högen eller någons hand.
function leaksSecrets(host: TantHost): string | null {
  const shown = JSON.stringify(host.state)
  for (const card of host.secrets.deck) if (shown.includes(card.id)) return `högens kort ${card.id}`
  for (const [id, hand] of Object.entries(host.secrets.hands)) for (const card of hand) if (shown.includes(card.id)) return `${id}s kort ${card.id}`
  // Bordet får inte ha något av värdens hemliga fält. (deck i loggens händelser är bara vad som hände med högen.)
  const secretKeys = ['deck', 'hands', 'pickOrder', 'arranging', 'bomb', 'peek', 'notices', 'drew', 'lost', 'handled']
  const leaked = secretKeys.find((key) => key in (host.state.tantpanik ?? {}) || key in host.state)
  if (leaked) return `fältet ${leaked}`
  return null
}

type Expected = { moves: number; hidden: number; stolen: number; nopes: Record<string, number>; steals: Record<string, number>; defuses: Record<string, number> }
const bump = (record: Record<string, number>, id: string) => (record[id] = (record[id] ?? 0) + 1)

export type SimResult = { steps: number; fallbacks: number; maxWindow: number; nopeChains: number }

// Spelar en hel match och kontrollerar allt efter varje steg. Kastar ett fel med fröet om något inte stämmer.
function simulate({ players, level, trap, seed }: Config): SimResult {
  const random = seeded(seed)
  const ids = Array.from({ length: players }, (_, i) => `b${i}`)
  const bots: Record<string, BotLevel> = Object.fromEntries(ids.map((id) => [id, BOT_LEVELS[Math.floor(random() * 3)]]))
  const lobby: GameState = {
    ...initialState('tantpanik'),
    players: Object.fromEntries(ids.map((id) => [id, { name: id, avatar: '🙂', bot: bots[id] }])),
    tantSettings: { trap, level },
  }
  let host = startTantMatch(lobby, random)
  const fail = (text: string) => {
    throw new Error(`frö ${seed} (${players} spelare, ${level}, snara ${trap ? 'på' : 'av'}): ${text}`)
  }
  const total = countAllCards(host.secrets)
  const startTypes = typeCounts(host.secrets)
  const expectedBombs = bombCount(players, levelFor(level, players))
  const expectedTraps = trap ? trapCount(players) : 0
  if ((startTypes.tant ?? 0) !== expectedBombs) fail(`${startTypes.tant} tanter, väntade ${expectedBombs}`)
  if ((startTypes.snara ?? 0) !== expectedTraps) fail(`${startTypes.snara ?? 0} snaror, väntade ${expectedTraps}`)

  const expected: Expected = { moves: 0, hidden: 0, stolen: 0, nopes: {}, steals: {}, defuses: {} }
  const memories: Record<string, BotMemory> = {}
  let lastSeenAction = 0
  let fallbacks = 0
  let windowSteps = 0
  let maxWindow = 0
  let nopeChains = 0
  let now = 1000

  // Efter varje ändring: det som hänt, för att jämföra med slutskärmens siffror.
  const record = (before: TantHost, after: TantHost) => {
    const action = after.state.tantpanik!.lastAction
    if (!action || action.n === lastSeenAction) return
    lastSeenAction = action.n
    if (action.kind === 'bomb' && action.saved) bump(expected.defuses, action.player)
    if (action.kind === 'take') {
      const drew = after.secrets.drew[action.player]
      if (drew?.n === action.n && !drew.gift) {
        expected.stolen++
        bump(expected.steals, action.player)
      }
    }
    void before
  }

  // Kontrollerna efter varje steg.
  const check = (step: number) => {
    const table = host.state.tantpanik!
    if (countAllCards(host.secrets) !== total) fail(`steg ${step}: ${countAllCards(host.secrets)} kort, väntade ${total}`)
    const types = typeCounts(host.secrets)
    for (const type of ['tant', 'snara'] as CardType[]) {
      if ((types[type] ?? 0) !== (startTypes[type] ?? 0)) fail(`steg ${step}: antalet ${type} ändrades`)
    }
    if (table.error) fail(`steg ${step}: ${table.error}`)
    if (!table.winner) {
      if (!table.order.includes(table.current)) fail(`steg ${step}: ${table.current} har tur men är inte med`)
      if (table.out.includes(table.current)) fail(`steg ${step}: ${table.current} har tur men är ute`)
      if (table.turnsLeft < 1) fail(`steg ${step}: ${table.turnsLeft} turer kvar`)
    }
    if (table.deckCount !== host.secrets.deck.length + host.secrets.arranging.length) fail(`steg ${step}: deckCount stämmer inte`)
    for (const id of table.order) if ((table.handCounts[id] ?? 0) !== (host.secrets.hands[id]?.length ?? 0)) fail(`steg ${step}: handCounts för ${id}`)
    for (const id of table.out) if ((host.secrets.hands[id]?.length ?? 0) !== 0) fail(`steg ${step}: ${id} är ute men har kort`)
    if (step % 5 === 0) {
      const leak = leaksSecrets(host)
      if (leak) fail(`steg ${step}: läget visar ${leak}`)
    }
  }

  const apply = (id: string, move: TantMove): boolean => {
    const before = host
    const beforeTable = JSON.stringify(before.state.tantpanik)
    const allowed = moveAllowed(before.state.tantpanik!, id, move)
    now += 500
    const next = tantMove(before, id, move, null, now, random)
    const changed = JSON.stringify(next.state.tantpanik) !== beforeTable || next.state.phase !== before.state.phase
    if (changed && move.type !== 'tFinish') {
      if (!allowed) fail(`${id} fick göra ${move.type} trots att moveAllowed nekade`)
      if (before.state.tantpanik!.out.includes(id)) fail(`${id} är ute men fick göra ${move.type}`)
      expected.moves++
      if (move.type === 'tNope') bump(expected.nopes, id)
      if (move.type === 'tPlace') expected.hidden++
    }
    host = next
    if (changed) record(before, next)
    return changed
  }

  let step = 0
  for (; step < MAX_STEPS && host.state.phase === 'playing'; step++) {
    const table = host.state.tantpanik!
    if (table.winner) {
      const alive = table.order.filter((id) => !table.out.includes(id))
      if (alive.length !== 1 || alive[0] !== table.winner) fail(`vinnaren ${table.winner} men kvar: ${alive.join(',')}`)
      host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
      continue
    }
    if (table.step === 'window') {
      windowSteps++
      maxWindow = Math.max(maxWindow, windowSteps)
      if (windowSteps > 60) fail('Nope!-fönstret stängs aldrig')
      const noper = table.order.find((id) => decideBotMove(botSight(host, id)!, bots[id], seeded(seed * 31 + step))?.type === 'tNope')
      if (noper) {
        const move = decideBotMove(botSight(host, noper)!, bots[noper], seeded(seed * 31 + step))!
        if (table.pending!.nopes >= 1) nopeChains++
        apply(noper, move)
      } else {
        const before = host
        host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
        if (host === before || host.state.tantpanik!.step === 'window') fail('Nope!-fönstret stängdes inte när tiden gått')
        record(before, host)
      }
      check(step)
      continue
    }
    windowSteps = 0
    const actors = table.order.filter((id) => botMustAct(table, id))
    if (actors.length !== 1) fail(`steg ${step}: ${actors.length} spelare ska göra något (${table.step})`)
    const actor = actors[0]
    const sight = botSight(host, actor)!
    const memory = observe(memories[actor] ?? newBotMemory(sight.table), sight.table)
    const move = decideBotMove(sight, bots[actor], random, memory)
    if (!move) fail(`steg ${step}: ${actor} har inget drag i steget ${table.step}`)
    if (!apply(actor, move!)) {
      fallbacks++
      const fallback = botFallbackMove(sight)
      if (!fallback || !apply(actor, fallback)) fail(`steg ${step}: ${actor} fastnade i steget ${table.step}`)
    } else if (host.state.tantpanik) memories[actor] = remember(memory, move!, sight, host.state.tantpanik)
    check(step)
  }
  if (host.state.phase !== 'finished') fail(`matchen tog inte slut på ${MAX_STEPS} steg`)

  // Slutskärmens siffror stämmer med det som hände.
  const stats = host.state.tantpanik!.stats!
  const clean = (record: Record<string, number>) => Object.fromEntries(Object.entries(record).filter(([, v]) => v > 0))
  if (stats.moves !== expected.moves) fail(`drag ${stats.moves}, väntade ${expected.moves}`)
  if (stats.hidden !== expected.hidden) fail(`gömda ${stats.hidden}, väntade ${expected.hidden}`)
  if (stats.stolen !== expected.stolen) fail(`stulna ${stats.stolen}, väntade ${expected.stolen}`)
  for (const key of ['nopes', 'steals', 'defuses'] as const) {
    if (JSON.stringify(clean(stats[key])) !== JSON.stringify(clean(expected[key])) && !sameRecord(clean(stats[key]), clean(expected[key]))) {
      fail(`${key} ${JSON.stringify(stats[key])}, väntade ${JSON.stringify(expected[key])}`)
    }
  }
  // Poängen: vinnaren lika många som antalet spelare, de utslagna 1, 2, 3 … i den ordning de åkte ut.
  const scores = host.state.scores
  const table = host.state.tantpanik!
  if (scores[table.winner!] !== players) fail(`vinnaren fick ${scores[table.winner!]} poäng`)
  table.out.forEach((id, i) => {
    if (scores[id] !== i + 1) fail(`${id} fick ${scores[id]} poäng som utslagen nummer ${i + 1}`)
  })
  return { steps: step, fallbacks, maxWindow, nopeChains }
}

function sameRecord(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => (a[key] ?? 0) === (b[key] ?? 0))
}

describe(`simulering: ${MATCHES} hela matcher med bara bottar`, () => {
  it('alla spelarantal 2–10, alla nivåer, Tantsnara på och av, alla bot-svårigheter', { timeout: 600_000 }, () => {
    let steps = 0
    let fallbacks = 0
    let chains = 0
    let longestWindow = 0
    const seen = new Set<string>()
    for (const config of configs()) {
      const result = simulate(config)
      steps += result.steps
      fallbacks += result.fallbacks
      chains += result.nopeChains
      longestWindow = Math.max(longestWindow, result.maxWindow)
      seen.add(`${config.players}-${levelFor(config.level, config.players)}-${config.trap}`)
    }
    // Alla kombinationer har körts (Kaos blir Svår med färre än fem spelare).
    expect(seen.size).toBe(9 * 2 * 2 + 6 * 2)
    // Nope! på Nope! har hänt, så att kedjorna verkligen har testats.
    expect(chains).toBeGreaterThan(0)
    expect(fallbacks).toBe(0)
    expect(steps).toBeGreaterThan(MATCHES * 20)
    void longestWindow
  })
})
