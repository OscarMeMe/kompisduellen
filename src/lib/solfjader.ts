// Handen i Exploderande Tanter visas som en solfjäder längst ner på skärmen. Här räknas var korten hamnar, i vilken
// ordning de ligger och vilka kort som kan väljas tillsammans. Rena funktioner, så att de är lätta att testa.

import { isCombo, type TantCard } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES, type CardType } from '@/lib/tantpanik-kort'

// Kortens storlek i solfjädern (px), i kortbildernas format 107 × 147. Samma mått som klasserna i Solfjader.tsx (w-21 h-29).
export const FAN_CARD_WIDTH = 84
export const FAN_CARD_HEIGHT = 116
// Plats på sidorna, så att de yttersta korten inte når kanten när de lutar.
export const FAN_SIDE = 26
// Störst avstånd mellan korten. Med fler kort krymper avståndet, så att alla får plats.
const MAX_STEP = FAN_CARD_WIDTH * 0.72
// Hur mycket ett kort lutar per steg från mitten, och mest totalt åt varje håll (grader).
const MAX_ANGLE_STEP = 5
const MAX_ANGLE = 12
// Hur mycket de yttersta korten sjunker (px), så att solfjädern blir en båge.
const ARC = 10

export type FanSlot = { x: number; rotate: number; y: number }
export type FanLayout = { step: number; slots: FanSlot[] }

// Var varje kort ligger: x är kortets vänstra kant i en ruta som är width bred.
export function fanLayout(count: number, width: number): FanLayout {
  if (count === 0) return { step: 0, slots: [] }
  const usable = Math.max(FAN_CARD_WIDTH, width - FAN_SIDE * 2)
  const step = count > 1 ? Math.min(MAX_STEP, (usable - FAN_CARD_WIDTH) / (count - 1)) : 0
  const total = FAN_CARD_WIDTH + step * (count - 1)
  const start = (width - total) / 2
  const mid = (count - 1) / 2
  const angleStep = count > 1 ? Math.min(MAX_ANGLE_STEP, MAX_ANGLE / mid) : 0
  const slots = Array.from({ length: count }, (_, i) => {
    const offset = i - mid
    return { x: start + i * step, rotate: offset * angleStep, y: mid > 0 ? (offset / mid) ** 2 * ARC : 0 }
  })
  return { step, slots }
}

// Kortet under fingret: varje kort äger sin synliga remsa, och det sista hela sin bredd.
export function fanIndexAt(x: number, layout: FanLayout): number {
  const { slots, step } = layout
  if (slots.length === 0) return -1
  if (step === 0) return 0
  const index = Math.floor((x - slots[0].x) / step)
  return Math.max(0, Math.min(slots.length - 1, index))
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
