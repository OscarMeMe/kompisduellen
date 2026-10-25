// Belopp i Gissa priset: omräkning av gissningar och visning av kronor.
// Man skriver ett tal och väljer en enhet, t.ex. 24 + öre = 0,24 kr eller 4,5 + miljoner = 4 500 000 kr.
// Rena funktioner utan React, så att de är lätta att testa och läsa.

export type PriceUnit = 'ore' | 'kr' | 'tusen' | 'miljoner' | 'miljarder'

export const PRICE_UNITS: { id: PriceUnit; label: string; factor: number }[] = [
  { id: 'ore', label: 'öre', factor: 0.01 },
  { id: 'kr', label: 'kr', factor: 1 },
  { id: 'tusen', label: 'tusen', factor: 1_000 },
  { id: 'miljoner', label: 'miljoner', factor: 1_000_000 },
  { id: 'miljarder', label: 'miljarder', factor: 1_000_000_000 },
]

export const DEFAULT_UNIT: PriceUnit = 'kr'

// Högsta och lägsta gissning i kronor.
export const MIN_PRICE = 0.01
export const MAX_PRICE = 1_000_000_000_000

// Max antal siffror före och efter decimaltecknet i rutan.
const MAX_WHOLE_DIGITS = String(MAX_PRICE).length
const MAX_DECIMAL_DIGITS = 2

// Delar upp det man skrivit i heltal och decimaler. Mellanslag ignoreras.
// Komma och punkt fungerar båda som decimaltecken, men bara det sista räknas så och bara om
// det följs av högst två siffror. Annars är det tusentalsavgränsare: "1.500.000" och "1,500" blir
// heltal, medan "4,5" och "1.500,25" får decimaler.
function splitTyped(text: string): { whole: string; decimals: string | undefined } {
  const parts = text.replace(/\s/g, '').split(/[.,]/)
  const last = parts.length > 1 ? parts[parts.length - 1].replace(/\D/g, '') : undefined
  const hasDecimals = last !== undefined && last.length <= MAX_DECIMAL_DIGITS
  const wholeParts = hasDecimals ? parts.slice(0, -1) : parts
  return {
    whole: wholeParts.join('').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_WHOLE_DIGITS),
    decimals: hasDecimals ? last : undefined,
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

// Kronor med upp till två decimaler (gamla priser kan vara några ören).
export function isValidPrice(value: number): boolean {
  const hasMaxTwoDecimals = Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  return Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE && hasMaxTwoDecimals
}

// Det tolkade beloppet som text, t.ex. "= 24 öre" eller "= 12 000 000 000 kr (12 miljarder)".
export function describeKronor(kronor: number): string {
  if (kronor >= 1_000_000) return `= ${formatSek(kronor)} (${formatSekShort(kronor).replace(/ kr$/, '')})`
  return `= ${formatSek(kronor)}`
}

// "67 000 000" -> "67 miljoner kr"
export function formatSekShort(value: number): string {
  if (value >= 1_000_000_000) return `${formatDecimal(value / 1_000_000_000)} miljarder kr`
  if (value >= 1_000_000) return `${formatDecimal(value / 1_000_000)} miljoner kr`
  return formatSek(value)
}

export function formatSek(value: number): string {
  if (value < 1) return `${Math.round(value * 100)} öre`
  if (value < 100 && !Number.isInteger(value)) {
    return `${value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`
  }
  return `${Math.round(value).toLocaleString('sv-SE')} kr`
}

// En decimal under 100 ("18,5 miljarder"), annars heltal ("250 miljoner").
function formatDecimal(value: number): string {
  return value.toLocaleString('sv-SE', { maximumFractionDigits: value < 100 ? 1 : 0 })
}
