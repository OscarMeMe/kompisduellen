// Hur långt ifrån rätt pris en gissning var, i ord. Används i facit i Gissa priset och i exempelrundan på startsidan.
// Nära priset visas procent. Långt ifrån visas "gånger", eftersom t.ex. "100 % för lågt"
// ser ut som noll kronor och "2 400 % för högt" är svårt att greppa.
export function differenceText(guess: number, price: number): string {
  if (guess === price) return 'Exakt rätt!'
  const ratio = guess / price
  const times = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: n < 10 ? 1 : 0 })
  if (ratio >= 2) return `${times(ratio)} gånger för högt`
  if (ratio <= 0.5) return `${times(1 / ratio)} gånger för lågt`
  const diff = Math.round((ratio - 1) * 100)
  if (diff === 0) return 'Nästan exakt'
  return diff > 0 ? `${diff} % för högt` : `${Math.abs(diff)} % för lågt`
}
