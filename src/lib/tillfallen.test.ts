import { describe, expect, it } from 'vitest'
import { GAMES } from '@/lib/games'
import { createLobbyHref, findTillfalle, gamesForTillfalle, TILLFALLEN } from '@/lib/tillfallen'

const playable = GAMES.filter((game) => game.playable)

describe('tillfällena', () => {
  it('Alla visar spelen i vanlig ordning utan någon rad', () => {
    const shown = gamesForTillfalle('alla', playable)
    expect(shown.map((item) => item.game.id)).toEqual(playable.map((game) => game.id))
    expect(shown.every((item) => item.note === undefined)).toBe(true)
  })

  it('inget spel göms, och alla spel har en rad i varje tillfälle', () => {
    for (const tillfalle of TILLFALLEN.filter((item) => item.id !== 'alla')) {
      const shown = gamesForTillfalle(tillfalle.id, playable)
      expect(shown.map((item) => item.game.id).sort(), tillfalle.id).toEqual(playable.map((game) => game.id).sort())
      expect(shown.every((item) => item.note), tillfalle.id).toBe(true)
    }
  })

  it('sorterar det som passar bäst först', () => {
    expect(gamesForTillfalle('forfest', playable)[0].game.id).toBe('imposterjakten')
    expect(gamesForTillfalle('spelkvall', playable)[0].game.id).toBe('kortkaos')
    expect(gamesForTillfalle('discord', playable)[0].game.id).toBe('gissa-priset')
  })

  it('ett spel som inte är listat hamnar sist, så att nya spel inte försvinner', () => {
    const shown = gamesForTillfalle('forfest', [{ id: 'nytt' }, { id: 'imposterjakten' }])
    expect(shown.map((item) => item.game.id)).toEqual(['imposterjakten', 'nytt'])
  })

  it('förvalen: tillsammans på förfesten och spelkvällen, på distans på Discord', () => {
    expect(findTillfalle('forfest')?.aloud).toBe(true)
    expect(findTillfalle('spelkvall')?.aloud).toBe(true)
    expect(findTillfalle('discord')?.aloud).toBe(false)
    expect(findTillfalle('alla')?.aloud).toBeUndefined()
    expect(findTillfalle('nagot-annat')).toBeUndefined()
  })

  it('länken tar med tillfället, utom för Alla', () => {
    expect(createLobbyHref('kortkaos', 'alla')).toBe('/skapa?spel=kortkaos')
    expect(createLobbyHref('kortkaos', 'discord')).toBe('/skapa?spel=kortkaos&tillfalle=discord')
  })
})
