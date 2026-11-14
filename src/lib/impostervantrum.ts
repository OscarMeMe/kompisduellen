// Imposterjaktens väntrum i stilen Nattspanarna: replikerna under loggan, platserna runt bordet, sammanfattningen i
// mappen "Förbered fallet" och raden vid Starta jakten. Rena funktioner.

import { clueRoundsOf, difficultyName, type ImposterSettings } from '@/lib/imposterjakten'

// Replikerna under loggan, en i taget. Byts var IMPOSTER_LINE_MS.
export const IMPOSTER_LOBBY_LINES = [
  'Någon här inne ljuger. Vi vet bara inte vem än.',
  'Alla är misstänkta tills motsatsen är bevisad.',
  'Håll koll på den som ler för mycket.',
  'Ett ord för mycket kan fälla dig.',
  'Fallet öppnas så fort alla är på plats.',
  'Lita på magkänslan. Eller inte.',
  'Den som pratar mest har mest att dölja.',
]
export const IMPOSTER_LINE_MS = 6000

// Hur många platser som ritas runt bordet: alla som är med plus en ledig (minst fem, högst spelets största antal).
export function seatCount(players: number, maxPlayers: number): number {
  return Math.max(players, Math.min(maxPlayers, Math.max(5, players + 1)))
}

// Var platserna ligger runt bordet, i procent av rutan. Den första är längst ned (jag) och resten medurs.
export function seatPlaces(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (i / count) * Math.PI * 2
    return { x: 50 + Math.cos(angle) * 41, y: 50 + Math.sin(angle) * 39 }
  })
}

// Sammanfattningen längst ned i mappen: "Normal · 3 omgångar · 2 varv · Blandat".
export function caseSummary(settings: ImposterSettings, rounds: number): string {
  return [difficultyName(settings), `${rounds} ${rounds === 1 ? 'omgång' : 'omgångar'}`, `${clueRoundsOf(settings)} varv`, settings.category ?? 'Blandat'].join(' · ')
}

// Raden om spelarna i sammanfattningen när ni är för få (eller för många), annars null.
export function playersShortText(count: number, minPlayers: number, tooMany: boolean, maxPlayers?: number): string | null {
  if (tooMany) return `Ni är ${count}. Högst ${maxPlayers ?? 10} kan spela.`
  if (count >= minPlayers) return null
  return `Ni är ${count} av minst ${minPlayers}.`
}

// Den korta förklaringen under en avstängd Starta jakten.
export function startBlockedText(count: number, minPlayers: number, tooMany: boolean): string | null {
  if (tooMany) return 'Byt spel eller vänta tills någon lämnat.'
  if (count >= minPlayers) return null
  const missing = minPlayers - count
  return missing === 1 ? 'Bjud in en till för att starta.' : `Bjud in ${missing} till för att starta.`
}
