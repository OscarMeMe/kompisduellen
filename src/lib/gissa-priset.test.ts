import { describe, expect, it } from 'vitest'
import { pricePoints, priceRules } from '@/lib/gissa-priset'

// Kontrollerar att förklaringen under "Så räknas poängen" stämmer med beräkningen.
describe('poängen i Gissa priset', () => {
  it('ger 100 för exakt rätt och inom ungefär 2 procent', () => {
    expect(pricePoints(100, 100)).toBe(100)
    expect(pricePoints(102, 100)).toBe(100)
    expect(pricePoints(98, 100)).toBe(100)
    expect(pricePoints(103, 100)).toBeLessThan(100)
    expect(pricePoints(97, 100)).toBeLessThan(100)
  })

  it('räknar på hur många gånger fel, inte på kronor', () => {
    expect(pricePoints(200, 100)).toBe(85)
    expect(pricePoints(50, 100)).toBe(85)
    expect(pricePoints(1000, 100)).toBe(50)
    expect(pricePoints(10, 100)).toBe(50)
    expect(pricePoints(10_000, 100)).toBe(0)
    expect(pricePoints(1_000_000, 100)).toBe(0)
  })

  it('räknar priser från 1 krona i hela kronor', () => {
    // Kaffet 1930 kostade 2,44 kr: 2 kr ger fullpoäng.
    expect(priceRules.scoreRound({ a: 2 }, null, 2.44)).toEqual({ target: 2, points: { a: 100 } })
    // Mjölken 1930 kostade 24 öre, och där räknas ören.
    expect(priceRules.scoreRound({ a: 0.24 }, null, 0.24).points.a).toBe(100)
  })

  it('har fullträff och avstånd som följer poängen', () => {
    expect(priceRules.isBullseye(102, 100)).toBe(true)
    expect(priceRules.isBullseye(103, 100)).toBe(false)
    expect(priceRules.distance(200, 100)).toBeCloseTo(priceRules.distance(50, 100))
  })
})
