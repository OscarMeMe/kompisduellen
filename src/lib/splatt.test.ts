import { describe, expect, it } from 'vitest'
import { placeSplat, SPLAT_MAX_SIZE } from '@/lib/splatt'

const phone = { width: 390, height: 844 }
const laptop = { width: 1366, height: 768 }

describe('placeSplat i spelet', () => {
  it('lägger splatten under tidsstapeln, så stor som får plats', () => {
    expect(placeSplat(laptop, 44, [], 'spel')).toEqual({ top: 52, size: SPLAT_MAX_SIZE.spel })
    expect(placeSplat(phone, null, [], 'spel')).toEqual({ top: 8, size: 312 })
  })

  it('krymper så att den slutar ovanför svarsdelen', () => {
    // Svarsdelen börjar 230 px ner: plats mellan 52 och 222.
    expect(placeSplat(laptop, 44, [{ top: 230, bottom: 600 }], 'spel')).toEqual({ top: 52, size: 170 })
  })

  it('får inte plats när svarsdelen ligger för högt, eller redan överst', () => {
    expect(placeSplat(laptop, 44, [{ top: 150, bottom: 600 }], 'spel')).toBeNull()
    expect(placeSplat(phone, 44, [{ top: 0, bottom: 300 }], 'spel')).toBeNull()
    expect(placeSplat({ width: 390, height: 170 }, 44, [], 'spel')).toBeNull()
  })

  it('bryr sig inte om sådant som ligger utanför skärmen eller ovanför tidsstapeln', () => {
    const shields = [
      { top: -400, bottom: 20 },
      { top: 900, bottom: 1200 },
    ]
    expect(placeSplat(laptop, 44, shields, 'spel')).toEqual({ top: 52, size: 360 })
  })

  it('är aldrig bredare än 80 procent av skärmen', () => {
    expect(placeSplat({ width: 140, height: 800 }, null, [], 'spel')).toBeNull()
    expect(placeSplat({ width: 300, height: 800 }, null, [], 'spel')?.size).toBe(240)
  })
})

describe('placeSplat i lobbyn', () => {
  it('blir stor och täcker det som finns där, även svarsdelen', () => {
    expect(placeSplat(laptop, null, [{ top: 100, bottom: 600 }], 'lobby')).toEqual({ top: 92, size: 461 })
    expect(placeSplat(phone, null, [], 'lobby')).toEqual({ top: 154, size: 332 })
    expect(placeSplat({ width: 1920, height: 1080 }, null, [], 'lobby')?.size).toBe(SPLAT_MAX_SIZE.lobby)
  })

  it('är större än i spelet', () => {
    expect(SPLAT_MAX_SIZE.lobby).toBeGreaterThan(SPLAT_MAX_SIZE.spel)
  })
})
