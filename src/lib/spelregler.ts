// Reglerna för varje spelbart spel. Matchflödet i match.ts är detsamma för alla gissningsspel,
// och det som skiljer (tider, giltiga gissningar och poäng) hämtas härifrån.
// Kortspelen har egna regler (CardGameRules i kort.ts) i CARD_RULES.
// Lägg till ett nytt spel här och i GAMES (games.ts).

import { priceRules } from '@/lib/gissa-priset'
import type { CardGameRules } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'
import { narmastRules } from '@/lib/narmast'

export type RoundOutcome = {
  target: number
  // Poäng som varje spelare fick i rundan. Den eller de med flest poäng (över noll) vinner rundan.
  points: Record<string, number>
}

export type GameRules = {
  // Standardtid för att gissa. Spel med guessSecondsOptions låter värden välja en annan.
  guessSeconds: number
  // Svarstider värden kan välja i lobbyn. Finns de kan värden också välja att gå vidare själv efter facit.
  guessSecondsOptions?: readonly number[]
  revealSeconds: number
  // En ensam spelare får köra en provomgång, som inte räknas i topplistan.
  soloPractice?: boolean
  // Kort beskrivning som visas i väntrummet.
  howTo: (guessSeconds: number) => string
  // Den detaljerade poängförklaringen bakom "Så räknas poängen".
  scoringDetails: string[]
  isValidGuess: (value: number) => boolean
  // Spel där varje runda gäller en sak (t.ex. Gissa priset) väljer den här.
  pickItem?: (usedItemIds: string[]) => { itemId: string; usedItemIds: string[] }
  // target kan skickas med för att slippa slump, t.ex. i tester.
  scoreRound: (guesses: Record<string, number>, itemId: string | null, target?: number) => RoundOutcome
  // Hur långt ifrån rätt svar en gissning är, med samma mått som poängen bygger på (0 = exakt).
  distance: (guess: number, target: number) => number
  // Från hur stort avstånd en miss är värd att lyfta fram som "Längst från verkligheten".
  notableMiss: number
  // Gav gissningen full pott?
  isBullseye: (guess: number, target: number) => boolean
  // Ett värde som text, t.ex. "79 kr" eller "42".
  formatValue: (value: number) => string
  // Rätt svar i text, om det kan skilja sig från värdet som poängen räknas mot. Annars används formatValue.
  formatTarget?: (target: number, itemId: string | null) => string
  // Vad rundan gällde, t.ex. "Ikeas hjärtformade kudde med armar". null om rundan inte gällde en sak.
  itemName: (itemId: string | null) => string | null
}

const RULES: Record<string, GameRules> = {
  narmast: narmastRules,
  'gissa-priset': priceRules,
}

export function rulesFor(game: string): GameRules {
  return RULES[game] ?? narmastRules
}

const CARD_RULES: Record<string, CardGameRules> = {
  kortkaos: kortkaosRules,
}

// Reglerna för ett kortspel, eller undefined om spelet är ett gissningsspel.
export function cardRulesFor(game: string): CardGameRules | undefined {
  return CARD_RULES[game]
}
