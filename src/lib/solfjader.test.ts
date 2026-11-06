import { describe, expect, it } from 'vitest'
import {
  canJoin,
  FAN_BOTTOM,
  FAN_CARD_HEIGHT,
  FAN_CARD_WIDTH,
  fanIndexAt,
  fanIndexAtPoint,
  fanLayout,
  nextSelection,
  selectionLabel,
  sortHand,
} from '@/lib/solfjader'
import type { TantCard } from '@/lib/tantpanik'

const card = (id: string, type: TantCard['type']): TantCard => ({ id, type })

describe('solfjädern', () => {
  for (const width of [360, 390]) {
    for (const count of [1, 4, 8, 12, 16]) {
      it(`${count} kort får plats på ${width} px, även när de lutar`, () => {
        const { slots, step } = fanLayout(count, width)
        expect(slots).toHaveLength(count)
        for (const slot of slots) {
          // Hur långt kortets övre hörn flyttar sig åt sidan när det lutar.
          const lean = Math.abs(Math.sin((slot.rotate * Math.PI) / 180)) * FAN_CARD_HEIGHT
          expect(slot.x - lean).toBeGreaterThanOrEqual(-0.5)
          expect(slot.x + FAN_CARD_WIDTH + lean).toBeLessThanOrEqual(width + 0.5)
        }
        // Varje kort syns med en remsa som går att träffa med fingret.
        if (count > 1) expect(step).toBeGreaterThanOrEqual(14)
      })
    }
  }

  it('överlappar mer ju fler kort det är', () => {
    expect(fanLayout(16, 360).step).toBeLessThan(fanLayout(8, 360).step)
    expect(fanLayout(4, 390).step).toBeLessThanOrEqual(FAN_CARD_WIDTH)
  })

  it('kortet under fingret', () => {
    const layout = fanLayout(5, 360)
    expect(fanIndexAt(layout.slots[0].x + 2, layout)).toBe(0)
    expect(fanIndexAt(layout.slots[2].x + 2, layout)).toBe(2)
    expect(fanIndexAt(9999, layout)).toBe(4)
    expect(fanIndexAt(-50, layout)).toBe(0)
  })
})

describe('handens ordning och val', () => {
  it('likadana kort ligger bredvid varandra', () => {
    const hand = [card('a', 'regnbage'), card('b', 'fika'), card('c', 'vild'), card('d', 'regnbage'), card('e', 'nadu')]
    expect(sortHand(hand).map((c) => c.type)).toEqual(['fika', 'nadu', 'regnbage', 'regnbage', 'vild'])
  })

  it('tantkort kan väljas tillsammans med samma sort eller en Vild tant', () => {
    const hand = [card('a', 'regnbage'), card('b', 'regnbage'), card('c', 'vild'), card('d', 'kupong'), card('e', 'blanda')]
    let selected = nextSelection(hand, [], 'a')
    selected = nextSelection(hand, selected, 'c')
    selected = nextSelection(hand, selected, 'b')
    expect(selected).toEqual(['a', 'c', 'b'])
    expect(nextSelection(hand, selected, 'd')).toEqual(['d'])
    expect(nextSelection(hand, ['a'], 'e')).toEqual(['e'])
    expect(nextSelection(hand, ['a', 'b'], 'a')).toEqual(['b'])
  })

  it('knappens text följer valet', () => {
    expect(selectionLabel(['blanda'])).toBe('Spela')
    expect(selectionLabel(['regnbage'])).toBeNull()
    expect(selectionLabel(['regnbage', 'vild'])).toBe('Spela par')
    expect(selectionLabel(['regnbage', 'regnbage', 'vild'])).toBe('Spela tretal')
    expect(selectionLabel(['vild', 'vild'])).toBeNull()
    expect(canJoin(['vild', 'vild'])).toBe(true)
    expect(canJoin(['vild', 'blanda'])).toBe(false)
  })
})

describe('tryck på ett lutat kort', () => {
  const HEIGHT = 172
  // En punkt i kortets egen ruta (lx från mitten, ly uppåt från nederkanten) räknad om till rutans koordinater.
  function toBox(slot: { x: number; y: number; rotate: number }, lx: number, ly: number) {
    const a = (slot.rotate * Math.PI) / 180
    const px = slot.x + FAN_CARD_WIDTH / 2
    const py = HEIGHT - FAN_BOTTOM + slot.y
    return { x: px + lx * Math.cos(a) + ly * Math.sin(a), y: py + lx * Math.sin(a) - ly * Math.cos(a) }
  }
  function inside(slot: { x: number; y: number; rotate: number }, point: { x: number; y: number }) {
    const a = (-slot.rotate * Math.PI) / 180
    const dx = point.x - (slot.x + FAN_CARD_WIDTH / 2)
    const dy = point.y - (HEIGHT - FAN_BOTTOM + slot.y)
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    return Math.abs(lx) <= FAN_CARD_WIDTH / 2 && ly <= 0 && ly >= -FAN_CARD_HEIGHT
  }

  for (const [count, width] of [
    [5, 390],
    [12, 360],
    [16, 360],
  ]) {
    it(`${count} kort på ${width} px: varje synlig del av ett kort väljer just det kortet`, () => {
      const layout = fanLayout(count, width)
      let checked = 0
      layout.slots.forEach((slot, i) => {
        for (const ly of [10, 40, 70, 100, 115]) {
          for (let lx = -FAN_CARD_WIDTH / 2 + 2; lx < FAN_CARD_WIDTH / 2; lx += 4) {
            const point = toBox(slot, lx, ly)
            // Bara där kortet syns, alltså inte under ett kort längre till höger.
            if (layout.slots.slice(i + 1).some((other) => inside(other, point))) continue
            expect(fanIndexAtPoint(point.x, point.y, layout, HEIGHT), `kort ${i} vid ${lx}, ${ly}`).toBe(i)
            checked++
          }
        }
      })
      expect(checked).toBeGreaterThan(count * 5)
    })
  }

  it('under korten avgör sidled', () => {
    const layout = fanLayout(5, 390)
    expect(fanIndexAtPoint(layout.slots[2].x + 5, HEIGHT - 2, layout, HEIGHT)).toBe(fanIndexAt(layout.slots[2].x + 5, layout))
  })
})
