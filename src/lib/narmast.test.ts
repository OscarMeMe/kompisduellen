import { describe, expect, it } from 'vitest'
import { narmastRules, numberLineLanes, roundPoints } from '@/lib/narmast'

describe('poängen i Närmast vinner', () => {
  it('de tre närmaste får 3, 2 och 1, och resten inget', () => {
    expect(roundPoints({ a: 48, b: 45, c: 60, d: 90 }, 50)).toEqual({ a: 3, b: 2, c: 1 })
  })

  it('delad placering ger samma poäng, och nästa hamnar en plats längre ned', () => {
    // a och b delar ettan (3 var), c är trea (1), d är fyra (0).
    expect(roundPoints({ a: 45, b: 55, c: 40, d: 30 }, 50)).toEqual({ a: 3, b: 3, c: 1 })
    // Tre delade ettor.
    expect(roundPoints({ a: 49, b: 51, c: 49 }, 50)).toEqual({ a: 3, b: 3, c: 3 })
  })

  it('exakt träff ger 5 poäng, och de andra räknas efter sin placering', () => {
    expect(roundPoints({ a: 50, b: 52, c: 10 }, 50)).toEqual({ a: 5, b: 2, c: 1 })
  })

  it('sista rundan ger dubbla poäng', () => {
    expect(roundPoints({ a: 50, b: 52, c: 10, d: 1 }, 50, true)).toEqual({ a: 10, b: 4, c: 2 })
  })

  it('ingen gissning ger inga poäng', () => {
    expect(roundPoints({}, 50)).toEqual({})
    expect(narmastRules.scoreRound({ a: 20 }, null, 30, false)).toEqual({ target: 30, points: { a: 3 } })
  })
})

describe('tallinjen i facit', () => {
  it('figurer långt ifrån varandra står på samma rad', () => {
    const lanes = numberLineLanes(
      [
        { id: 'a', value: 10 },
        { id: 'b', value: 40 },
        { id: 'c', value: 90 },
      ],
      10,
    )
    expect(lanes).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('figurer nära varandra, eller på samma tal, hamnar på olika rader', () => {
    const lanes = numberLineLanes(
      [
        { id: 'a', value: 50 },
        { id: 'b', value: 52 },
        { id: 'c', value: 50 },
        { id: 'd', value: 70 },
        { id: 'e', value: 55 },
      ],
      10,
    )
    expect(lanes.d).toBe(0)
    expect(new Set([lanes.a, lanes.b, lanes.c]).size).toBe(3)
    // e står 5 från b och c, men 5 ifrån räcker inte heller.
    expect(lanes.e).toBeGreaterThan(0)
  })

  it('en rad används igen när den är ledig', () => {
    const lanes = numberLineLanes(
      [
        { id: 'a', value: 10 },
        { id: 'b', value: 12 },
        { id: 'c', value: 30 },
      ],
      10,
    )
    expect(lanes).toEqual({ a: 0, b: 1, c: 0 })
  })
})
