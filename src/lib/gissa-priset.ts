// Spelregler för "Gissa priset": alla gissar vad något kostar, kostade förr eller såldes för,
// sedan avslöjas priset.

import { formatSek, isValidPrice, roundSek } from '@/lib/belopp'
import { findPriceItem, PRICE_ITEMS } from '@/lib/prisdata'
import type { GameRules } from '@/lib/spelregler'

// Längre tider än i Närmast vinner, så att man hinner skriva ett belopp och läsa faktameningen.
// Värden kan välja en annan svarstid i lobbyn.
const GUESS_SECONDS = 30
export const GUESS_SECONDS_OPTIONS = [20, 30, 60] as const
const REVEAL_SECONDS = 12

// Poäng efter hur nära man är, räknat i procent och inte i kronor.
// Exakt rätt = 100. Hälften eller dubbla priset = 85. Tio gånger fel = 50. Hundra gånger fel (eller mer) = 0.
export function pricePoints(guess: number, price: number): number {
  if (guess <= 0 || price <= 0) return 0
  return Math.max(0, Math.round(100 * (1 - priceDistance(guess, price) / 2)))
}

// Hur många tiopotenser fel gissningen är (0 = exakt, 1 = tio gånger fel). Poängen bygger på det här.
export function priceDistance(guess: number, price: number): number {
  return Math.abs(Math.log10(guess / price))
}

export const priceRules: GameRules = {
  guessSeconds: GUESS_SECONDS,
  guessSecondsOptions: GUESS_SECONDS_OPTIONS,
  revealSeconds: REVEAL_SECONDS,
  soloPractice: true,
  howTo: (seconds) =>
    `Gissa priset i kronor: vad något kostar i dag, vad det kostade förr eller vad det har sålts för. Historiska svenska priser anges i dåtidens kronor, utan inflationsjustering. Ni har ${seconds} sekunder på er. Ju närmare rätt pris, desto fler poäng. Fullträff ger 100.`,
  // Stämmer med pricePoints: 100 · (1 − tiopotenser fel / 2), avrundat. Testas i gissa-priset.test.ts.
  scoringDetails: [
    'Poängen räknas på hur många gånger fel du är, inte på antal kronor. Att gissa 200 kr när priset är 100 kr är lika fel som att gissa 50 kr.',
    'Exakt rätt ger 100 poäng. Ligger du inom ungefär 2 procent blir det också 100.',
    'Hälften eller dubbla priset ger 85 poäng, tio gånger fel ger 50 och hundra gånger fel eller mer ger 0.',
    'Från 1 krona räknas priset i hela kronor, så 2,44 kr räknas som 2 kr. Under 1 krona räknas ören.',
  ],
  isValidGuess: isValidPrice,

  // En slumpad sak som inte varit med än. När alla använts börjar listan om.
  pickItem(usedItemIds) {
    let unused = PRICE_ITEMS.filter((item) => !usedItemIds.includes(item.id))
    let used = usedItemIds
    if (unused.length === 0) {
      unused = PRICE_ITEMS
      used = []
    }
    const item = unused[Math.floor(Math.random() * unused.length)]
    return { itemId: item.id, usedItemIds: [...used, item.id] }
  },

  // Alla får 0–100 poäng efter hur nära priset på rundans sak de var.
  // Från en krona räknas mot priset i hela kronor, så att 2 kr ger fullpoäng när priset är 2,44 kr.
  scoreRound(guesses, itemId, price = findPriceItem(itemId)?.priceSek ?? 0) {
    const target = roundSek(price)
    const points: Record<string, number> = {}
    for (const [id, guess] of Object.entries(guesses)) points[id] = pricePoints(guess, target)
    return { target, points }
  },

  distance: priceDistance,
  // Hälften eller dubbla priset (85 poäng) eller längre ifrån.
  notableMiss: Math.log10(2),
  isBullseye: (guess, target) => pricePoints(guess, target) === 100,
  formatValue: formatSek,
  itemName: (itemId) => findPriceItem(itemId)?.name ?? null,
}
