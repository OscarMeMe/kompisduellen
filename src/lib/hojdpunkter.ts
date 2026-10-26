// Höjdpunkter efter en match, t.ex. "Matchens fullträff". Byggs bara av verkliga matchdata.
// Avstånd mäts som i poängen (spelets distance). Uteblivna svar räknas inte som gissningar.
// Rena funktioner, så att de är lätta att testa.

import { matchWinners, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

export type Highlight = {
  id: 'sista-rundan' | 'fulltraff' | 'langst-ifran'
  emoji: string
  title: string
  text: string
}

// Högst två höjdpunkter, i den här ordningen när flera finns.
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

export function matchHighlights(state: GameState): Highlight[] {
  if (state.phase !== 'finished') return []
  return [decidedInLastRound(state), bullseyes(state), furthestMiss(state)]
    .filter((highlight): highlight is Highlight => highlight !== null)
    .slice(0, MAX_HIGHLIGHTS)
}
