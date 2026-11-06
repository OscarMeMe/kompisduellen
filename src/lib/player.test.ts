import { afterEach, describe, expect, it, vi } from 'vitest'
import { AVATARS, defaultGuest, loadPlayerInThisTab, markJoinedInThisTab, parseLobbyIdentity, updatePlayerInThisTab } from '@/lib/player'

const NOW = 1_000_000_000_000
const HOUR = 60 * 60 * 1000

function saved(extra: object = {}) {
  return JSON.stringify({ id: 'abc', name: 'Kim', avatar: '👻', at: NOW, ...extra })
}

describe('parseLobbyIdentity', () => {
  it('ger id, namn och figur för en färsk identitet', () => {
    expect(parseLobbyIdentity(saved(), NOW + HOUR)).toEqual({ id: 'abc', name: 'Kim', avatar: '👻' })
  })

  it('glömmer en identitet som är äldre än tolv timmar', () => {
    expect(parseLobbyIdentity(saved(), NOW + 13 * HOUR)).toBeNull()
  })

  it('ger null för tomt, trasigt eller ofullständigt', () => {
    expect(parseLobbyIdentity(null, NOW)).toBeNull()
    expect(parseLobbyIdentity('{inte json', NOW)).toBeNull()
    expect(parseLobbyIdentity(saved({ id: '' }), NOW)).toBeNull()
    expect(parseLobbyIdentity(saved({ at: 'igår' }), NOW)).toBeNull()
  })
})

describe('defaultGuest', () => {
  it('ger namnet Gäst och en figur som går att välja', () => {
    expect(defaultGuest(() => 0)).toEqual({ name: 'Gäst', avatar: AVATARS[0] })
    expect(defaultGuest(() => 0.999).avatar).toBe(AVATARS[AVATARS.length - 1])
  })
})

// En enkel lagring som i webbläsaren.
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  }
}

describe('nytt namn eller ny figur i fliken', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('följer med till lobbyerna där fliken är samma spelare, men inte där den är någon annan', () => {
    vi.stubGlobal('sessionStorage', memoryStorage())
    markJoinedInThisTab('ABCD', { id: 'a', name: 'Kim', avatar: '👻' })
    markJoinedInThisTab('EFGH', { id: 'b', name: 'Lisa', avatar: '🤖' })
    updatePlayerInThisTab({ id: 'a', name: 'Kimpa', avatar: '🎩' })
    expect(loadPlayerInThisTab('ABCD')).toEqual({ id: 'a', name: 'Kimpa', avatar: '🎩' })
    expect(loadPlayerInThisTab('EFGH')).toEqual({ id: 'b', name: 'Lisa', avatar: '🤖' })
  })

  it('kraschar inte när lagringen är blockerad', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => updatePlayerInThisTab({ id: 'a', name: 'Kim', avatar: '👻' })).not.toThrow()
  })
})
