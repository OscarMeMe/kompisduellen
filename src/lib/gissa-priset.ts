// Spelregler för "Gissa priset": alla gissar vad en sak kostade, sedan avslöjas priset.

import { isValidPrice } from '@/lib/belopp'
import { findPriceItem, PRICE_ITEMS } from '@/lib/prisdata'
import type { GameRules } from '@/lib/spelregler'

const GUESS_SECONDS = 20
// Lite längre tid än i Närmast vinner, så att man hinner läsa faktameningen.
const REVEAL_SECONDS = 8

// Poäng efter hur nära man är, räknat i procent och inte i kronor.
// Exakt rätt = 100. Hälften eller dubbla priset = 70. Tio gånger fel (eller mer) = 0.
export function pricePoints(guess: number, price: number): number {
  if (guess <= 0 || price <= 0) return 0
  const factor = Math.abs(Math.log10(guess / price))
  return Math.max(0, Math.round(100 * (1 - factor)))
}

export const priceRules: GameRules = {
  guessSeconds: GUESS_SECONDS,
  revealSeconds: REVEAL_SECONDS,
  howTo: `Gissa vad en udda sak faktiskt såldes för, i kronor. Ni har ${GUESS_SECONDS} sekunder på er. Exakt rätt ger 100 poäng, och poängen minskar ju längre ifrån man är i procent. Tio gånger fel ger 0 poäng.`,
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
  scoreRound(guesses, itemId, target = findPriceItem(itemId)?.priceSek ?? 0) {
    const points: Record<string, number> = {}
    for (const [id, guess] of Object.entries(guesses)) points[id] = pricePoints(guess, target)
    return { target, points }
  },
}
