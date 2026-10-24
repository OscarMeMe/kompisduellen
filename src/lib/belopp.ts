// Omräkning av gissningar i Gissa priset. Man skriver ett tal och väljer en enhet,
// t.ex. 24 + öre = 0,24 kr eller 4,5 + miljoner = 4 500 000 kr.
// Rena funktioner utan React, så att de är lätta att testa och läsa.

import { formatSek, formatSekShort } from '@/lib/prisdata'

export type PriceUnit = 'ore' | 'kr' | 'tusen' | 'miljoner' | 'miljarder'

export const PRICE_UNITS: { id: PriceUnit; label: string; factor: number }[] = [
  { id: 'ore', label: 'öre', factor: 0.01 },
  { id: 'kr', label: 'kr', factor: 1 },
  { id: 'tusen', label: 'tusen', factor: 1_000 },
  { id: 'miljoner', label: 'miljoner', factor: 1_000_000 },
  { id: 'miljarder', label: 'miljarder', factor: 1_000_000_000 },
]

export const DEFAULT_UNIT: PriceUnit = 'kr'

// Max antal siffror före och efter decimaltecknet i rutan.
const MAX_WHOLE_DIGITS = 13
const MAX_DECIMAL_DIGITS = 2

// Delar upp det man skrivit i heltal och decimaler. Mellanslag ignoreras,
// och komma eller punkt fungerar som decimaltecken.
function splitTyped(text: string): { whole: string; decimals: string | undefined } {
  const [whole = '', decimals] = text.replace(/\s/g, '').replace('.', ',').split(',')
  return {
    whole: whole.replace(/\D/g, '').slice(0, MAX_WHOLE_DIGITS),
    decimals: decimals === undefined ? undefined : decimals.replace(/\D/g, '').slice(0, MAX_DECIMAL_DIGITS),
  }
}

// "1 500" -> 1500, "4,5" -> 4.5 och "0.24" -> 0.24. Tom ruta ger NaN.
export function parseTypedNumber(text: string): number {
  const { whole, decimals } = splitTyped(text)
  if (!whole && !decimals) return Number.NaN
  return Number(`${whole || '0'}.${decimals || '0'}`)
}

// Visar det man skriver med mellanslag mellan tusental, men behåller ett påbörjat decimalkomma.
export function formatTypedNumber(text: string): string {
  const { whole, decimals } = splitTyped(text)
  const grouped = whole ? Number(whole).toLocaleString('sv-SE') : ''
  if (decimals === undefined) return grouped
  return `${grouped || '0'},${decimals}`
}

// Talet gånger enheten, i kronor avrundat till hela ören.
export function toKronor(amount: number, unit: PriceUnit): number {
  if (!Number.isFinite(amount)) return Number.NaN
  const factor = PRICE_UNITS.find((u) => u.id === unit)?.factor ?? 1
  return Math.round(amount * factor * 100) / 100
}

// Det tolkade beloppet som text, t.ex. "= 24 öre" eller "= 12 000 000 000 kr (12 miljarder)".
export function describeKronor(kronor: number): string {
  if (kronor >= 1_000_000) return `= ${formatSek(kronor)} (${formatSekShort(kronor).replace(/ kr$/, '')})`
  return `= ${formatSek(kronor)}`
}
