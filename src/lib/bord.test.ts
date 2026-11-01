import { describe, expect, it } from 'vitest'
import { clueLabels, clueLine, latestClue, listOnLowPhones, noWordsAtSeatsOnMobile, pointingHand, curvedArrow, seatLayout, smallSeats } from '@/lib/bord'

describe('handen i Peka ut', () => {
  const seat = (x: number, y: number) => ({ id: String(x), angle: 0, x, y })

  it('står en bit från den som pekar och pekar mot den utpekade', () => {
    expect(pointingHand(seat(50, 90), seat(50, 10), 15)).toEqual({ x: 50, y: 75, degrees: 0 })
    expect(pointingHand(seat(10, 50), seat(90, 50), 15)).toEqual({ x: 25, y: 50, degrees: 90 })
  })
})

describe('orden på en rad', () => {
  it('samlar allt en spelare sagt', () => {
    expect(clueLine([{ kind: 'ord', word: 'regn' }, { kind: 'pass', word: null }, { kind: 'sagt', word: 'moln' }])).toBe('regn · pass · moln')
    expect(clueLine([{ kind: 'sagt', word: null }])).toBe('✓ sa sitt')
    expect(clueLine([{ kind: 'sagt', word: null }, { kind: 'sagt', word: null }])).toBe('✓ · ✓')
  })
})

describe('orden vid bordet', () => {
  it('9 och 10 spelare har inga ord vid platserna på mobil', () => {
    expect([8, 9, 10].map(noWordsAtSeatsOnMobile)).toEqual([false, true, true])
  })

  it('listan under bordet på låga telefoner gäller 5 och 6 spelare', () => {
    expect([3, 4, 5, 6, 7].map(listOnLowPhones)).toEqual([false, false, true, true, false])
  })

  const ord = { player: 'a', kind: 'ord', word: 'regn' }
  const pass = { player: 'b', kind: 'pass', word: null }
  const sagt = { player: 'c', kind: 'sagt', word: null }

  it('en etikett per ord, och pass och sagda ord står i ord', () => {
    expect(clueLabels([ord, pass, sagt])).toEqual(['regn', 'pass', '✓ sa sitt'])
  })

  it('mitten visar det senaste ordet och vem som gav det, och inget innan första ordet', () => {
    expect(latestClue([])).toBeNull()
    expect(latestClue([pass, ord])).toEqual({ text: 'regn', player: 'a' })
    expect(latestClue([ord, sagt])).toEqual({ text: '✓ sa sitt', player: 'c' })
  })
})

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

  it('ritar en böjd pil som går runt bordet och börjar vid figurens kant', () => {
    const seat = (x: number, y: number) => ({ id: String(x), angle: 0, x, y })
    const path = curvedArrow(seat(50, 92), seat(93, 50), 10)
    expect(path).toMatch(/^M[\d.]+ [\d.]+ Q[\d.]+ [\d.]+ [\d.]+ [\d.]+$/)
    const [, , cx, cy] = path.match(/M([\d.]+) [\d.]+ Q([\d.]+) ([\d.]+)/)!.map(Number)
    // Kontrollpunkten ligger längre från bordets mitt än rakt mellan platserna.
    expect(Math.hypot(cx - 50, cy - 50)).toBeGreaterThan(Math.hypot((50 + 93) / 2 - 50, (92 + 50) / 2 - 50))
  })
})
