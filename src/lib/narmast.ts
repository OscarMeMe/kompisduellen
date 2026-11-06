// Spelregler för "Närmast vinner": alla gissar ett tal, sedan slumpas rätt tal. Ett enkelt turspel utan ledtrådar.
// Poängen beror på hur långt ifrån man var (exakt träff ger 10), den eller de närmaste får 1 bonuspoäng, och sista
// rundan ger dubbla poäng. Rena funktioner, så att de är lätta att testa.

import type { GameRules } from '@/lib/spelregler'

export const MIN_NUMBER = 1
export const MAX_NUMBER = 100
const GUESS_SECONDS = 15
// Facit: tallinjen med markören som rullar fram, och sedan raderna.
const REVEAL_SECONDS = 9

// Poäng efter avstånd till rätt tal: [högsta avstånd, poäng]. Längre ifrån än sista steget ger inget.
export const DISTANCE_POINTS = [
  [0, 10],
  [2, 6],
  [5, 4],
  [10, 2],
  [20, 1],
] as const
export const EXACT_POINTS = 10
// Till den eller de som var närmast i rundan, ovanpå avståndspoängen.
export const CLOSEST_BONUS = 1
export const LAST_ROUND_FACTOR = 2

// Poängen för ett avstånd, utan bonus och dubbling.
export function distancePoints(away: number): number {
  return DISTANCE_POINTS.find(([max]) => away <= max)?.[1] ?? 0
}

export function randomTarget(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER
}

// Poängen i en runda: avståndspoängen plus bonusen till den eller de närmaste, dubblat i sista rundan.
export function roundPoints(guesses: Record<string, number>, target: number, lastRound = false): Record<string, number> {
  const entries = Object.entries(guesses)
  const factor = lastRound ? LAST_ROUND_FACTOR : 1
  const closest = Math.min(...entries.map(([, guess]) => Math.abs(guess - target)))
  const points: Record<string, number> = {}
  for (const [id, guess] of entries) {
    const away = Math.abs(guess - target)
    const base = distancePoints(away) + (away === closest ? CLOSEST_BONUS : 0)
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
    `Ett snabbt turspel. Gissa ett tal mellan ${MIN_NUMBER} och ${MAX_NUMBER} på ${seconds} sekunder, eller tryck Slumpa åt mig. Rätt tal slumpas fram efteråt. Ju närmare, desto fler poäng, och sista rundan ger dubbla poäng.`,
  scoringDetails: [
    'Rätt tal slumpas fram först när rundan är slut, så ingen kan veta det i förväg.',
    'Poängen beror på hur långt ifrån du var: exakt rätt ger 10, 1–2 ifrån 6, 3–5 ifrån 4, 6–10 ifrån 2 och 11–20 ifrån 1.',
    'Den som var närmast i rundan får 1 bonuspoäng. Är flera lika nära får alla bonusen.',
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
