// Belopp i Gissa priset: tolkning av gissningar och visning av kronor.
// Man skriver alltid i kronor. Komma eller punkt ger ören, t.ex. 0,24 = 24 öre.
// Gissningar och priser visas som de är (1,25 kr). Poängen räknas däremot i hela kronor från en krona (roundSek),
// se scoredPoints i gissa-priset.ts.
// Rena funktioner utan React, så att de är lätta att testa och läsa.

// Högsta och lägsta gissning i kronor.
export const MIN_PRICE = 0.01
export const MAX_PRICE = 100_000_000

// Max antal siffror före och efter decimaltecknet i rutan.
const MAX_WHOLE_DIGITS = String(MAX_PRICE).length
const MAX_DECIMAL_DIGITS = 2

// Delar upp det man skrivit i kronor och ören. Mellanslag ignoreras.
// Första komma eller punkt är decimaltecknet, och efter det räknas högst två siffror.
function splitTyped(text: string): { whole: string; decimals: string | undefined } {
  const [wholePart, ...rest] = text.replace(/\s/g, '').split(/[.,]/)
  return {
    whole: wholePart.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_WHOLE_DIGITS),
    decimals: rest.length > 0 ? rest.join('').replace(/\D/g, '').slice(0, MAX_DECIMAL_DIGITS) : undefined,
  }
}

// Det som får stå i en beloppsruta medan man skriver eller klistrar in: siffror, mellanslag och komma eller punkt
// för ören. Allt annat, som bokstäver och "kr", tas bort direkt.
export function cleanTypedAmount(text: string): string {
  return text.replace(/[^\d\s.,]/g, '')
}

// "1 500" -> 1500, "4,5" -> 4.5 och "0.24" -> 0.24. Tom ruta ger NaN.
export function parseTypedNumber(text: string): number {
  const { whole, decimals } = splitTyped(text)
  if (!whole && !decimals) return Number.NaN
  return Number(`${whole || '0'}.${decimals || '0'}`)
}

// Hela kronor från en krona och uppåt, annars hela ören. Så räknas poängen i Gissa priset.
export function roundSek(value: number): number {
  return value >= 1 ? Math.round(value) : Math.round(value * 100) / 100
}

// Visar det man skriver med mellanslag mellan tusental, men behåller ett påbörjat decimalkomma.
export function formatTypedNumber(text: string): string {
  const { whole, decimals } = splitTyped(text)
  const grouped = whole ? Number(whole).toLocaleString('sv-SE') : ''
  if (decimals === undefined) return grouped
  return `${grouped || '0'},${decimals}`
}

// Kronor med upp till två decimaler (gamla priser kan vara några ören).
export function isValidPrice(value: number): boolean {
  const hasMaxTwoDecimals = Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  return Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE && hasMaxTwoDecimals
}

// "0.24" -> "24 öre", "1.25" -> "1,25 kr", "13.7" -> "13,70 kr" och "67000000" -> "67 000 000 kr"
export function formatSek(value: number): string {
  if (value < 1) return `${Math.round(value * 100)} öre`
  if (!Number.isInteger(value)) return formatExactSek(value)
  return `${value.toLocaleString('sv-SE')} kr`
}

// Ett belopp med ören, t.ex. "2,44 kr".
export function formatExactSek(value: number): string {
  return `${value.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`
}
