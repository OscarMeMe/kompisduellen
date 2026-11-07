import { describe, expect, it } from 'vitest'
import {
  arrangeHand,
  canJoin,
  moveCard,
  fanIndexAtPoint,
  fanLayout,
  handCardWidth,
  MIN_CARD_WIDTH,
  MIN_VISIBLE,
  nextSelection,
  selectionLabel,
  sortHand,
  type FanLayout,
  type FanSlot,
  fitSpread,
} from '@/lib/solfjader'
import type { TantCard } from '@/lib/tantpanik'

const card = (id: string, type: TantCard['type']): TantCard => ({ id, type })

describe('solfjädern', () => {
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [1280, 800],
  ]) {
    for (const count of [1, 4, 8, 12, 16]) {
      it(`${count} kort får plats på ${width} × ${height}, även när de lutar, och vart och ett syns tydligt`, () => {
        const layout = fanLayout(count, width, handCardWidth(width, height))
        const { slots, cardWidth: w, cardHeight: h } = layout
        expect(slots).toHaveLength(count)
        for (const slot of slots) {
          // Hur långt kortets övre hörn flyttar sig åt sidan när det lutar.
          const lean = Math.abs(Math.sin((slot.rotate * Math.PI) / 180)) * h
          expect(slot.x - lean).toBeGreaterThanOrEqual(-0.5)
          expect(slot.x + w + lean).toBeLessThanOrEqual(width + 0.5)
        }
        // Alltid en rad. Symbolen och färgen syns på varje kort utan förstoring, och med väldigt många kort på en telefon
        // syns ändå en femtedel av varje.
        expect(layout.rows).toBe(1)
        if (count > 1) expect(layout.step).toBeGreaterThanOrEqual(w * (count <= 12 ? MIN_VISIBLE : 0.2) - 0.01)
      })
    }
  }

  it('korten är större än förut och växer med skärmen', () => {
    expect(handCardWidth(360, 640)).toBeGreaterThan(100)
    expect(handCardWidth(390, 844)).toBeGreaterThan(handCardWidth(360, 640))
    expect(handCardWidth(1280, 800)).toBeGreaterThan(150)
    expect(handCardWidth(200, 400)).toBe(MIN_CARD_WIDTH)
  })

  it('överlappar mer ju fler kort det är, och ligger alltid i en rad', () => {
    expect(fanLayout(10, 600, 120).step).toBeLessThan(fanLayout(5, 600, 120).step)
    expect(fanLayout(4, 360, 122).rows).toBe(1)
    const many = fanLayout(16, 360, 122)
    expect(many.rows).toBe(1)
    expect(many.cardWidth).toBeLessThan(122)
    expect(fanLayout(12, 1280, 160).rows).toBe(1)
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
  // En punkt i kortets egen ruta (lx från mitten, ly uppåt från nederkanten) räknad om till rutans koordinater.
  function toBox(layout: FanLayout, slot: FanSlot, lx: number, ly: number) {
    const a = (slot.rotate * Math.PI) / 180
    const px = slot.x + layout.cardWidth / 2
    const py = layout.height - layout.bottom + slot.y
    return { x: px + lx * Math.cos(a) + ly * Math.sin(a), y: py + lx * Math.sin(a) - ly * Math.cos(a) }
  }
  function inside(layout: FanLayout, slot: FanSlot, point: { x: number; y: number }) {
    const a = (-slot.rotate * Math.PI) / 180
    const dx = point.x - (slot.x + layout.cardWidth / 2)
    const dy = point.y - (layout.height - layout.bottom + slot.y)
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    return Math.abs(lx) <= layout.cardWidth / 2 && ly <= 0 && ly >= -layout.cardHeight
  }

  for (const [count, width, cardWidth] of [
    [5, 390, 132],
    [8, 360, 122],
    [12, 360, 122],
    [16, 360, 122],
    [16, 1280, 180],
  ]) {
    it(`${count} kort på ${width} px: varje synlig del av ett kort väljer just det kortet`, () => {
      const layout = fanLayout(count, width, cardWidth)
      let checked = 0
      layout.slots.forEach((slot, i) => {
        for (const share of [0.07, 0.3, 0.5, 0.7, 0.85]) {
          const ly = share * layout.cardHeight
          for (let lx = -layout.cardWidth / 2 + 2; lx < layout.cardWidth / 2; lx += 4) {
            const point = toBox(layout, slot, lx, ly)
            // Bara där kortet syns, alltså inte under ett kort som ligger ovanpå.
            if (layout.slots.slice(i + 1).some((other) => inside(layout, other, point))) continue
            expect(fanIndexAtPoint(point.x, point.y, layout), `kort ${i} vid ${lx}, ${ly}`).toBe(i)
            checked++
          }
        }
      })
      expect(checked).toBeGreaterThan(count * 5)
    })
  }

  it('utanför korten väljs det närmaste', () => {
    const layout = fanLayout(5, 390, 132)
    const slot = layout.slots[2]
    expect(fanIndexAtPoint(slot.x + layout.cardWidth / 2, layout.height - 1, layout)).toBe(2)
    expect(fanIndexAtPoint(-50, layout.height - 10, layout)).toBe(0)
  })
})

describe('min egen ordning i handen', () => {
  const hand = [card('a', 'regnbage'), card('b', 'fika'), card('c', 'nadu')]

  it('utan sparad ordning sorteras handen', () => {
    expect(arrangeHand(hand, null).map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('följer min ordning, glömmer kort som försvunnit och lägger nya kort längst till höger', () => {
    expect(arrangeHand(hand, ['c', 'a', 'b']).map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(arrangeHand(hand, ['x', 'a']).map((c) => c.id)).toEqual(['a', 'b', 'c'])
    const more = [...hand, card('d', 'blanda')]
    expect(arrangeHand(more, ['c', 'a', 'b']).map((c) => c.id)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('flyttar ett kort till en ny plats', () => {
    expect(moveCard(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveCard(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveCard(['a', 'b', 'c'], 'b', 99)).toEqual(['a', 'c', 'b'])
    expect(moveCard(['a', 'b'], 'x', 0)).toEqual(['a', 'b'])
  })
})

describe('Nope!-fönstrets kort (fitSpread)', () => {
  const spreads: [number[], number][] = [
    [[0], 0.42],
    [[-10, 10], 0.42],
    [[-14, 0, 14], 0.42],
  ]
  for (const [width, height] of [
    [1280, 520],
    [360, 260],
    [240, 180],
  ]) {
    for (const [angles, shift] of spreads) {
      it(`${angles.length} kort ryms med marginal i ${width}×${height}`, () => {
        const fit = fitSpread(width, height, angles, shift)
        expect(fit.width).toBeLessThanOrEqual(width * 0.94 + 0.01)
        expect(fit.height).toBeLessThanOrEqual(height * 0.94 + 0.01)
        expect(fit.card).toBeGreaterThan(0)
        // Kortet ligger inne i solfjäderns mått.
        expect(fit.left).toBeGreaterThanOrEqual(0)
        expect(fit.top).toBeGreaterThanOrEqual(0)
        expect(fit.left + fit.card).toBeLessThanOrEqual(fit.width + 0.01)
      })
    }
  }
})
