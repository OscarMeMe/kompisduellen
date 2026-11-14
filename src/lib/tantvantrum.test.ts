import { describe, expect, it } from 'vitest'
import { chairCount, chairPlaces, TANT_LOBBY_LINES, tantBombsLine, tantExtrasLine, tantStartBlocked, tantSummary, waitingText } from '@/lib/tantvantrum'

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

describe('texterna i inställningsrutan', () => {
  it('säger hur många tanter det blir med så många spelare', () => {
    expect(tantBombsLine('normal', 4)).toBe('Normal: 3 tanter med 4 spelare.')
    expect(tantBombsLine('svar', 2)).toBe('Svår: 2 tanter med 2 spelare.')
    expect(tantBombsLine('normal', 2)).toBe('Normal: 1 tant med 2 spelare.')
    expect(tantBombsLine('kaos', 6)).toBe('Kaos: 7 tanter med 6 spelare.')
    // Kaos med för få blir Svår, och det står då.
    expect(tantBombsLine('kaos', 4)).toBe('Kaos kräver minst 5 spelare. Med 4 blir det Svår: 4 tanter.')
    // Ensam i väntrummet räknas som två, eftersom det behövs minst två för att starta.
    expect(tantBombsLine('normal', 1)).toBe('Normal: 1 tant med 2 spelare.')
  })

  it('sammanfattar valen', () => {
    expect(tantSummary('normal', 4, 2)).toBe('Normal · 4 spelare · 2 botar')
    expect(tantSummary('svar', 3, 1)).toBe('Svår · 3 spelare · 1 bot')
    expect(tantSummary('kaos', 6, 0)).toBe('Kaos · 6 spelare')
    expect(tantExtrasLine(true, false)).toBe('Tantsnaran på · Kasta saker av')
    expect(tantExtrasLine(false, true)).toBe('Tantsnaran av · Kasta saker på')
  })

  it('förklarar kort varför det inte går att starta', () => {
    expect(tantStartBlocked(1, 2, false)).toBe('Bjud in en kompis eller lägg till en bot för att starta.')
    expect(tantStartBlocked(2, 2, false)).toBeNull()
    expect(tantStartBlocked(11, 2, true)).toBe('Ni är för många. Byt spel eller vänta tills någon lämnat.')
  })
})
