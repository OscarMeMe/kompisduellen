import items from './prisdata.json'

// Saker till "Gissa priset". Allt är riktiga försäljningar.
// Frågorna ligger i prisdata.json (samma fält som PriceItem nedan). Nya frågor granskas på /granska
// i utvecklingsläge och hamnar här när de godkänns.
//
// fraga: hela frågan med årtalet, t.ex. "Vad kostade Ikeas kudde Famnig 1998?". Visas som stor rubrik medan man gissar.
// name: vad saken är. Visas i facit och i höjdpunkterna efter matchen.
// year: året då försäljningen skedde eller priset gällde (visas alltid medan man gissar).
// clue: kort ledtråd med sammanhang. Visas under frågan som "Ledtråd: …" medan man gissar. Upprepa inte årtalet. Får inte avslöja priset.
// priceSek: priset i kronor. Utländska försäljningar räknas om med ungefärlig växelkurs vid försäljningen.
//   Gamla svenska vardagspriser anges som de var då, med decimaler vid behov (13 öre = 0.13).
// fact: max en mening som visas när rätt svar avslöjas.
// source: var uppgiften kommer ifrån, så att den går att dubbelkolla. Visas inte i spelet, bara intern dokumentation.
// question: äldre fält. Valfri frågeinledning i stället för "Vad kostade det", för det som inte köps (t.ex. "Hur stor var prissumman").
//   Årtalet läggs till efter: "Hur stor var prissumman år 1901?"
// image: valfri bild i public/prisbilder (webp, max 800 px bred). Visas liggande 2:1. Utan bild visas emojin.
//   Bara bilder från Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA), Unsplash eller Pexels.
// imageCredit: fotograf och licens, t.ex. "Foto: Namn, CC BY-SA 4.0". Bara när licensen kräver det.
// imageSource: bildens sida, där licensen går att kontrollera.
// imageNote: valfri rad under bilden när den inte visar just saken, t.ex. "Bilden visar en annan vas från Höganäs".
//
// dold: true döljer frågan i spelet (den slumpas aldrig fram) utan att den tas bort. Den syns kvar i datan och på /granska.
//
// exempel: 1, 2 eller 3 gör frågan till en av exempelrundans tre frågor på startsidan, i den ordningen.
//   Välj frågor där bilden tydligt visar just saken som frågas om.
//   Exempelfrågorna slumpas aldrig fram i spelet (se GAME_ITEMS).
// exempelLedtrad: valfri ledtråd som bara exempelrundan visar, t.ex. med årtalet ('Svenskt butikspris hösten 1990').
//   Saknas den visas clue. Spelets egen ledtråd påverkas inte.
//
// Lägg gärna till fler, men bara sådant som går att belägga med en källa.
// Frågorna från och med nobelpris-1901 togs fram med ChatGPT och stickprovades mot källorna (oktober 2026).

export type PriceItem = {
  id: string
  emoji: string
  name: string
  year: number
  // Hela frågan. Saknas den (t.ex. för en ny fråga i inkorgen) byggs den av name, question och year (se questionText).
  fraga?: string
  clue: string
  priceSek: number
  fact: string
  question?: string
  source: string
  image?: string
  imageCredit?: string
  imageSource?: string
  imageNote?: string
  exempel?: number
  dold?: boolean
  exempelLedtrad?: string
}

// Alla frågor i datan, även dolda.
export const ALL_PRICE_ITEMS: PriceItem[] = items

// Frågorna som kan dyka upp i spelet: alla utom de dolda.
export const PRICE_ITEMS: PriceItem[] = items.filter((item) => !item.dold)

export function findPriceItem(id: string | null | undefined): PriceItem | undefined {
  // Även dolda frågor hittas, så att en match som redan visar en sådan fråga inte tappar den.
  return ALL_PRICE_ITEMS.find((item) => item.id === id)
}

// Exempelrundans frågor i ordning: de som är markerade med exempel (1, 2, 3).
export const EXAMPLE_ITEMS: PriceItem[] = PRICE_ITEMS.filter((item) => item.exempel !== undefined).sort(
  (a, b) => (a.exempel ?? 0) - (b.exempel ?? 0),
)

// Frågorna som kan slumpas fram i spelet: de synliga utom exempelfrågorna, så att den som provat exempelrundan
// på startsidan inte redan kan svaret.
export const GAME_ITEMS: PriceItem[] = PRICE_ITEMS.filter((item) => item.exempel === undefined)

// Frågan som visas som rubrik. Utan fraga byggs den av saken, frågeinledningen och året.
export function questionText(item: PriceItem): string {
  return item.fraga ?? `${item.name}: ${item.question ?? 'Vad kostade det'} år ${item.year}?`
}
