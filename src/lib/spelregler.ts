// Reglerna för varje spelbart spel. Matchflödet i match.ts är detsamma för alla spel,
// och det som skiljer (tider, giltiga gissningar och poäng) hämtas härifrån.
// Lägg till ett nytt spel här och i GAMES (games.ts).

import { priceRules } from '@/lib/gissa-priset'
import { narmastRules } from '@/lib/narmast'

export type RoundOutcome = {
  target: number
  // Poäng som varje spelare fick i rundan. Den eller de med flest poäng (över noll) vinner rundan.
  points: Record<string, number>
}

export type GameRules = {
  guessSeconds: number
  revealSeconds: number
  // Kort beskrivning som visas i väntrummet.
  howTo: string
  isValidGuess: (value: number) => boolean
  // Spel där varje runda gäller en sak (t.ex. Gissa priset) väljer den här.
  pickItem?: (usedItemIds: string[]) => { itemId: string; usedItemIds: string[] }
  // target kan skickas med för att slippa slump, t.ex. i tester.
  scoreRound: (guesses: Record<string, number>, itemId: string | null, target?: number) => RoundOutcome
}

const RULES: Record<string, GameRules> = {
  narmast: narmastRules,
  'gissa-priset': priceRules,
}

export function rulesFor(game: string): GameRules {
  return RULES[game] ?? narmastRules
}
