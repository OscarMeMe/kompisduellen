import { describe, expect, it } from 'vitest'
import { placeSplat, SPLAT_MAX_SIZE } from '@/lib/splatt'

const phone = { width: 390, height: 844 }
const laptop = { width: 1366, height: 768 }

describe('placeSplat', () => {
  it('lägger splatten under tidsstapeln, så stor som får plats', () => {
    expect(placeSplat(laptop, 44, [])).toEqual({ top: 52, size: SPLAT_MAX_SIZE })
    expect(placeSplat(phone, null, [])).toEqual({ top: 8, size: 240 })
  })

  it('krymper så att den slutar ovanför svarsdelen', () => {
    // Svarsdelen börjar 230 px ner: plats mellan 52 och 222.
    expect(placeSplat(laptop, 44, [{ top: 230, bottom: 600 }])).toEqual({ top: 52, size: 170 })
  })

  it('får inte plats när svarsdelen ligger för högt, eller redan överst', () => {
    expect(placeSplat(laptop, 44, [{ top: 150, bottom: 600 }])).toBeNull()
    expect(placeSplat(phone, 44, [{ top: 0, bottom: 300 }])).toBeNull()
    expect(placeSplat({ width: 390, height: 170 }, 44, [])).toBeNull()
  })

  it('bryr sig inte om sådant som ligger utanför skärmen eller ovanför tidsstapeln', () => {
    expect(placeSplat(laptop, 44, [{ top: -400, bottom: 20 }, { top: 900, bottom: 1200 }])).toEqual({ top: 52, size: 240 })
  })

  it('är aldrig bredare än 70 procent av skärmen', () => {
    expect(placeSplat({ width: 160, height: 800 }, null, [])).toBeNull()
    expect(placeSplat({ width: 300, height: 800 }, null, [])?.size).toBe(210)
  })
})
