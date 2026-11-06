// Spelregler för "Närmast vinner": alla gissar ett tal, sedan slumpas rätt tal. Ett enkelt turspel utan ledtrådar.
// De tre närmaste får 3, 2 och 1 poäng (delad placering ger samma poäng), exakt träff ger 5, och sista rundan ger
// dubbla poäng. Rena funktioner, så att de är lätta att testa.

import type { GameRules } from '@/lib/spelregler'

export const MIN_NUMBER = 1
export const MAX_NUMBER = 100
const GUESS_SECONDS = 15
// Facit: tallinjen med markören som rullar fram, och sedan raderna.
const REVEAL_SECONDS = 9

// Poäng efter placering (1:a, 2:a, 3:e), och för exakt träff. Sista rundan ger dubbelt.
export const PLACE_POINTS = [3, 2, 1] as const
export const EXACT_POINTS = 5
export const LAST_ROUND_FACTOR = 2

export function randomTarget(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER
}

// Poängen i en runda. Placeringen räknas som vid lika i sport: två delade ettor får 3 var, och nästa är trea.
export function roundPoints(guesses: Record<string, number>, target: number, lastRound = false): Record<string, number> {
  const entries = Object.entries(guesses)
  const factor = lastRound ? LAST_ROUND_FACTOR : 1
  const points: Record<string, number> = {}
  for (const [id, guess] of entries) {
    const away = Math.abs(guess - target)
    const place = entries.filter(([, other]) => Math.abs(other - target) < away).length
    const base = away === 0 ? EXACT_POINTS : (PLACE_POINTS[place] ?? 0)
    if (base > 0) points[id] = base * factor
  }
  return points
}

// Var spelarnas figurer står på tallinjen i facit. Figurer som står närmare varandra än minGap (på skalan 1–100)
// läggs på olika rader ovanför linjen, så att ingen skymmer någon. lane 0 är närmast linjen.
export function numberLineLanes(guesses: readonly { id: string; value: number }[], minGap: number): Record<string, number> {
  const lanes: number[] = []
  const result: Record<string, number> = {}
  for (const { id, value } of [...guesses].sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))) {
    let lane = lanes.findIndex((last) => value - last >= minGap)
    if (lane === -1) lane = lanes.length
    lanes[lane] = value
    result[id] = lane
  }
  return result
}

export const narmastRules: GameRules = {
  guessSeconds: GUESS_SECONDS,
  revealSeconds: REVEAL_SECONDS,
  // Rundan är bara 15 sekunder, så varningen kommer först när det är 5 kvar.
  warningSeconds: 5,
  howTo: (seconds) =>
    `Ett snabbt turspel. Gissa ett tal mellan ${MIN_NUMBER} och ${MAX_NUMBER} på ${seconds} sekunder, eller tryck Slumpa åt mig. Rätt tal slumpas fram efteråt. De tre närmaste får poäng, och sista rundan ger dubbla poäng.`,
  scoringDetails: [
    'Rätt tal slumpas fram först när rundan är slut, så ingen kan veta det i förväg.',
    'Närmast får 3 poäng, tvåan 2 och trean 1. Är flera lika nära får de samma poäng.',
    'Exakt rätt tal ger 5 poäng.',
    'Sista rundan ger dubbla poäng. Flest poäng efter sista rundan vinner matchen.',
  ],
  isValidGuess: (value) => Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER,

  // Talet slumpas först nu.
  scoreRound(guesses, _itemId, target = randomTarget(), lastRound = false) {
    return { target, points: roundPoints(guesses, target, lastRound) }
  },

  distance: (guess, target) => Math.abs(guess - target),
  notableMiss: 25,
  isBullseye: (guess, target) => guess === target,
  formatValue: (value) => String(value),
  itemName: () => null,
}
