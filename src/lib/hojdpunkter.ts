// Utmärkelser efter en match, t.ex. "Pris-oraklet". Byggs bara av verkliga matchdata.
// Alla utmärkelser som stämmer för matchen hamnar i en pott, och två slumpas därifrån (validHighlights och
// matchHighlights). Varje utmärkelse har två eller tre texter, och vilken som visas slumpas också. Slumpen
// bestäms av matchen, så att alla i lobbyn ser samma utmärkelser med samma texter.
// Avstånd mäts som i poängen (spelets distance). Uteblivna svar räknas inte som gissningar.
// Alla kräver minst två spelare, utom fullträffen som också kan visas i en provomgång.
// Rena funktioner, så att de är lätta att testa.

import { matchWinners, rankPlayers, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

export type HighlightId =
  | 'sista-rundan'
  | 'fulltraff'
  | 'langst-ifran'
  | 'tankelasare'
  | 'snalast'
  | 'slosaren'
  | 'comeback'
  | 'start-till-mal'
  | 'moralisk-segrare'
  | 'stabilast'
  | 'sista-sekunden'
  | 'blixten'
  | 'var-ar-du'

export type Highlight = {
  id: HighlightId
  title: string
  text: string
}

// Så många utmärkelser visas efter en match.
const MAX_HIGHLIGHTS = 2

// Väljer en av texterna.
type Pick = (texts: string[]) => string

// "Oscar", "Oscar och Michaela", "Oscar, Michaela och Andreas"
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`
}

function nameOf(state: GameState, id: string): string {
  return state.players[id]?.name ?? 'Någon'
}

const isPriceGame = (state: GameState) => state.game === 'gissa-priset'
const fewPlayers = (state: GameState) => Object.keys(state.players).length < 2

// Sista rundan gav en ensam vinnare som låg efter eller delade ledningen inför den.
function decidedInLastRound(state: GameState, pick: Pick): Highlight | null {
  const last = state.matchRounds[state.matchRounds.length - 1]
  if (!last || state.matchRounds.length < 2 || fewPlayers(state)) return null
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
    title: 'Matchavgöraren',
    text:
      winnerBefore < bestOther
        ? pick([
            `${name} låg efter inför sista rundan och vände allt. Snacka om timing!`,
            `${name} sparade det bästa till sist och snodde segern i sista rundan.`,
            `Inför sista rundan såg det mörkt ut för ${name}. Sen hände det.`,
          ])
        : pick([
            `${name} delade ledningen inför sista rundan och drog ifrån när det gällde.`,
            `Jämnt in i det sista, tills ${name} bestämde sig.`,
          ]),
  }
}

// Gissningar som gav full pott (i Gissa priset inom 5 procent, i Närmast vinner exakt rätt).
function bullseyes(state: GameState, pick: Pick): Highlight | null {
  const rules = rulesFor(state.game)
  const hits: { id: string; guess: number; itemId: string | null }[] = []
  for (const round of state.matchRounds) {
    for (const [id, guess] of Object.entries(round.guesses)) {
      if (rules.isBullseye(guess, round.target)) hits.push({ id, guess, itemId: round.itemId })
    }
  }
  if (hits.length === 0) return null

  const ids = [...new Set(hits.map((hit) => hit.id))]
  const names = joinNames(ids.map((id) => nameOf(state, id)))
  const n = hits.length
  let text: string
  if (n === 1) {
    const [hit] = hits
    const guess = rules.formatValue(hit.guess)
    const item = lowerFirst(rules.itemName(hit.itemId))
    text = item
      ? pick([
          `${names} gissade ${guess} på ${item} och fick fullpoäng. Så nära att vi börjar misstänka insiderinformation.`,
          `Fullpoäng för ${names} på ${item}. Har du jobbat i kassan?`,
        ])
      : pick([`${names} gissade exakt ${guess}. Mitt i prick!`, `${names} satte ${guess} rakt i mål. Tankeläsare eller tur?`])
  } else if (ids.length === 1) {
    text = pick([`${names} fick fullpoäng ${n} gånger. Det här börjar likna fusk.`, `${n} fullträffar för ${names}. Någon har pluggat.`])
  } else {
    text = pick([`${names} fick fullpoäng. ${n} fullträffar i matchen!`, `Kvällens prickskyttar: ${names}. ${n} fullträffar totalt.`])
  }
  return { id: 'fulltraff', title: isPriceGame(state) ? 'Pris-oraklet' : 'Prickskytten', text }
}

// Ord som alltid får liten bokstav mitt i en mening, även om nästa ord är ett namn ("Tåg Norrköping–Söderköping").
const COMMON_FIRST_WORDS = new Set(['En', 'Ett', 'Två', 'Tre', 'Fem', 'Tjugo', 'Att', 'Den', 'Det', 'Första', 'Pizzan', 'Tåg', 'Köttkontrollanten'])

// Sakens namn mitt i en mening: "En ny Volvo Amazon" blir "en ny Volvo Amazon". Namn och ägare behåller stor
// bokstav: "Steve Jobs slitna sandaler" (nästa ord är också ett namn) och "Ikeas soffa Klippan" (slutar på s).
export function lowerFirst(name: string | null): string | null {
  if (!name) return null
  const [first, second = ''] = name.split(' ')
  const keep = !COMMON_FIRST_WORDS.has(first) && (first.endsWith('s') || /^\p{Lu}/u.test(second))
  return keep ? name : name[0].toLowerCase() + name.slice(1)
}

// Den inskickade gissning som var längst ifrån rätt svar, om den var tillräckligt långt ifrån.
function furthestMiss(state: GameState, pick: Pick): Highlight | null {
  if (fewPlayers(state)) return null
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
    const name = nameOf(state, g.id)
    const item = lowerFirst(rules.itemName(g.round.itemId))
    const guessed = rules.formatValue(g.guess)
    const answer = rules.formatTarget?.(g.round.target, g.round.itemId) ?? rules.formatValue(g.round.target)
    text = item
      ? pick(
          [
            `${name} gissade ${guessed} på ${item}. Rätt pris var ${answer}. Vi säger inget mer.`,
            // "trodde att att hyra …" går inte, så den texten hoppas över för saker som börjar med "att".
            item.startsWith('att ') ? null : `${name} trodde att ${item} kostade ${guessed}. Det kostade ${answer}. Fint försök!`,
            `${guessed} för ${item}? ${name} lever i en annan prisklass. Rätt var ${answer}.`,
          ].filter((text) => text !== null),
        )
      : pick([
          `${name} gissade ${guessed} när rätt tal var ${answer}. Modigt!`,
          `${name} sa ${guessed}. Svaret var ${answer}. Det var länge sedan de möttes.`,
        ])
  } else {
    const names = [...new Set(tied.map((g) => nameOf(state, g.id)))]
    text = `${joinNames(names)} delar på den här. Lika långt ifrån, lika stolta.`
  }
  return { id: 'langst-ifran', title: 'Verklighetsflykten', text }
}

// Två eller flera gissade exakt samma i en runda.
function mindReaders(state: GameState, pick: Pick): Highlight | null {
  const rules = rulesFor(state.game)
  for (const round of state.matchRounds) {
    const byValue = new Map<number, string[]>()
    for (const [id, guess] of Object.entries(round.guesses)) byValue.set(guess, [...(byValue.get(guess) ?? []), id])
    const same = [...byValue.entries()].find(([, who]) => who.length >= 2)
    if (!same) continue
    const [guess, who] = same
    const names = joinNames(who.map((id) => nameOf(state, id)))
    const value = rules.formatValue(guess)
    return {
      id: 'tankelasare',
      title: 'Tankeläsarna',
      text: pick([
        `${who.length === 2 ? 'Två hjärnor' : 'Flera hjärnor'}, en tanke: ${names} gissade exakt samma, ${value}.`,
        `${names} svarade exakt ${value}. Har ni fuskat eller bara samma hjärna?`,
      ]),
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
function extremeGuessers(state: GameState, extreme: 'lowest' | 'highest') {
  const counts = new Map<string, number>()
  let rounds = 0
  for (const round of state.matchRounds) {
    const entries = Object.entries(round.guesses)
    if (entries.length < 2) continue
    rounds++
    const values = entries.map(([, guess]) => guess)
    const value = extreme === 'lowest' ? Math.min(...values) : Math.max(...values)
    const holders = entries.filter(([, guess]) => guess === value)
    if (holders.length === 1) counts.set(holders[0][0], (counts.get(holders[0][0]) ?? 0) + 1)
  }
  return { leader: soleLeader(counts), rounds }
}

function lowestMostOften(state: GameState, pick: Pick): Highlight | null {
  const { leader, rounds: r } = extremeGuessers(state, 'lowest')
  if (!leader) return null
  const name = nameOf(state, leader.id)
  const n = leader.count
  return isPriceGame(state)
    ? {
        id: 'snalast',
        title: 'Snåljåpen',
        text: pick([
          `${name} gissade lägst i ${n} av ${r} rundor och höll hårdare i plånboken än någon annan i kväll.`,
          `${name} gissade lägst ${n} gånger av ${r}. Tror fortfarande att allt kostar som 1995.`,
          `Lägst gissning i ${n} av ${r} rundor. Rea på allt, enligt ${name}.`,
        ]),
      }
    : {
        id: 'snalast',
        title: 'Lågt och lugnt',
        text: pick([
          `${name} gissade lägst i ${n} av ${r} rundor. Försiktig typ.`,
          `${name} höll sig lägst ${n} gånger. Varför chansa uppåt?`,
        ]),
      }
}

function highestMostOften(state: GameState, pick: Pick): Highlight | null {
  const { leader, rounds: r } = extremeGuessers(state, 'highest')
  if (!leader) return null
  const name = nameOf(state, leader.id)
  const n = leader.count
  return isPriceGame(state)
    ? {
        id: 'slosaren',
        title: 'Storspenderaren',
        text: pick([
          `${name} gissade högst i ${n} av ${r} rundor. Såg prislappen och tänkte: vi dubblar!`,
          `Högst gissning ${n} gånger av ${r}. ${name} har visst fått lön.`,
          `${name} gissade högst i ${n} av ${r} rundor. Pengar växer ju på träd.`,
        ]),
      }
    : {
        id: 'slosaren',
        title: 'Högt i tak',
        text: pick([
          `${name} gissade högst i ${n} av ${r} rundor. Siktar alltid mot stjärnorna.`,
          `${name} valde högst ${n} gånger. Varför nöja sig med mindre?`,
        ]),
      }
}

// Poäng per runda för en spelare. Den som inte svarade fick noll.
function pointsPerRound(state: GameState, id: string): number[] {
  return state.matchRounds.map((round) => round.points[id] ?? 0)
}

// Summan av poängen efter de första rundorna.
function totalAfter(state: GameState, id: string, rounds: number): number {
  return pointsPerRound(state, id)
    .slice(0, rounds)
    .reduce((sum, p) => sum + p, 0)
}

// Segern gick till någon som låg ensam sist efter en tidigare runda.
function comeback(state: GameState, pick: Pick): Highlight | null {
  const ids = Object.keys(state.players)
  const winners = matchWinners(state)
  if (ids.length < 2 || winners.length !== 1 || state.matchRounds.length < 3) return null
  const winner = winners[0]
  // Strikt sist, så att en delad sistaplats inte räknas.
  for (let round = 1; round < state.matchRounds.length; round++) {
    const mine = totalAfter(state, winner, round)
    if (ids.every((id) => id === winner || totalAfter(state, id, round) > mine)) {
      const name = nameOf(state, winner)
      return {
        id: 'comeback',
        title: 'Comebacken',
        text: pick([
          `${name} låg sist efter runda ${round} men tog hem segern. Räkna aldrig bort ${name}!`,
          `Sist efter runda ${round}, först när det räknades. Vilken resa, ${name}!`,
        ]),
      }
    }
  }
  return null
}

// Vinnaren ledde ensam efter varje runda.
function wireToWire(state: GameState, pick: Pick): Highlight | null {
  const ids = Object.keys(state.players)
  const winners = matchWinners(state)
  if (ids.length < 2 || winners.length !== 1 || state.matchRounds.length < 3) return null
  const winner = winners[0]
  for (let round = 1; round <= state.matchRounds.length; round++) {
    const mine = totalAfter(state, winner, round)
    if (!ids.every((id) => id === winner || totalAfter(state, id, round) < mine)) return null
  }
  const name = nameOf(state, winner)
  return {
    id: 'start-till-mal',
    title: 'Start till mål',
    text: pick([
      `${name} ledde efter varje runda. Ingen kom ens nära.`,
      `Från första till sista rundan låg ${name} i topp. Total kontroll.`,
    ]),
  }
}

// Ensam om flest vunna rundor (minst två) men vann inte matchen.
function moralVictory(state: GameState, pick: Pick): Highlight | null {
  if (fewPlayers(state)) return null
  const counts = new Map<string, number>()
  for (const round of state.matchRounds) {
    for (const id of round.winners) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const leader = soleLeader(counts)
  if (!leader || matchWinners(state).includes(leader.id)) return null
  const name = nameOf(state, leader.id)
  const n = leader.count
  return {
    id: 'moralisk-segrare',
    title: 'Moralisk segrare',
    text: pick([
      `${name} vann flest rundor (${n} st) men inte matchen. Moralisk segrare!`,
      `${n} rundvinster och ändå ingen guldmedalj. Livet är orättvist, ${name}.`,
    ]),
  }
}

function spread(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
}

// Den som fick jämnast poäng från runda till runda, om hen är ensam om det. Bara i Gissa priset, där poängen
// går från 0 till 100. I Närmast vinner blir det bara 0 eller 1.
function steadiest(state: GameState, pick: Pick): Highlight | null {
  const ids = Object.keys(state.players)
  if (!isPriceGame(state) || ids.length < 2 || state.matchRounds.length < 3) return null
  const spreads = ids
    .map((id) => ({ id, points: pointsPerRound(state, id) }))
    .filter(({ points }) => points.some((p) => p > 0))
    .map(({ id, points }) => ({ id, spread: spread(points), low: Math.min(...points), high: Math.max(...points) }))
    .sort((a, b) => a.spread - b.spread)
  if (spreads.length < 2 || spreads[0].spread >= spreads[1].spread) return null
  const [best] = spreads
  const name = nameOf(state, best.id)
  return {
    id: 'stabilast',
    title: 'Stadig som en klippa',
    text: pick([
      `${name} fick mellan ${best.low} och ${best.high} poäng varje runda. Inget drama här.`,
      `${name} höll sig mellan ${best.low} och ${best.high} poäng hela matchen. Pålitlig som en gammal Volvo.`,
    ]),
  }
}

// Svarstider per spelare, för rundorna där minst två svar har en tid.
function timedRounds(state: GameState): Record<string, number>[] {
  return state.matchRounds.map((round) => round.times ?? {}).filter((times) => Object.keys(times).length >= 2)
}

function latestAnswerer(state: GameState, pick: Pick): Highlight | null {
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
  const name = nameOf(state, leader.id)
  const n = leader.count
  return {
    id: 'sista-sekunden',
    title: 'Sekundmästaren',
    text: pick([
      `${name} svarade sist i ${n} av ${rounds.length} rundor. Gillar uppenbarligen att leva farligt.`,
      `${name} väntade in sista sekunden ${n} gånger. Pulsen, alltså!`,
    ]),
  }
}

// Blixten ska vara minst en halv sekund snabbare i snitt än nästa, så att det inte är slump.
const FASTEST_MARGIN_MS = 500

function fastestAnswerer(state: GameState, pick: Pick): Highlight | null {
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
  const name = nameOf(state, averages[0].id)
  return {
    id: 'blixten',
    title: 'Blixten',
    text: pick([
      `${name} svarade på ${seconds} sekunder i snitt. Läste du ens frågan?`,
      `Snabbast var ${name} med ${seconds} s i snitt. Fingrarna före hjärnan!`,
      `${seconds} sekunder i snitt. ${name} har bråttom någonstans.`,
    ]),
  }
}

// Ensam om att ha missat flest rundor (minst två). Den som aldrig svarade, t.ex. för att hen anslöt efter
// matchstart, räknas inte.
function missedMost(state: GameState, pick: Pick): Highlight | null {
  if (fewPlayers(state)) return null
  const counts = new Map<string, number>()
  for (const id of Object.keys(state.players)) {
    const answered = state.matchRounds.filter((round) => round.guesses[id] !== undefined).length
    if (answered > 0) counts.set(id, state.matchRounds.length - answered)
  }
  const leader = soleLeader(counts)
  if (!leader) return null
  const name = nameOf(state, leader.id)
  const n = leader.count
  return {
    id: 'var-ar-du',
    title: 'Var är du?',
    text: pick([`${name} missade att svara i ${n} rundor. Hämtade du snacks?`, `${n} rundor utan svar från ${name}. Vi saknade dig!`]),
  }
}

// Texten under prispallen: vem som vann och med hur mycket.
export function winnerSummary(state: GameState): string {
  const ranked = rankPlayers(state)
  if (state.practice) {
    const rounds = state.round === 1 ? '1 runda' : `${state.round} rundor`
    return `Du fick ${ranked[0]?.score ?? 0} poäng på ${rounds}.`
  }
  const winners = ranked.filter((p) => p.place === 1)
  const top = winners[0]?.score ?? 0
  if (top === 0) return 'Ingen fick poäng den här gången. Revansch?'
  if (winners.length > 1) {
    return `Delad seger! ${joinNames(winners.map((p) => p.name))} fick ${winners.length === 2 ? 'båda' : 'alla'} ${top} poäng.`
  }
  const winner = `${winners[0].name} vann med ${top} poäng.`
  const runnersUp = ranked.filter((p) => p.place === 2)
  if (runnersUp.length === 0) return winner
  return `${winner} ${top - runnersUp[0].score} poäng före ${joinNames(runnersUp.map((p) => p.name))}!`
}

// Alla utmärkelser som stämmer för matchen, i fast ordning. random väljer text (utan random blir det den första).
export function validHighlights(state: GameState, random: () => number = () => 0): Highlight[] {
  if (state.phase !== 'finished') return []
  const pick: Pick = (texts) => texts[Math.min(texts.length - 1, Math.floor(random() * texts.length))]
  return [
    decidedInLastRound,
    bullseyes,
    furthestMiss,
    mindReaders,
    lowestMostOften,
    highestMostOften,
    comeback,
    wireToWire,
    moralVictory,
    steadiest,
    latestAnswerer,
    fastestAnswerer,
    missedMost,
  ]
    .map((build) => build(state, pick))
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

// Fröet kommer från matchens egna rundor: olika utmärkelser olika matcher, men samma för alla som ser den.
function matchSeed(state: GameState): number {
  const text = JSON.stringify(state.matchRounds) + state.matchesPlayed
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

// Två slumpade utmärkelser ur potten av de som stämmer, med slumpad text.
export function matchHighlights(state: GameState, random: () => number = seededRandom(matchSeed(state))): Highlight[] {
  const pool = validHighlights(state, random)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, MAX_HIGHLIGHTS)
}
