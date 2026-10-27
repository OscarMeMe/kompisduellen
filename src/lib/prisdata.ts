import items from './prisdata.json'

// Saker till "Gissa priset". Allt är riktiga försäljningar.
// Frågorna ligger i prisdata.json (samma fält som PriceItem nedan). Nya frågor granskas på /granska
// i utvecklingsläge och hamnar här när de godkänns.
//
// name: vad saken är (visas medan man gissar).
// year: året då försäljningen skedde eller priset gällde (visas alltid medan man gissar).
// clue: kort ledtråd med sammanhang (visas medan man gissar). Upprepa inte årtalet. Får inte avslöja priset.
// priceSek: priset i kronor. Utländska försäljningar räknas om med ungefärlig växelkurs vid försäljningen.
//   Gamla svenska vardagspriser anges som de var då, med decimaler vid behov (13 öre = 0.13).
// fact: max en mening som visas när rätt svar avslöjas.
// source: var uppgiften kommer ifrån, så att den går att dubbelkolla. Visas inte i spelet, bara intern dokumentation.
//
// Lägg gärna till fler, men bara sådant som går att belägga med en källa.
// Frågorna från och med nobelpris-1901 togs fram med ChatGPT och stickprovades mot källorna (oktober 2026).

export type PriceItem = {
  id: string
  emoji: string
  name: string
  year: number
  clue: string
  priceSek: number
  fact: string
  source: string
  image?: string
  imageCredit?: string
  imageSource?: string
}

export const PRICE_ITEMS: PriceItem[] = items

export function findPriceItem(id: string | null | undefined): PriceItem | undefined {
  return PRICE_ITEMS.find((item) => item.id === id)
}
