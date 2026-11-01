// Spelregler för "Närmast vinner": alla gissar ett tal, sedan slumpas rätt tal.
// Det finns inga ledtrådar, så spelet är ett snabbt turspel.

import type { GameRules } from '@/lib/spelregler'

export const MIN_NUMBER = 1
export const MAX_NUMBER = 100
const GUESS_SECONDS = 15
const REVEAL_SECONDS = 6

export function randomTarget(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER
}

export const narmastRules: GameRules = {
  guessSeconds: GUESS_SECONDS,
  revealSeconds: REVEAL_SECONDS,
  // Rundan är bara 15 sekunder, så varningen kommer först när det är 5 kvar.
  warningSeconds: 5,
  howTo: (seconds) =>
    `Ett snabbt turspel. Gissa ett tal mellan ${MIN_NUMBER} och ${MAX_NUMBER} på ${seconds} sekunder. Det finns inga ledtrådar, för rätt tal slumpas fram efteråt. Den som hamnar närmast får en poäng.`,
  scoringDetails: [
    'Rätt tal slumpas fram först när rundan är slut, så ingen kan veta det i förväg.',
    'Den som är närmast rätt tal får 1 poäng. Är flera lika nära får alla de en poäng.',
    'Flest poäng efter sista rundan vinner matchen.',
  ],
  isValidGuess: (value) => Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER,

  // Talet slumpas först nu, och den eller de som är närmast får 1 poäng.
  scoreRound(guesses, _itemId, target = randomTarget()) {
    const entries = Object.entries(guesses)
    const points: Record<string, number> = {}
    if (entries.length > 0) {
      const best = Math.min(...entries.map(([, guess]) => Math.abs(guess - target)))
      for (const [id, guess] of entries) {
        if (Math.abs(guess - target) === best) points[id] = 1
      }
    }
    return { target, points }
  },

  distance: (guess, target) => Math.abs(guess - target),
  notableMiss: 25,
  isBullseye: (guess, target) => guess === target,
  formatValue: (value) => String(value),
  itemName: () => null,
}
