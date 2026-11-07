import { describe, expect, it } from 'vitest'
import { chairCount, chairPlaces, TANT_LOBBY_LINES, waitingText } from '@/lib/tantvantrum'

describe('Exploderande Tanters väntrum', () => {
  it('har stolar för alla och en ledig, minst fyra och högst tio', () => {
    expect(chairCount(1, 10)).toBe(4)
    expect(chairCount(5, 10)).toBe(6)
    expect(chairCount(10, 10)).toBe(10)
  })

  it('ställer stolarna runt bordet, den första längst ned', () => {
    const places = chairPlaces(4)
    expect(places).toHaveLength(4)
    expect(places[0].y).toBeCloseTo(90)
    expect(places[0].x).toBeCloseTo(50)
    for (const place of places) {
      expect(place.x).toBeGreaterThanOrEqual(10)
      expect(place.x).toBeLessThanOrEqual(90)
    }
  })

  it('säger vad man kan göra när man är för få', () => {
    expect(waitingText(1, 2)).toBe('Ni är 1. Bjud in en kompis eller lägg till en bot!')
    expect(waitingText(2, 2)).toBeNull()
  })

  it('har roliga rader utan tankstreck', () => {
    expect(TANT_LOBBY_LINES.length).toBeGreaterThan(5)
    for (const line of TANT_LOBBY_LINES) expect(line).not.toMatch(/ [–—] /)
  })
})
