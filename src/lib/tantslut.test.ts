import { describe, expect, it } from 'vitest'
import { EMPTY_TANT_STATS } from '@/lib/tantpanik'
import { ordinal, tantAwards, tantOutRows, tantStatsLine } from '@/lib/tantslut'

describe('Exploderande Tanters slutskärm', () => {
  it('ordningstal på svenska', () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22].map(ordinal)).toEqual(['1:a', '2:a', '3:e', '4:e', '11:e', '12:e', '21:a', '22:a'])
  })

  it('de utslagna står med den som åkte ut sist först', () => {
    expect(tantOutRows({ out: ['mia', 'margit', 'gunnel'] })).toEqual([
      { id: 'gunnel', label: 'Exploderade 3:e' },
      { id: 'margit', label: 'Exploderade 2:a' },
      { id: 'mia', label: 'Exploderade först' },
    ])
  })

  it('visar bara utmärkelser som någon faktiskt fått, och delar dem vid lika', () => {
    const order = ['a', 'b', 'c']
    expect(tantAwards({ order, stats: EMPTY_TANT_STATS })).toEqual([])
    expect(tantAwards({ order })).toEqual([])
    const awards = tantAwards({ order, stats: { ...EMPTY_TANT_STATS, nopes: { a: 4, b: 1 }, steals: { b: 3 }, defuses: { a: 2, c: 2 } } })
    expect(awards).toEqual([
      { id: 'nope', title: 'Nope-drottningen', ids: ['a'], what: '4 Nope!' },
      { id: 'tjuv', title: 'Tjuven', ids: ['b'], what: '3 stulna kort' },
      { id: 'overlevare', title: 'Överlevaren', ids: ['a', 'c'], what: 'Desarmerade 2' },
    ])
  })

  it('ger ingen utmärkelse när alla delar den med samma siffra, och kräver minst 2 för Tjuven och Överlevaren', () => {
    const order = ['a', 'b', 'c']
    // Alla desarmerade en gång, och alla sa Nope! två gånger: ingen har fler än de andra.
    expect(tantAwards({ order, stats: { ...EMPTY_TANT_STATS, nopes: { a: 2, b: 2, c: 2 }, defuses: { a: 1, b: 1, c: 1 } } })).toEqual([])
    // Ett stulet kort och en Desarmera räcker inte.
    expect(tantAwards({ order, stats: { ...EMPTY_TANT_STATS, steals: { b: 1 }, defuses: { a: 1 } } })).toEqual([])
    // Ett Nope! räcker, när bara en sa det.
    expect(tantAwards({ order, stats: { ...EMPTY_TANT_STATS, nopes: { c: 1 } } }).map((award) => award.id)).toEqual(['nope'])
    // Alla desarmerade två gånger: fortfarande ingen.
    expect(tantAwards({ order, stats: { ...EMPTY_TANT_STATS, defuses: { a: 2, b: 2, c: 2 } } })).toEqual([])
  })

  it('siffrorna på en rad, med rätt ental', () => {
    expect(tantStatsLine({ moves: 38, stolen: 12, hidden: 3 })).toBe('38 drag · 12 kort stulna · 3 tanter gömda')
    expect(tantStatsLine({ moves: 1, stolen: 1, hidden: 1 })).toBe('1 drag · 1 kort stulet · 1 tant gömd')
  })
})
