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
const RADIUS_X = 40
const RADIUS_Y = 39

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

// En pil mellan två platser, förkortad i båda ändar så att den inte går in i figurerna. inset i procent.
export function arrowBetween(from: Seat, to: Seat, inset: number): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  return {
    x1: round(from.x + ux * inset),
    y1: round(from.y + uy * inset),
    x2: round(to.x - ux * inset),
    y2: round(to.y - uy * inset),
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
