import { describe, expect, it } from 'vitest'
import { distancePoints, narmastRules, numberLineLanes, roundPoints } from '@/lib/narmast'

describe('poängen i Närmast vinner', () => {
  it('poängen beror på avståndet', () => {
    expect([0, 1, 2, 3, 5, 6, 10, 11, 20, 21, 99].map(distancePoints)).toEqual([10, 6, 6, 4, 4, 2, 2, 1, 1, 0, 0])
  })

  it('den närmaste får 1 bonuspoäng ovanpå avståndspoängen', () => {
    // a är 2 ifrån (6 + 1), b 5 ifrån (4), c 10 ifrån (2), d 40 ifrån (0).
    expect(roundPoints({ a: 48, b: 45, c: 60, d: 90 }, 50)).toEqual({ a: 7, b: 4, c: 2 })
  })

  it('är flera lika nära får alla bonusen', () => {
    expect(roundPoints({ a: 45, b: 55, c: 40, d: 30 }, 50)).toEqual({ a: 5, b: 5, c: 2, d: 1 })
  })

  it('exakt träff ger 10 plus bonusen', () => {
    expect(roundPoints({ a: 50, b: 52, c: 10 }, 50)).toEqual({ a: 11, b: 6 })
  })

  it('den närmaste får bonusen även när alla är långt ifrån', () => {
    expect(roundPoints({ a: 80, b: 95 }, 10)).toEqual({ a: 1 })
  })

  it('sista rundan ger dubbla poäng, även bonusen', () => {
    expect(roundPoints({ a: 50, b: 52, c: 10, d: 1 }, 50, true)).toEqual({ a: 22, b: 12 })
  })

  it('ingen gissning ger inga poäng', () => {
    expect(roundPoints({}, 50)).toEqual({})
    // 10 ifrån ger 2, plus bonusen.
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
