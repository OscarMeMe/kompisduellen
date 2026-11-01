import { describe, expect, it } from 'vitest'
import { arrowBetween, seatLayout, smallSeats } from '@/lib/bord'

describe('bordet i Imposterjakten', () => {
  it('sätter mig längst ner och de andra medurs i turordning', () => {
    const seats = seatLayout(['a', 'b', 'c', 'd'], 'c')
    expect(seats.map((seat) => seat.id)).toEqual(['c', 'd', 'a', 'b'])
    expect(seats[0]).toMatchObject({ angle: 90, x: 50 })
    expect(seats[0].y).toBeGreaterThan(85)
    // Medurs på skärmen: längst ner, till vänster, överst, till höger.
    expect(seats.map((seat) => seat.angle)).toEqual([90, 180, 270, 0])
    expect(seats[1].x).toBeLessThan(20)
    expect(seats[2].y).toBeLessThan(20)
    expect(seats[3].x).toBeGreaterThan(80)
  })

  it('börjar med den första i turordningen när jag inte är med i omgången', () => {
    expect(seatLayout(['a', 'b', 'c'], 'z').map((seat) => seat.id)).toEqual(['a', 'b', 'c'])
  })

  it('får plats med upp till tio spelare inom rutan, med mindre figurer från sju', () => {
    const seats = seatLayout([...'abcdefghij'], 'a')
    expect(seats).toHaveLength(10)
    for (const seat of seats) {
      expect(seat.x).toBeGreaterThanOrEqual(5)
      expect(seat.x).toBeLessThanOrEqual(95)
      expect(seat.y).toBeGreaterThanOrEqual(5)
      expect(seat.y).toBeLessThanOrEqual(95)
    }
    expect(smallSeats(6)).toBe(false)
    expect(smallSeats(7)).toBe(true)
  })

  it('kortar pilen i båda ändar', () => {
    const [from, to] = [
      { id: 'a', angle: 90, x: 50, y: 90 },
      { id: 'b', angle: 270, x: 50, y: 10 },
    ]
    expect(arrowBetween(from, to, 10)).toEqual({ x1: 50, y1: 80, x2: 50, y2: 20 })
  })
})
