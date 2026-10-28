import { describe, expect, it } from 'vitest'
import { GAMES } from '@/lib/games'
import { defaultRoundsFor } from '@/lib/match'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { durationLabel, matchMinutes } from '@/lib/speltid'

describe('ungefärlig matchtid', () => {
  it('räknas från rundor gånger svarstid och facit i gissningsspelen', () => {
    const rules = rulesFor('gissa-priset')
    const seconds = defaultRoundsFor('gissa-priset') * (rules.guessSeconds + rules.revealSeconds)
    expect(matchMinutes('gissa-priset')).toBe(Math.round(seconds / 60))
    expect(durationLabel('gissa-priset')).toBe('ca 4 min')
    expect(durationLabel('narmast')).toBe('ca 2 min')
  })

  it('räknas från rundans alla steg i kortspelen', () => {
    const s = cardRulesFor('kortkaos')!.seconds
    const seconds = defaultRoundsFor('kortkaos') * (s.question + s.choosing + s.judging + s.reveal)
    expect(matchMinutes('kortkaos')).toBe(Math.round(seconds / 60))
    expect(durationLabel('kortkaos')).toBe('ca 14 min')
  })

  it('finns för alla spelbara spel, utan tankstreck', () => {
    for (const game of GAMES.filter((g) => g.playable)) {
      expect(durationLabel(game.id)).toMatch(/^ca \d+ min$/)
    }
  })
})
