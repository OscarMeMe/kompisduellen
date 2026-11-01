// Imposterjaktens bord: var spelarna sitter i ringen runt bordet. Rena funktioner, ritas av Bord.tsx.
//
// Jag sitter alltid längst ner (närmast tummen), och de andra sitter medurs i turordning. Den som inte är med i
// omgången ser bordet med den första i turordningen längst ner. Positionerna är i procent av bordets ruta, med
// mittpunkten i 50, 50.

export type Seat = {
  id: string
  // Vinkeln i grader på skärmen: 90 är längst ner, 180 till vänster, 270 överst och 0 till höger.
  angle: number
  x: number
  y: number
}

// Fler än så här många spelare får mindre figurer, så att 10 spelare ryms på en smal mobil.
export const SMALL_SEATS_FROM = 7

// Ringens radie i procent av rutans bredd och höjd.
const RADIUS_X = 43
const RADIUS_Y = 42

export function seatLayout(order: readonly string[], meId: string): Seat[] {
  const start = Math.max(0, order.indexOf(meId))
  const seated = [...order.slice(start), ...order.slice(0, start)]
  return seated.map((id, i) => {
    const angle = (90 + (i * 360) / seated.length) % 360
    const radians = (angle * Math.PI) / 180
    return {
      id,
      angle,
      x: round(50 + RADIUS_X * Math.cos(radians)),
      y: round(50 + RADIUS_Y * Math.sin(radians)),
    }
  })
}

// Små figurer vid många spelare.
export function smallSeats(count: number): boolean {
  return count >= SMALL_SEATS_FROM
}

// En böjd pil mellan två platser, som ett SVG-spår. Den bågnar bort från bordets mitt, så att pilarna går runt bordet och
// inte korsar varandra i onödan. Den börjar och slutar inset (procent) från platsens mitt, alltså vid figurens kant.
export function curvedArrow(from: Seat, to: Seat, inset: number): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  // Normalen som pekar bort från mitten. Går pilen rakt över mitten bågnar den åt höger i färdriktningen.
  let nx = -dy / length
  let ny = dx / length
  if (nx * (midX - 50) + ny * (midY - 50) < 0) {
    nx = -nx
    ny = -ny
  }
  // Bågens topp ska hamna utanför bordet, som har en radie på knappt 30 procent. Toppen ligger halvvägs till kontrollpunkten.
  const fromCenter = Math.hypot(midX - 50, midY - 50)
  const offset = Math.max(length * 0.32, (31 - fromCenter) * 2)
  const cx = midX + nx * offset
  const cy = midY + ny * offset
  const toward = (seat: Seat) => {
    const distance = Math.hypot(cx - seat.x, cy - seat.y) || 1
    return { x: round(seat.x + ((cx - seat.x) / distance) * inset), y: round(seat.y + ((cy - seat.y) / distance) * inset) }
  }
  const start = toward(from)
  const end = toward(to)
  return `M${start.x} ${start.y} Q${round(cx)} ${round(cy)} ${end.x} ${end.y}`
}

// Handen i Peka ut: en bit från den som pekar, i riktning mot den som pekas ut. degrees = vridning från rakt upp, medurs.
export function pointingHand(from: Seat, to: Seat, away: number): { x: number; y: number; degrees: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return {
    x: round(from.x + (dx / length) * away),
    y: round(from.y + (dy / length) * away),
    degrees: round((Math.atan2(dx, -dy) * 180) / Math.PI),
  }
}

// Allt en spelare sagt, på en rad: "regn · paraply · moln". Den som sagt sitt ord högt utan att skriva in det får en bock,
// och har man inte hunnit längre står det "✓ sa sitt".
export function clueLine(clues: readonly { kind: string; word: string | null }[]): string {
  if (clues.length === 1 && clues[0].kind === 'sagt' && !clues[0].word) return '✓ sa sitt'
  return clues.map((clue) => clue.word ?? (clue.kind === 'pass' ? 'pass' : '✓')).join(' · ')
}

// Etiketterna under en spelares namn, en per ord. Den senaste är sist.
export function clueLabels(clues: readonly { kind: string; word: string | null }[]): string[] {
  return clues.map((clue) => clue.word ?? (clue.kind === 'pass' ? 'pass' : '✓ sa sitt'))
}

// Det senaste ordet i omgången och vem som gav det, för mitten av bordet. null innan första ordet.
export function latestClue<C extends { player: string; kind: string; word: string | null }>(clues: readonly C[]): { text: string; player: string } | null {
  const clue = clues.at(-1)
  return clue ? { text: clueLabels([clue])[0], player: clue.player } : null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
