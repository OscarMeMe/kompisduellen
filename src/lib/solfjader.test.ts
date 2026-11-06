import { describe, expect, it } from 'vitest'
import { canJoin, FAN_CARD_HEIGHT, FAN_CARD_WIDTH, fanIndexAt, fanLayout, nextSelection, selectionLabel, sortHand } from '@/lib/solfjader'
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
    const hand = [card('a', 'bingo'), card('b', 'fika'), card('c', 'vild'), card('d', 'bingo'), card('e', 'nadu')]
    expect(sortHand(hand).map((c) => c.type)).toEqual(['fika', 'nadu', 'bingo', 'bingo', 'vild'])
  })

  it('tantkort kan väljas tillsammans med samma sort eller en Vild tant', () => {
    const hand = [card('a', 'bingo'), card('b', 'bingo'), card('c', 'vild'), card('d', 'kaffe'), card('e', 'blanda')]
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
    expect(selectionLabel(['bingo'])).toBeNull()
    expect(selectionLabel(['bingo', 'vild'])).toBe('Spela par')
    expect(selectionLabel(['bingo', 'bingo', 'vild'])).toBe('Spela tretal')
    expect(selectionLabel(['vild', 'vild'])).toBeNull()
    expect(canJoin(['vild', 'vild'])).toBe(true)
    expect(canJoin(['vild', 'blanda'])).toBe(false)
  })
})
