// Botar i gissningsspelen (Närmast vinner och Gissa priset). Värdens webbläsare gissar åt dem under rundan, genom samma
// kontroll som spelarnas gissningar (addGuess). Rena funktioner, med slumpen som parameter.
//
// - Närmast vinner: ett slumpat tal 1–100. Det finns inget att veta i förväg, så Lätt, Normal och Svår gissar lika.
// - Gissa priset: rätt pris med en slumpad felmarginal, ±60 % för Lätt, ±30 % för Normal och ±15 % för Svår.

import { isValidPrice, MAX_PRICE, MIN_PRICE, roundSek } from '@/lib/belopp'
import { isValidGuess, type GameState } from '@/lib/match'
import { MAX_NUMBER, MIN_NUMBER } from '@/lib/narmast'
import { findPriceItem } from '@/lib/prisdata'
import type { BotLevel } from '@/lib/tantbot'

type Random = () => number

// Hur långt ifrån rätt pris botarna gissar högst i Gissa priset, som andel av priset.
export const PRICE_MARGIN: Record<BotLevel, number> = { latt: 0.6, normal: 0.3, svar: 0.15 }

// Botens gissning i rundan, eller null om spelet inte har gissningsbotar eller rundan saknar en fråga.
export function botGuess(state: Pick<GameState, 'game' | 'itemId'>, level: BotLevel, random: Random): number | null {
  if (state.game === 'narmast') return MIN_NUMBER + Math.floor(random() * (MAX_NUMBER - MIN_NUMBER + 1))
  if (state.game !== 'gissa-priset') return null
  const price = findPriceItem(state.itemId)?.priceSek
  if (price === undefined) return null
  const margin = PRICE_MARGIN[level]
  const guess = Math.min(MAX_PRICE, Math.max(MIN_PRICE, roundBotPrice(price * (1 + (random() * 2 - 1) * margin))))
  return isValidPrice(guess) && isValidGuess(state.game, guess) ? guess : roundSek(price)
}

// Som en människa skriver: hela kronor från 100 kr, tiotals ören under det och hela ören under en krona. Annars skulle
// en billig sak (3 kr) alltid avrundas till exakt rätt pris.
function roundBotPrice(value: number): number {
  if (value >= 100) return roundSek(value)
  if (value >= 1) return Math.round(value * 10) / 10
  return Math.round(value * 100) / 100
}

// När boten gissar, i ms efter att rundan startat: som en människa som tänker en stund, men alltid i god tid.
export function botGuessDelay(guessSeconds: number, random: Random): number {
  const latest = Math.max(3, Math.min(14, guessSeconds * 0.6))
  return (1.5 + random() * (latest - 1.5)) * 1000
}
