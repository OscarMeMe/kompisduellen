// Spelregler för "Närmast vinner": alla gissar ett tal, sedan slumpas rätt tal.

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
  howTo: `Gissa ett tal mellan ${MIN_NUMBER} och ${MAX_NUMBER}. Ni har ${GUESS_SECONDS} sekunder på er. Den som är närmast det slumpade talet får en poäng.`,
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
}
