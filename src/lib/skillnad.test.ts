import { describe, expect, it } from 'vitest'
import { differenceText } from '@/lib/skillnad'

describe('skillnad mot rätt pris', () => {
  it('jämför med det exakta priset, inte det avrundade', () => {
    expect(differenceText(10, 1.25)).toBe('8 gånger för högt')
    expect(differenceText(1.25, 1.25)).toBe('Exakt rätt!')
    expect(differenceText(0.5, 0.5)).toBe('Exakt rätt!')
    expect(differenceText(1, 0.5)).toBe('2 gånger för högt')
  })

  it('räknar örena även när kronan stämmer', () => {
    expect(differenceText(1, 1.25)).toBe('20 % för lågt')
    expect(differenceText(2, 2.44)).toBe('18 % för lågt')
    expect(differenceText(2, 1.25)).toBe('60 % för högt')
  })

  it('visar procent när gissningen är nära', () => {
    expect(differenceText(75, 79)).toBe('5 % för lågt')
    expect(differenceText(95, 79)).toBe('20 % för högt')
  })

  it('visar gånger när gissningen är långt ifrån, åt båda håll', () => {
    expect(differenceText(158, 79)).toBe('2 gånger för högt')
    expect(differenceText(30, 79)).toBe('2,6 gånger för lågt')
    expect(differenceText(7900, 79)).toBe('100 gånger för högt')
  })

  it('skiljer exakt rätt från nästan exakt', () => {
    expect(differenceText(79, 79)).toBe('Exakt rätt!')
    expect(differenceText(1001, 1000)).toBe('Nästan exakt')
  })
})
