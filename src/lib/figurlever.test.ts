import { describe, expect, it } from 'vitest'
import { BLOBS, lookDirection, MOOD_MOTION, MOODS, podiumMood, seatMood, SLEEP_AFTER_MS, votedOut } from '@/lib/figurer'
import type { ImposterOutcome } from '@/lib/imposterjakten'

const ORDER = ['a', 'b', 'c', 'd']
type SeatTable = Parameters<typeof seatMood>[0]
const base: SeatTable = { step: 'ledtradar', accusation: null, caught: null, votes: null, outcome: null, order: ORDER }
const outcome = (kind: ImposterOutcome['kind']): ImposterOutcome => ({ kind, word: 'Paraply', imposter: 'c', hint: null, guess: null, points: {}, reason: null })
const moods = (table: SeatTable) => ORDER.map((id) => seatMood(table, id))

describe('minen vid Imposterjaktens bord', () => {
  it('väntar under korten och ledtrådarna', () => {
    expect(moods({ ...base, step: 'kort' })).toEqual(['vantar', 'vantar', 'vantar', 'vantar'])
    expect(moods(base)).toEqual(['vantar', 'vantar', 'vantar', 'vantar'])
  })

  it('är misstänksam för alla i omgången under diskussionen, så att impostern inte syns', () => {
    expect(moods({ ...base, step: 'diskussion' })).toEqual(['misstankt', 'misstankt', 'misstankt', 'misstankt'])
    expect(seatMood({ ...base, step: 'diskussion' }, 'ny')).toBe('vantar')
  })

  it('svettas bara för den anklagade, och de andra fortsätter som förut', () => {
    const accusation = { accuser: 'a', accused: 'b', answered: 0, voters: 3 }
    expect(moods({ ...base, accusation })).toEqual(['vantar', 'anklagad', 'vantar', 'vantar'])
    expect(moods({ ...base, step: 'diskussion', accusation })).toEqual(['misstankt', 'anklagad', 'misstankt', 'misstankt'])
  })

  it('smälter för den som åkte ut först när det är offentligt: sista gissningen och facit', () => {
    // Impostern fångades: steget säger redan att den gissar ordet.
    expect(moods({ ...base, step: 'gissning', caught: 'c' })).toEqual(['vantar', 'vantar', 'utrostad', 'vantar'])
    expect(moods({ ...base, step: 'facit', caught: 'c', outcome: outcome('gav-upp') })).toEqual(['vantar', 'vantar', 'utrostad', 'vantar'])
    // En oskyldig röstades ut: facit visar redan impostern.
    const votes = { a: 'b', c: 'b', d: 'b', b: 'a' }
    expect(moods({ ...base, step: 'facit', votes, outcome: outcome('undan') })).toEqual(['vantar', 'utrostad', 'vantar', 'vantar'])
  })

  it('smälter inte under omröstningen, och ingen smälter efter lika röster eller en avbruten omgång', () => {
    expect(moods({ ...base, step: 'rostning', votes: { a: 'b', c: 'b', d: 'b', b: 'a' } })).toEqual(['vantar', 'vantar', 'vantar', 'vantar'])
    const tie = { a: 'b', b: 'a', c: 'd', d: 'c' }
    expect(votedOut({ step: 'facit', caught: null, votes: tie, outcome: outcome('undan') })).toBeNull()
    expect(votedOut({ step: 'facit', caught: null, votes: null, outcome: outcome('avbruten') })).toBeNull()
  })

})

describe('prispallen', () => {
  it('låter alla på förstaplatsen jubla och de andra vara sura', () => {
    expect(podiumMood(1)).toBe('vann')
    expect(podiumMood(2)).toBe('sur')
    expect(podiumMood(7)).toBe('sur')
  })
})

describe('personligheterna', () => {
  it('har sju miner, och alla rörelser stängs av med minska rörelse', () => {
    expect(MOODS).toEqual(['vantar', 'misstankt', 'anklagad', 'traffad', 'vann', 'utrostad', 'sur'])
    for (const mood of MOODS) expect(MOOD_MOTION[mood]).toMatch(/^motion-safe:animate-/)
  })

  it('ger alla tolv en replik utan tankstreck och en rörelse som stängs av med minska rörelse', () => {
    for (const blob of BLOBS) {
      expect(blob.line.length, blob.name).toBeGreaterThan(5)
      expect(blob.line).not.toMatch(/[–—]/)
      if (blob.idle) expect(blob.idle, blob.name).toMatch(/^motion-safe:animate-/)
    }
    // Kungen står still och dömer.
    expect(BLOBS.find((blob) => blob.id === 'kungen')!.idle).toBe('')
  })

  it('låter Sjusovaren somna efter 45 sekunder utan att något händer', () => {
    expect(SLEEP_AFTER_MS).toBe(45_000)
  })

  it('låter Ögat titta åt hållet där någon nyss gjorde något', () => {
    expect(lookDirection(2, 0)).toBe(-1)
    expect(lookDirection(2, 5)).toBe(1)
    expect(lookDirection(2, 2)).toBe(0)
    expect(lookDirection(2, -1)).toBe(0)
  })
})
