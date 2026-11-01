// Spelregler för "Gissa priset": alla gissar vad något kostar, kostade förr eller såldes för,
// sedan avslöjas priset.

import { formatSek, isValidPrice, roundSek } from '@/lib/belopp'
import { findPriceItem, GAME_ITEMS } from '@/lib/prisdata'
import type { GameRules } from '@/lib/spelregler'

// Längre tider än i Närmast vinner, så att man hinner skriva ett belopp och läsa faktameningen.
// Värden kan välja en annan svarstid i lobbyn.
const GUESS_SECONDS = 30
export const GUESS_SECONDS_OPTIONS = [30, 45, 60] as const
const REVEAL_SECONDS = 12
// Så många av de senast visade frågorna spärras fortfarande när listan med frågor börjar om.
export const RECENT_AFTER_RESET = 20

// Poäng efter hur många GÅNGER fel man är, så att halva priset straffas lika hårt som dubbla priset.
// Kurvan går genom de här punkterna (gånger fel, poäng). Däremellan räknas poängen mjukt ut med en
// monoton kubisk kurva på logaritmen av "gånger fel", så att den aldrig svänger över eller under punkterna.
// Inom 5 procent fel (åt vilket håll som helst) ger 100. Fyra gånger fel eller mer ger 0.
const CURVE: readonly (readonly [number, number])[] = [
  [1, 100],
  [1 / 0.95, 100], // 5 procent för lågt (och lite mer än 5 procent för högt är fortfarande 100)
  [1.1, 85],
  [1.25, 60],
  [1.5, 40],
  [2, 25],
  [3, 10],
  [4, 0],
]
const CURVE_X = CURVE.map(([times]) => Math.log(times))
const CURVE_Y = CURVE.map(([, points]) => points)
const CURVE_SLOPES = monotoneSlopes(CURVE_X, CURVE_Y)

// Lutningen i varje punkt för en kurva som aldrig svänger över punkterna (Fritsch och Carlson).
function monotoneSlopes(x: number[], y: number[]): number[] {
  const n = x.length
  const delta = x.slice(1).map((xi, i) => (y[i + 1] - y[i]) / (xi - x[i]))
  const slopes = new Array<number>(n)
  slopes[0] = delta[0]
  slopes[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      slopes[i] = 0
    } else {
      const h0 = x[i] - x[i - 1]
      const h1 = x[i + 1] - x[i]
      const w1 = 2 * h1 + h0
      const w2 = h1 + 2 * h0
      slopes[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i])
    }
  }
  return slopes
}

export function pricePoints(guess: number, price: number): number {
  if (guess <= 0 || price <= 0) return 0
  const x = Math.abs(Math.log(guess / price))
  if (x >= CURVE_X[CURVE_X.length - 1]) return 0
  let i = 0
  while (x > CURVE_X[i + 1]) i++
  const h = CURVE_X[i + 1] - CURVE_X[i]
  const t = (x - CURVE_X[i]) / h
  const t2 = t * t
  const t3 = t2 * t
  const points =
    (2 * t3 - 3 * t2 + 1) * CURVE_Y[i] +
    (t3 - 2 * t2 + t) * h * CURVE_SLOPES[i] +
    (-2 * t3 + 3 * t2) * CURVE_Y[i + 1] +
    (t3 - t2) * h * CURVE_SLOPES[i + 1]
  return Math.min(100, Math.max(0, Math.round(points)))
}

// Poängen i spelet: från en krona räknas både priset och gissningen i hela kronor, så 2 kr ger fullpoäng när priset
// är 2,44 kr. Under en krona räknas ören.
export function scoredPoints(guess: number, price: number): number {
  return pricePoints(roundSek(guess), roundSek(price))
}

// Hur många tiopotenser fel gissningen är (0 = exakt, 1 = tio gånger fel). Används för att jämföra hur långt
// ifrån olika gissningar var (insikterna), med samma ordning som poängen.
export function priceDistance(guess: number, price: number): number {
  return Math.abs(Math.log10(guess / price))
}

export const priceRules: GameRules = {
  guessSeconds: GUESS_SECONDS,
  guessSecondsOptions: GUESS_SECONDS_OPTIONS,
  revealSeconds: REVEAL_SECONDS,
  soloPractice: true,
  howTo: (seconds) =>
    `Gissa priset i kronor: vad något kostar i dag, vad det kostade förr eller vad det har sålts för. Historiska svenska priser anges i dåtidens kronor, utan inflationsjustering. Ni har ${seconds} sekunder på er. Ju närmare rätt pris, desto fler poäng. Fullträff ger 100.`,
  // Stämmer med CURVE i pricePoints. Testas i gissa-priset.test.ts.
  scoringDetails: [
    'Poängen räknas på hur många gånger fel du är, inte på antal kronor. Att gissa 200 kr när priset är 100 kr är lika fel som att gissa 50 kr.',
    'Inom 5 procent fel ger 100 poäng. 10 procent fel ger 85 och 25 procent fel ger 60.',
    'En och en halv gång fel ger 40. Halva eller dubbla priset ger 25, tre gånger fel ger 10 och fyra gånger fel eller mer ger 0.',
    'Poängen räknas ut mjukt mellan de här stegen, så 20 procent fel ligger mellan 85 och 60.',
    'Från 1 krona räknas priset och gissningen i hela kronor, så 2,44 kr räknas som 2 kr. Under 1 krona räknas ören.',
  ],
  isValidGuess: isValidPrice,

  // En slumpad sak som inte varit med än. När alla använts börjar listan om, men de senaste (RECENT_AFTER_RESET) står
  // kvar som använda, så att en fråga aldrig kommer tillbaka direkt efter omstarten. Exempelfrågorna är inte med (GAME_ITEMS).
  pickItem(usedItemIds) {
    let unused = GAME_ITEMS.filter((item) => !usedItemIds.includes(item.id))
    let used = usedItemIds
    if (unused.length === 0) {
      used = usedItemIds.slice(-RECENT_AFTER_RESET)
      unused = GAME_ITEMS.filter((item) => !used.includes(item.id))
    }
    const item = unused[Math.floor(Math.random() * unused.length)]
    return { itemId: item.id, usedItemIds: [...used, item.id] }
  },

  // Alla får 0–100 poäng efter hur nära priset på rundans sak de var.
  // Från en krona räknas mot priset i hela kronor, så att 2 kr ger fullpoäng när priset är 2,44 kr.
  scoreRound(guesses, itemId, price = findPriceItem(itemId)?.priceSek ?? 0) {
    const target = roundSek(price)
    const points: Record<string, number> = {}
    for (const [id, guess] of Object.entries(guesses)) points[id] = scoredPoints(guess, target)
    return { target, points }
  },

  distance: (guess, target) => priceDistance(roundSek(guess), roundSek(target)),
  // Hälften eller dubbla priset (25 poäng) eller längre ifrån.
  notableMiss: Math.log10(2),
  isBullseye: (guess, target) => scoredPoints(guess, target) === 100,
  formatValue: formatSek,
  // Rätt pris som det står i facit, med ören (target är i hela kronor från en krona).
  formatTarget: (target, itemId) => formatSek(findPriceItem(itemId)?.priceSek ?? target),
  itemName: (itemId) => findPriceItem(itemId)?.name ?? null,
}
