import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAMES } from '@/lib/games'
import { DEFAULT_GAME_SORT, loadGameSort, saveGameSort, sortGames } from '@/lib/sortering'

const playable = GAMES.filter((game) => game.playable)
const names = (sort: Parameters<typeof sortGames>[1]) => sortGames(playable, sort).map((game) => game.name)

describe('sorteringen av spelen på startsidan', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Populärast följer ordningen i games.ts', () => {
    expect(names('populart')).toEqual(['Exploderande Tanter', 'Gissa priset', 'Kortkaos', 'Imposterjakten', 'Närmast vinner'])
  })

  it('Nyheter visar det senast tillagda först', () => {
    expect(names('nytt')).toEqual(['Exploderande Tanter', 'Imposterjakten', 'Kortkaos', 'Gissa priset', 'Närmast vinner'])
  })

  it('A–Ö och Ö–A sorterar på svenska, med å, ä och ö sist', () => {
    expect(names('a-o')).toEqual(['Exploderande Tanter', 'Gissa priset', 'Imposterjakten', 'Kortkaos', 'Närmast vinner'])
    expect(names('o-a')).toEqual(['Närmast vinner', 'Kortkaos', 'Imposterjakten', 'Gissa priset', 'Exploderande Tanter'])
    const words = [{ name: 'Ödla' }, { name: 'Ärta' }, { name: 'Zebra' }, { name: 'Åsna' }, { name: 'Apa' }]
    expect(sortGames(words, 'a-o').map((word) => word.name)).toEqual(['Apa', 'Zebra', 'Åsna', 'Ärta', 'Ödla'])
  })

  it('spel utan värde hamnar sist, och lika behåller sin ordning', () => {
    const games = [{ name: 'B' }, { name: 'A', popularOrder: 2, addedAt: '2026-01-01' }, { name: 'C', popularOrder: 1 }]
    expect(sortGames(games, 'populart').map((game) => game.name)).toEqual(['C', 'A', 'B'])
    expect(sortGames(games, 'nytt').map((game) => game.name)).toEqual(['A', 'B', 'C'])
  })

  it('alla spelbara spel har en plats i Populärast och ett datum', () => {
    for (const game of playable) {
      expect(game.popularOrder, game.id).toBeTypeOf('number')
      expect(game.addedAt, game.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(new Set(playable.map((game) => game.popularOrder)).size).toBe(playable.length)
  })

  it('utan eget val (eller utan lagring) är det Populärast, och ett val kommer ihåg', () => {
    expect(loadGameSort()).toBe(DEFAULT_GAME_SORT)
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
    expect(loadGameSort()).toBe('populart')
    saveGameSort('o-a')
    expect(loadGameSort()).toBe('o-a')
    data.set('kd-spelsortering', 'konstigt')
    expect(loadGameSort()).toBe('populart')
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blockerad')
      },
      setItem: () => {
        throw new Error('blockerad')
      },
    })
    expect(loadGameSort()).toBe('populart')
    expect(() => saveGameSort('nytt')).not.toThrow()
  })
})
