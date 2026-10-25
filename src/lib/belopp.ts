// Belopp i Gissa priset: tolkning av gissningar och visning av kronor.
// Man skriver alltid i kronor. Komma eller punkt ger ören, t.ex. 0,24 = 24 öre.
// Ören räknas bara under en krona. Från en krona och uppåt avrundas till hela kronor (4,75 = 5 kr).
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

// "1 500" -> 1500, "4,5" -> 5 och "0.24" -> 0.24. Tom ruta ger NaN.
export function parseTypedNumber(text: string): number {
  const { whole, decimals } = splitTyped(text)
  if (!whole && !decimals) return Number.NaN
  return roundSek(Number(`${whole || '0'}.${decimals || '0'}`))
}

// Hela kronor från en krona och uppåt, annars hela ören.
function roundSek(value: number): number {
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

// "0.24" -> "24 öre", "4.75" -> "5 kr" och "67000000" -> "67 000 000 kr"
export function formatSek(value: number): string {
  if (value < 1) return `${Math.round(value * 100)} öre`
  return `${Math.round(value).toLocaleString('sv-SE')} kr`
}
