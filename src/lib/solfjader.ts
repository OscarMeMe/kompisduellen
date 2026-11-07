// Handen i Exploderande Tanter visas som en solfjäder längst ner på skärmen. Här räknas hur stora korten är, var de
// hamnar, i vilken ordning de ligger och vilka kort som kan väljas tillsammans. Rena funktioner, så att de är lätta att testa.

import { isCombo, type TantCard } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES, type CardType } from '@/lib/tantpanik-kort'

// Kortbildernas format, 107 × 147.
export const CARD_RATIO = 147 / 107
// Hur breda korten i handen är (px). De växer med skärmen, men aldrig mindre än så här på en telefon.
export const MIN_CARD_WIDTH = 104
export const MAX_CARD_WIDTH = 200
// Med många kort på en smal skärm får korten krympa så här långt. Räcker inte det överlappar de mer (alltid en rad).
const SMALLEST_CARD_WIDTH = 64
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
// Plats ovanför korten (ingen: ett lyft kort sticker upp över bordet), och under dem, så att inget skärs av.
export const FAN_TOP = 0
export const FAN_BOTTOM = 18
// Så mycket av korten (andel av höjden) som ligger över bordets nederkant.
export const TABLE_OVERLAP = 0.42

// Hur breda korten är i en hand som är width bred, på en skärm som är screenHeight hög. På höga, smala telefoner
// (t.ex. 390 × 844) får korten mer av bredden, så att höjden används i stället för att stå tom ovanför handen.
export function handCardWidth(width: number, screenHeight: number): number {
  const share = screenHeight / width >= 1.9 ? 0.42 : 0.34
  return Math.round(Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, width * share, screenHeight * 0.21)))
}

// y räknas från korten nederkant i den främre raden (negativt = högre upp).
export type FanSlot = { x: number; rotate: number; y: number }
export type FanLayout = {
  // Minsta avståndet mellan två kort i samma rad.
  step: number
  slots: FanSlot[]
  cardWidth: number
  cardHeight: number
  // Alltid en rad (två rader blev för rörigt på en telefon).
  rows: 1
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

// Var varje kort ligger: x är kortets vänstra kant i en ruta som är width bred. Alltid en rad: får inte alla plats med
// tillräckligt mycket synligt av varje kort krymper korten (ned till SMALLEST_CARD_WIDTH), och sedan överlappar de mer.
// Två rader blev för rörigt på en telefon.
export function fanLayout(count: number, width: number, cardWidth = MIN_CARD_WIDTH): FanLayout {
  let w = cardWidth
  while (!fits(count, width, w) && w > Math.min(cardWidth, SMALLEST_CARD_WIDTH)) w -= 2
  const h = Math.round(w * CARD_RATIO)
  const step = stepFor(count, width, w)
  // Under korten: bågen och hörnet på ett lutat kort som sjunker.
  const bottom = FAN_BOTTOM + Math.ceil(ARC * h + (Math.sin(radians(MAX_ANGLE)) * w) / 2)
  return {
    step: step > 0 ? Math.min(step, w) : w,
    slots: row(count, width, w, h, 0),
    cardWidth: w,
    cardHeight: h,
    rows: 1,
    height: FAN_TOP + h + bottom,
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

// Likadana kort bredvid varandra. Utan random i katalogens ordning (tantsorterna och Vild tant ligger tillsammans).
// Med random hamnar grupperna i en slumpad ordning (knappen Sortera och första sorteringen), så att ingen kan lista ut
// var t.ex. Desarmera ligger av hur jag håller korten. Likadana kort ligger alltid bredvid varandra.
export function sortHand(hand: readonly TantCard[], random?: () => number): TantCard[] {
  let types: CardType[] = [...CARD_TYPES]
  if (random) {
    types = [...types]
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
  }
  const order = (type: CardType) => types.indexOf(type)
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

const SPREAD_RATIO = 147 / 107
// Marginal runt korten i ytan (andel).
const FIT_MARGIN = 0.94

// Nope!-fönstret: hur stort ett kort kan vara så att alla kort (förskjutna i sidled och lutade runt nederkantens mitt) ryms i ytan.
// Ger kortets bredd, solfjäderns yttre mått och var kortet ligger i den.
export function fitSpread(width: number, height: number, angles: number[], shiftPerCard: number) {
  const mid = (angles.length - 1) / 2
  // Hörnen för ett kort med bredden 1.
  let minX = 0
  let maxX = 1
  let minY = 0
  let maxY = SPREAD_RATIO
  angles.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180
    const shift = (i - mid) * shiftPerCard
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, SPREAD_RATIO],
      [1, SPREAD_RATIO],
    ]) {
      const dx = x - 0.5
      const dy = y - SPREAD_RATIO
      const px = 0.5 + shift + dx * Math.cos(a) - dy * Math.sin(a)
      const py = SPREAD_RATIO + dx * Math.sin(a) + dy * Math.cos(a)
      minX = Math.min(minX, px)
      maxX = Math.max(maxX, px)
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
    }
  })
  const spanX = maxX - minX
  const spanY = maxY - minY
  const card = Math.max(0, Math.min((width * FIT_MARGIN) / spanX, (height * FIT_MARGIN) / spanY, 420))
  return { card, width: spanX * card, height: spanY * card, left: -minX * card, top: -minY * card }
}
