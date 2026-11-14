import { describe, expect, it } from 'vitest'
import { caseSummary, IMPOSTER_LOBBY_LINES, playersShortText, seatCount, seatPlaces, startBlockedText } from '@/lib/impostervantrum'

describe('Imposterjaktens väntrum', () => {
  it('sammanfattar valen på en rad', () => {
    expect(caseSummary({ hard: false, category: null, aloud: false, clueRounds: 2 }, 3)).toBe('Normal · 3 omgångar · 2 varv · Blandat')
    expect(caseSummary({ hard: true, category: 'Platser', aloud: true }, 1)).toBe('Svår · 1 omgång · 3 varv · Platser')
    expect(caseSummary({ hard: false, tricky: true, category: null, aloud: true }, 10)).toBe('Lurig · 10 omgångar · 3 varv · Blandat')
  })

  it('säger när ni är för få, och vad som behövs', () => {
    expect(playersShortText(2, 3, false)).toBe('Ni är 2 av minst 3.')
    expect(startBlockedText(2, 3, false)).toBe('Bjud in en till för att starta.')
    expect(startBlockedText(1, 3, false)).toBe('Bjud in 2 till för att starta.')
    expect(playersShortText(3, 3, false)).toBeNull()
    expect(startBlockedText(5, 3, false)).toBeNull()
    expect(playersShortText(11, 3, true, 10)).toBe('Ni är 11. Högst 10 kan spela.')
  })

  it('ritar minst fem platser, en ledig så länge det finns plats, och aldrig färre än spelarna', () => {
    expect(seatCount(1, 10)).toBe(5)
    expect(seatCount(5, 10)).toBe(6)
    expect(seatCount(10, 10)).toBe(10)
    expect(seatCount(11, 10)).toBe(11)
    const places = seatPlaces(5)
    expect(places).toHaveLength(5)
    // Jag sitter längst ned i mitten.
    expect(Math.round(places[0].x)).toBe(50)
    expect(places[0].y).toBeGreaterThan(80)
  })

  it('replikerna har inga tankstreck', () => {
    for (const line of IMPOSTER_LOBBY_LINES) expect(line).not.toMatch(/[–—]/)
  })
})
