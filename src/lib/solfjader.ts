// Handen i Exploderande Tanter visas som en solfjäder längst ner på skärmen. Här räknas hur stora korten är, var de
// hamnar, i vilken ordning de ligger och vilka kort som kan väljas tillsammans. Rena funktioner, så att de är lätta att testa.

import { isCombo, type TantCard } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES, type CardType } from '@/lib/tantpanik-kort'

// Kortbildernas format, 107 × 147.
export const CARD_RATIO = 147 / 107
// Hur breda korten i handen är (px). De växer med skärmen, men aldrig mindre än så här på en telefon.
export const MIN_CARD_WIDTH = 104
export const MAX_CARD_WIDTH = 200
// Hellre så här smala kort i en rad än två rader (px).
const ONE_ROW_MIN_WIDTH = 88
// Med många kort på en smal skärm får korten krympa så här långt i två rader.
const SMALLEST_CARD_WIDTH = 72
// Så mycket av varje kort syns minst när de överlappar (andel av bredden): symbolen och färgen i övre vänstra hörnet,
// så att det går att se vad kortet är utan att förstora det.
export const MIN_VISIBLE = 0.27
// Störst avstånd mellan korten (andel av bredden), så att några få kort inte sprids ut över hela skärmen.
const MAX_STEP = 0.72
// Hur mycket ett kort lutar per steg från mitten, och mest totalt åt varje håll (grader).
const MAX_ANGLE_STEP = 4
const MAX_ANGLE = 8
// Hur mycket de yttersta korten sjunker (andel av kortets höjd), så att solfjädern blir en båge.
const ARC = 0.05
// Med två rader ligger den bakre så här mycket högre (andel av kortets höjd), så att symbolen och färgen syns ovanför
// den främre.
export const ROW_OFFSET = 0.34
// Plats ovanför korten (ingen: ett lyft kort sticker upp över bordet), och under dem, så att inget skärs av.
export const FAN_TOP = 0
export const FAN_BOTTOM = 10
// Så mycket av korten (andel av höjden) som ligger över bordets nederkant.
export const TABLE_OVERLAP = 0.3

// Hur breda korten är i en hand som är width bred, på en skärm som är screenHeight hög.
export function handCardWidth(width: number, screenHeight: number): number {
  return Math.round(Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, width * 0.34, screenHeight * 0.21)))
}

// y räknas från korten nederkant i den främre raden (negativt = högre upp).
export type FanSlot = { x: number; rotate: number; y: number }
export type FanLayout = {
  // Minsta avståndet mellan två kort i samma rad.
  step: number
  slots: FanSlot[]
  cardWidth: number
  cardHeight: number
  rows: 1 | 2
  // Rutans höjd, med plats för lyft kort ovanför och lutade kort nedanför.
  height: number
  // Avståndet från rutans nederkant till den främre radens nederkant.
  bottom: number
}

const radians = (degrees: number) => (degrees * Math.PI) / 180

// Plats på sidorna, så att de yttersta korten inte når kanten när de lutar.
function sideFor(cardHeight: number): number {
  return Math.ceil(Math.sin(radians(MAX_ANGLE)) * cardHeight) + 2
}

function stepFor(count: number, width: number, cardWidth: number): number {
  if (count <= 1) return 0
  const usable = Math.max(cardWidth, width - sideFor(cardWidth * CARD_RATIO) * 2)
  return Math.min(cardWidth * MAX_STEP, (usable - cardWidth) / (count - 1))
}

// Syns tillräckligt mycket av varje kort när count kort ligger i en rad?
function fits(count: number, width: number, cardWidth: number): boolean {
  return count <= 1 || stepFor(count, width, cardWidth) >= cardWidth * MIN_VISIBLE - 0.01
}

function row(count: number, width: number, cardWidth: number, cardHeight: number, baseY: number): FanSlot[] {
  const step = stepFor(count, width, cardWidth)
  const total = cardWidth + step * Math.max(0, count - 1)
  const start = (width - total) / 2
  const mid = (count - 1) / 2
  const angleStep = count > 1 ? Math.min(MAX_ANGLE_STEP, MAX_ANGLE / mid) : 0
  return Array.from({ length: count }, (_, i) => {
    const offset = i - mid
    return { x: start + i * step, rotate: offset * angleStep, y: baseY + (mid > 0 ? (offset / mid) ** 2 * ARC * cardHeight : 0) }
  })
}

// Var varje kort ligger: x är kortets vänstra kant i en ruta som är width bred. Får inte alla plats i en rad med
// tillräckligt mycket synligt av varje kort läggs de i två rader (den första halvan bakom och högre upp), och korten
// krymper bara om inte ens det räcker.
export function fanLayout(count: number, width: number, cardWidth = MIN_CARD_WIDTH): FanLayout {
  let w = cardWidth
  let rows: 1 | 2 = 1
  // Hellre lite mindre kort i en rad (ned till ONE_ROW_MIN_WIDTH) än två rader, så att bordet får plats på en telefon.
  while (!fits(count, width, w) && w > Math.min(cardWidth, ONE_ROW_MIN_WIDTH)) w -= 2
  if (!fits(count, width, w)) {
    rows = 2
    w = cardWidth
    const back = Math.ceil(count / 2)
    while (!fits(back, width, w) && w > SMALLEST_CARD_WIDTH) w -= 2
  }
  const h = Math.round(w * CARD_RATIO)
  const backCount = rows === 2 ? Math.ceil(count / 2) : 0
  const offset = Math.round(h * ROW_OFFSET)
  const slots =
    rows === 1 ? row(count, width, w, h, 0) : [...row(backCount, width, w, h, -offset), ...row(count - backCount, width, w, h, 0)]
  const steps = rows === 1 ? [stepFor(count, width, w)] : [stepFor(backCount, width, w), stepFor(count - backCount, width, w)]
  // Under korten: bågen och hörnet på ett lutat kort som sjunker.
  const bottom = FAN_BOTTOM + Math.ceil(ARC * h + (Math.sin(radians(MAX_ANGLE)) * w) / 2)
  return {
    step: Math.min(...steps.filter((step) => step > 0), w),
    slots,
    cardWidth: w,
    cardHeight: h,
    rows,
    height: FAN_TOP + h + (rows === 2 ? offset : 0) + bottom,
    bottom,
  }
}

// Kortet under fingret, med hänsyn till att korten lutar: punkten räknas om till varje korts egen, lutade ruta, och det
// översta kortet som träffas vinner (den främre raden och korten längre till höger ligger ovanpå). Utanför alla kort
// väljs kortet vars mitt är närmast. x och y räknas från rutans övre vänstra hörn.
export function fanIndexAtPoint(x: number, y: number, layout: FanLayout): number {
  const { slots, cardWidth: w, cardHeight: h } = layout
  const pivotY = (slot: FanSlot) => layout.height - layout.bottom + slot.y
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i]
    // Kortet vrids runt mitten av sin nederkant.
    const angle = radians(-slot.rotate)
    const dx = x - (slot.x + w / 2)
    const dy = y - pivotY(slot)
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle)
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle)
    if (Math.abs(localX) <= w / 2 && localY <= 0 && localY >= -h) return i
  }
  let best = -1
  let bestDistance = Infinity
  slots.forEach((slot, i) => {
    const distance = Math.hypot(x - (slot.x + w / 2), (y - (pivotY(slot) - h / 2)) * 0.5)
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  })
  return best
}

// Likadana kort bredvid varandra, i katalogens ordning (tantsorterna och Vild tant ligger tillsammans).
export function sortHand(hand: readonly TantCard[]): TantCard[] {
  const order = (type: CardType) => CARD_TYPES.indexOf(type)
  return [...hand].sort((a, b) => order(a.type) - order(b.type) || a.id.localeCompare(b.id))
}

// Kan de här korten bli ett par eller tretal om fler läggs till? Vilda tanter ensamma kan det, de väntar på en tant.
export function canJoin(types: readonly CardType[]): boolean {
  if (types.length > 3 || types.includes('tant')) return false
  const real = types.filter((type) => type !== 'vild')
  if (real.length === 0) return true
  if (!real.every((type) => type === real[0])) return false
  return !types.includes('vild') || CARDS[real[0]].kind === 'collect'
}

// Ett tryck på ett kort: välj det, lägg till det (om det passar ihop med de valda) eller ta bort det.
// Passar det inte ihop blir det ensamt valt i stället.
export function nextSelection(hand: readonly TantCard[], selected: readonly string[], tapped: string): string[] {
  if (selected.includes(tapped)) return selected.filter((id) => id !== tapped)
  const typeOf = (id: string) => hand.find((card) => card.id === id)?.type
  const types = [...selected, tapped].map(typeOf).filter((type) => type !== undefined)
  if (selected.length > 0 && canJoin(types)) return [...selected, tapped]
  return [tapped]
}

// Vad valet gör, för den stora knappen.
export function selectionLabel(types: readonly CardType[]): string | null {
  if (types.length === 1) return CARDS[types[0]].kind === 'action' ? 'Spela' : null
  if (!isCombo(types)) return null
  return types.length === 2 ? 'Spela par' : 'Spela tretal'
}

// Hjälptexten under ett eller flera valda kort som inte kan spelas så, och under förhandsvisningen. null = korten går
// att spela (då säger knappen vad som händer).
export function cardHint(types: readonly CardType[]): string | null {
  if (types.length === 0 || selectionLabel(types)) return null
  if (types.length > 1) {
    return types.every((type) => type === 'vild')
      ? 'Lägg till en riktig tant, så blir det ett par eller tretal.'
      : 'De här korten går inte att spela tillsammans.'
  }
  switch (CARDS[types[0]].kind) {
    case 'nope':
      return 'Nope! spelar du när någon annan precis spelat ett kort.'
    case 'defuse':
      return 'Desarmera används av sig själv när du drar en exploderande tant.'
    case 'joker':
      return 'Vild tant gör inget ensam. Tryck på en tant för att göra ett par eller tretal.'
    case 'trap':
      return 'Fällan gör inget ensam. Den slår igen om någon stjäl den från dig.'
    default:
      return 'Tryck på fler likadana kort (eller en Vild tant) för ett par eller tretal.'
  }
}

// Handen i min egen ordning: korten i order som fortfarande finns på handen, och nya kort längst till höger (i den ordning
// de kom). Utan sparad ordning sorteras handen som förut.
export function arrangeHand(hand: readonly TantCard[], order: readonly string[] | null): TantCard[] {
  if (order === null) return sortHand(hand)
  const byId = new Map(hand.map((card) => [card.id, card]))
  const kept = order.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })
  const known = new Set(order)
  return [...kept, ...hand.filter((card) => !known.has(card.id))]
}

// Flyttar ett kort till en ny plats i handen.
export function moveCard(ids: readonly string[], id: string, to: number): string[] {
  const rest = ids.filter((other) => other !== id)
  if (rest.length === ids.length) return [...ids]
  const index = Math.max(0, Math.min(rest.length, to))
  return [...rest.slice(0, index), id, ...rest.slice(index)]
}
