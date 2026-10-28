import { describe, expect, it } from 'vitest'
import { pricePoints, priceRules } from '@/lib/gissa-priset'

// Kontrollerar att förklaringen under "Så räknas poängen" stämmer med beräkningen.
describe('poängen i Gissa priset', () => {
  it('ger 100 för exakt rätt och inom 5 procent fel åt båda håll', () => {
    expect(pricePoints(100, 100)).toBe(100)
    expect(pricePoints(105, 100)).toBe(100)
    expect(pricePoints(95, 100)).toBe(100)
    expect(pricePoints(103, 100)).toBe(100)
    expect(pricePoints(108, 100)).toBeLessThan(100)
    expect(pricePoints(92, 100)).toBeLessThan(100)
  })

  it('går genom punkterna: 10 procent 85, 25 procent 60, 1,5 gånger 40, dubbla 25, tre gånger 10, fyra gånger 0', () => {
    expect(pricePoints(110, 100)).toBe(85)
    expect(pricePoints(125, 100)).toBe(60)
    expect(pricePoints(150, 100)).toBe(40)
    expect(pricePoints(200, 100)).toBe(25)
    expect(pricePoints(300, 100)).toBe(10)
    expect(pricePoints(400, 100)).toBe(0)
  })

  it('räknar på hur många gånger fel, inte på kronor: halva ger lika mycket som dubbla', () => {
    expect(pricePoints(50, 100)).toBe(pricePoints(200, 100))
    expect(pricePoints(100 / 3, 100)).toBe(10)
    expect(pricePoints(25, 100)).toBe(0)
    expect(pricePoints(10_000, 100)).toBe(0)
    expect(pricePoints(1_000_000, 100)).toBe(0)
    // Samma förhållande ger samma poäng oavsett prisets storlek.
    expect(pricePoints(15_000, 10_000)).toBe(pricePoints(150, 100))
  })

  it('är mjuk: poängen sjunker jämnt och aldrig uppåt när man är längre ifrån', () => {
    let previous = 100
    for (let percent = 0; percent <= 400; percent++) {
      const points = pricePoints(100 * (1 + percent / 100), 100)
      expect(points).toBeLessThanOrEqual(previous)
      previous = points
    }
    let under = 100
    for (let guess = 100; guess >= 20; guess--) {
      const points = pricePoints(guess, 100)
      expect(points).toBeLessThanOrEqual(under)
      under = points
    }
    // Mellan punkterna ligger poängen mellan punkternas värden.
    expect(pricePoints(118, 100)).toBeLessThan(85)
    expect(pricePoints(118, 100)).toBeGreaterThan(60)
    expect(pricePoints(175, 100)).toBeLessThan(40)
    expect(pricePoints(175, 100)).toBeGreaterThan(25)
  })

  it('ger alltid heltal mellan 0 och 100 och noll för ogiltiga gissningar', () => {
    for (const guess of [0.01, 1, 7, 99, 100, 101, 130, 160, 250, 399, 5000]) {
      const points = pricePoints(guess, 100)
      expect(Number.isInteger(points)).toBe(true)
      expect(points).toBeGreaterThanOrEqual(0)
      expect(points).toBeLessThanOrEqual(100)
    }
    expect(pricePoints(0, 100)).toBe(0)
    expect(pricePoints(-5, 100)).toBe(0)
  })

  it('räknar priser från 1 krona i hela kronor', () => {
    // Kaffet 1930 kostade 2,44 kr: 2 kr ger fullpoäng.
    expect(priceRules.scoreRound({ a: 2 }, null, 2.44)).toEqual({ target: 2, points: { a: 100 } })
    // Mjölken 1930 kostade 24 öre, och där räknas ören.
    expect(priceRules.scoreRound({ a: 0.24 }, null, 0.24).points.a).toBe(100)
  })

  it('har fullträff och avstånd som följer poängen', () => {
    expect(priceRules.isBullseye(105, 100)).toBe(true)
    expect(priceRules.isBullseye(110, 100)).toBe(false)
    expect(priceRules.distance(200, 100)).toBeCloseTo(priceRules.distance(50, 100))
  })
})
