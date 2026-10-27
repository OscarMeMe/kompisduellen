import { describe, expect, it } from 'vitest'
import { parseLobbyIdentity } from '@/lib/player'

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
