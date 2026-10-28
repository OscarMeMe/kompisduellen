// Höjdpunkter (insikter) efter en match, t.ex. "Matchens fullträff". Byggs bara av verkliga matchdata.
// Alla insikter som stämmer för matchen hamnar i en pott, och två slumpas därifrån (validHighlights och
// matchHighlights). Slumpen bestäms av matchen, så att alla i lobbyn ser samma två.
// Avstånd mäts som i poängen (spelets distance). Uteblivna svar räknas inte som gissningar.
// Rena funktioner, så att de är lätta att testa.

import { matchWinners, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

export type Highlight = {
  id:
    | 'sista-rundan'
    | 'fulltraff'
    | 'langst-ifran'
    | 'tankelasare'
    | 'snalast'
    | 'slosaren'
    | 'comeback'
    | 'stabilast'
    | 'sista-sekunden'
    | 'blixten'
  emoji: string
  title: string
  text: string
}

// Så många insikter visas efter en match.
const MAX_HIGHLIGHTS = 2

// "Oscar", "Oscar och Michaela", "Oscar, Michaela och Andreas"
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`
}

function nameOf(state: GameState, id: string): string {
  return state.players[id]?.name ?? 'Någon'
}

// Sista rundan gav en ensam vinnare som låg efter eller delade ledningen inför den.
function decidedInLastRound(state: GameState): Highlight | null {
  const last = state.matchRounds[state.matchRounds.length - 1]
  if (!last || state.matchRounds.length < 2 || Object.keys(state.players).length < 2) return null
  const winners = matchWinners(state)
  if (winners.length !== 1) return null
  const winner = winners[0]

  const before = (id: string) => (state.scores[id] ?? 0) - (last.points[id] ?? 0)
  const bestOther = Math.max(...Object.keys(state.players).filter((id) => id !== winner).map(before))
  const winnerBefore = before(winner)
  if (winnerBefore > bestOther) return null

  const name = nameOf(state, winner)
  return {
    id: 'sista-rundan',
    emoji: '⚡',
    title: 'Avgjorde i sista rundan',
    text:
      winnerBefore < bestOther
        ? `${name} låg efter inför sista rundan men vände och vann!`
        : `${name} delade ledningen inför sista rundan och drog ifrån på slutet.`,
  }
}

// Gissningar som gav full pott.
function bullseyes(state: GameState): Highlight | null {
  const rules = rulesFor(state.game)
  const hits: { id: string; target: number; itemId: string | null }[] = []
  for (const round of state.matchRounds) {
    for (const [id, guess] of Object.entries(round.guesses)) {
      if (rules.isBullseye(guess, round.target)) hits.push({ id, target: round.target, itemId: round.itemId })
    }
  }
  if (hits.length === 0) return null

  let text: string
  if (hits.length === 1) {
    const [hit] = hits
    const item = rules.itemName(hit.itemId)
    const answer = rules.formatValue(hit.target)
    text = item
      ? `${nameOf(state, hit.id)} prickade rätt: ${item}, ${answer}.`
      : `${nameOf(state, hit.id)} prickade rätt på ${answer}.`
  } else {
    const ids = [...new Set(hits.map((hit) => hit.id))]
    text =
      ids.length === 1
        ? `${nameOf(state, ids[0])} prickade rätt ${hits.length} gånger!`
        : `${joinNames(ids.map((id) => nameOf(state, id)))} prickade rätt. ${hits.length} fullträffar i matchen!`
  }
  return { id: 'fulltraff', emoji: '🎯', title: 'Matchens fullträff', text }
}

// Den inskickade gissning som var längst ifrån rätt svar, om den var tillräckligt långt ifrån.
function furthestMiss(state: GameState): Highlight | null {
  if (Object.keys(state.players).length < 2) return null
  const rules = rulesFor(state.game)
  const guesses = state.matchRounds.flatMap((round) =>
    Object.entries(round.guesses).map(([id, guess]) => ({
      id,
      guess,
      round,
      distance: rules.distance(guess, round.target),
    })),
  )
  if (guesses.length === 0) return null

  const worst = Math.max(...guesses.map((g) => g.distance))
  if (worst < rules.notableMiss) return null
  // Lika långt ifrån (med lite marginal för avrundning) delar på titeln.
  const tied = guesses.filter((g) => worst - g.distance < 1e-9)

  let text: string
  if (tied.length === 1) {
    const [g] = tied
    const item = rules.itemName(g.round.itemId)
    const guessed = rules.formatValue(g.guess)
    const answer = rules.formatValue(g.round.target)
    text = item
      ? `${nameOf(state, g.id)} gissade ${guessed} på ”${item}”. Rätt pris var ${answer}.`
      : `${nameOf(state, g.id)} gissade ${guessed} när rätt tal var ${answer}.`
  } else {
    const names = [...new Set(tied.map((g) => nameOf(state, g.id)))]
    text = `${joinNames(names)} delar på den här: lika långt ifrån rätt svar.`
  }
  return { id: 'langst-ifran', emoji: '🚀', title: 'Längst från verkligheten', text }
}

// Två eller flera gissade exakt samma i en runda.
function mindReaders(state: GameState): Highlight | null {
  const rules = rulesFor(state.game)
  for (const round of state.matchRounds) {
    const byValue = new Map<number, string[]>()
    for (const [id, guess] of Object.entries(round.guesses)) byValue.set(guess, [...(byValue.get(guess) ?? []), id])
    const same = [...byValue.entries()].find(([, who]) => who.length >= 2)
    if (!same) continue
    const [guess, who] = same
    const item = rules.itemName(round.itemId)
    return {
      id: 'tankelasare',
      emoji: '🧠',
      title: 'Tankeläsare',
      text: `${joinNames(who.map((id) => nameOf(state, id)))} gissade exakt samma sak: ${rules.formatValue(guess)}${item ? ` på ”${item}”` : ''}. Läser ni varandras tankar?`,
    }
  }
  return null
}

// Spelaren som oftast uppfyller något i en runda, om hen är ensam om flest och det hänt minst två gånger.
function soleLeader(counts: Map<string, number>): { id: string; count: number } | null {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0 || sorted[0][1] < 2) return null
  if (sorted[1] && sorted[1][1] === sorted[0][1]) return null
  return { id: sorted[0][0], count: sorted[0][1] }
}

// Rundorna där minst två gissade, med den som oftast gissade lägst eller högst (om det finns en ensam).
function extremeGuessers(state: GameState, pick: 'lowest' | 'highest') {
  const counts = new Map<string, number>()
  let rounds = 0
  for (const round of state.matchRounds) {
    const entries = Object.entries(round.guesses)
    if (entries.length < 2) continue
    rounds++
    const values = entries.map(([, guess]) => guess)
    const extreme = pick === 'lowest' ? Math.min(...values) : Math.max(...values)
    const holders = entries.filter(([, guess]) => guess === extreme)
    if (holders.length === 1) counts.set(holders[0][0], (counts.get(holders[0][0]) ?? 0) + 1)
  }
  return { leader: soleLeader(counts), rounds }
}

function lowestMostOften(state: GameState): Highlight | null {
  const { leader, rounds } = extremeGuessers(state, 'lowest')
  if (!leader) return null
  return {
    id: 'snalast',
    emoji: '🪙',
    title: 'Snålast',
    text: `${nameOf(state, leader.id)} gissade lägst i ${leader.count} av ${rounds} rundor. Plånboken sitter hårt!`,
  }
}

function highestMostOften(state: GameState): Highlight | null {
  const { leader, rounds } = extremeGuessers(state, 'highest')
  if (!leader) return null
  return {
    id: 'slosaren',
    emoji: '💸',
    title: 'Slösaren',
    text: `${nameOf(state, leader.id)} gissade högst i ${leader.count} av ${rounds} rundor. Pengar är till för att slängas!`,
  }
}

// Poäng per runda för en spelare. Den som inte svarade fick noll.
function pointsPerRound(state: GameState, id: string): number[] {
  return state.matchRounds.map((round) => round.points[id] ?? 0)
}

// Segern gick till någon som låg ensam sist efter en tidigare runda.
function comeback(state: GameState): Highlight | null {
  const ids = Object.keys(state.players)
  const winners = matchWinners(state)
  if (ids.length < 2 || winners.length !== 1 || state.matchRounds.length < 3) return null
  const winner = winners[0]
  const total = (id: string, upTo: number) => pointsPerRound(state, id).slice(0, upTo).reduce((sum, p) => sum + p, 0)
  // Strikt sist, så att en delad sistaplats inte räknas.
  for (let round = 1; round < state.matchRounds.length; round++) {
    const mine = total(winner, round)
    if (ids.every((id) => id === winner || total(id, round) > mine)) {
      return {
        id: 'comeback',
        emoji: '🔥',
        title: 'Comeback',
        text: `${nameOf(state, winner)} låg sist efter runda ${round} men vände och tog hem segern!`,
      }
    }
  }
  return null
}

function spread(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
}

// Den som fick jämnast poäng från runda till runda, om hen är ensam om det.
function steadiest(state: GameState): Highlight | null {
  const ids = Object.keys(state.players)
  if (ids.length < 2 || state.matchRounds.length < 3) return null
  const spreads = ids
    .map((id) => ({ id, points: pointsPerRound(state, id) }))
    .filter(({ points }) => points.some((p) => p > 0))
    .map(({ id, points }) => ({ id, spread: spread(points), low: Math.min(...points), high: Math.max(...points) }))
    .sort((a, b) => a.spread - b.spread)
  if (spreads.length < 2 || spreads[0].spread >= spreads[1].spread) return null
  const [best] = spreads
  return {
    id: 'stabilast',
    emoji: '🪨',
    title: 'Stabilast',
    text: `${nameOf(state, best.id)} höll jämnast nivå: ${best.low}–${best.high} poäng varje runda. Stabil som en klippa!`,
  }
}

// Svarstider per spelare, för rundorna där minst två svar har en tid.
function timedRounds(state: GameState): Record<string, number>[] {
  return state.matchRounds.map((round) => round.times ?? {}).filter((times) => Object.keys(times).length >= 2)
}

function latestAnswerer(state: GameState): Highlight | null {
  const rounds = timedRounds(state)
  const counts = new Map<string, number>()
  for (const times of rounds) {
    const entries = Object.entries(times)
    const latest = Math.max(...entries.map(([, ms]) => ms))
    const holders = entries.filter(([, ms]) => ms === latest)
    if (holders.length === 1) counts.set(holders[0][0], (counts.get(holders[0][0]) ?? 0) + 1)
  }
  const leader = soleLeader(counts)
  if (!leader) return null
  return {
    id: 'sista-sekunden',
    emoji: '⏳',
    title: 'Sista sekunden',
    text: `${nameOf(state, leader.id)} svarade sist i ${leader.count} av ${rounds.length} rundor. Nervkittlande!`,
  }
}

// Blixten ska vara minst en halv sekund snabbare i snitt än nästa, så att det inte är slump.
const FASTEST_MARGIN_MS = 500

function fastestAnswerer(state: GameState): Highlight | null {
  const totals = new Map<string, { sum: number; n: number }>()
  for (const times of timedRounds(state)) {
    for (const [id, ms] of Object.entries(times)) {
      const t = totals.get(id) ?? { sum: 0, n: 0 }
      totals.set(id, { sum: t.sum + ms, n: t.n + 1 })
    }
  }
  const averages = [...totals.entries()]
    .filter(([, t]) => t.n >= 2)
    .map(([id, t]) => ({ id, average: t.sum / t.n }))
    .sort((a, b) => a.average - b.average)
  if (averages.length < 2 || averages[1].average - averages[0].average < FASTEST_MARGIN_MS) return null
  const seconds = (averages[0].average / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })
  return {
    id: 'blixten',
    emoji: '⚡',
    title: 'Blixten',
    text: `${nameOf(state, averages[0].id)} svarade snabbast: ${seconds} s i snitt. Snabbare än sin egen skugga!`,
  }
}

// Alla insikter som stämmer för matchen, i fast ordning.
export function validHighlights(state: GameState): Highlight[] {
  if (state.phase !== 'finished') return []
  return [
    decidedInLastRound,
    bullseyes,
    furthestMiss,
    mindReaders,
    lowestMostOften,
    highestMostOften,
    comeback,
    steadiest,
    latestAnswerer,
    fastestAnswerer,
  ]
    .map((build) => build(state))
    .filter((highlight): highlight is Highlight => highlight !== null)
}

// En enkel slumpgenerator (mulberry32) som ger samma tal för samma frö.
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fröet kommer från matchens egna rundor: olika insikter olika matcher, men samma för alla som ser den.
function matchSeed(state: GameState): number {
  const text = JSON.stringify(state.matchRounds) + state.matchesPlayed
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

// Två slumpade insikter ur potten av de som stämmer.
export function matchHighlights(state: GameState, random: () => number = seededRandom(matchSeed(state))): Highlight[] {
  const pool = validHighlights(state)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, MAX_HIGHLIGHTS)
}
