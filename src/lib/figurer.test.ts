import { afterEach, describe, expect, it, vi } from 'vitest'
import { findEmoji } from '@/lib/emoji'
import { BLOB_AVATARS, BLOBS, findBlob, LEGACY_AVATARS, MOOD_MOTION, MOOD_NAMES, MOODS, upgradeAvatar } from '@/lib/figurer'
import { GAMES } from '@/lib/games'
import { THROW_ITEMS } from '@/lib/kast'
import { addPlayers, initialState, restoreHostState, upgradeAvatars } from '@/lib/match'
import { parseStateMessage } from '@/lib/meddelanden'
import { AVATARS, defaultGuest, loadPlayer, loadPlayerInThisTab, markJoinedInThisTab, parseLobbyIdentity } from '@/lib/player'
import prisdata from '@/lib/prisdata.json'
import { REACTIONS } from '@/lib/reaktioner'
import { TILLFALLEN } from '@/lib/tillfallen'

const OLD_AVATARS = Object.keys(LEGACY_AVATARS)

describe('blobbarnas värden', () => {
  it('är vanliga emoji som inga gamla figurer eller saker på sajten använder', () => {
    const taken = [
      ...OLD_AVATARS,
      ...THROW_ITEMS.map((item) => item.emoji),
      ...REACTIONS.map((reaction) => reaction.emoji),
      ...GAMES.flatMap((game) => [game.emoji, game.intro?.emoji]),
      ...TILLFALLEN.map((tillfalle) => tillfalle.emoji),
      ...(prisdata as { emoji?: string }[]).map((item) => item.emoji),
      '🙂',
      '🏆',
    ]
    expect(new Set(BLOB_AVATARS).size).toBe(BLOBS.length)
    for (const value of BLOB_AVATARS) {
      expect(value).toMatch(/^\p{Extended_Pictographic}$/u)
      expect(taken).not.toContain(value)
      expect(findEmoji(value)).toBeUndefined()
    }
  })

  it('hittas med och utan variantväljare, och inga andra tecken blir blobbar', () => {
    expect(findBlob('🤪')?.id).toBe('klumpen')
    expect(findBlob('🎩️')?.id).toBe('spionen')
    expect(findBlob('🧿')?.id).toBe('ogat')
    for (const avatar of OLD_AVATARS) expect(findBlob(avatar)).toBeUndefined()
    expect(findBlob('')).toBeUndefined()
  })

  it('är det enda som går att välja och som slumpas fram, även i Testa själv', () => {
    expect(AVATARS).toEqual(BLOB_AVATARS)
    expect(AVATARS).toHaveLength(12)
    for (let i = 0; i < 24; i++) expect(BLOB_AVATARS).toContain(defaultGuest(() => i / 24).avatar)
  })

  it('kommer igenom läget från värden oförändrade', () => {
    for (const blob of BLOBS) {
      const state = addPlayers(initialState('narmast'), { a: { name: 'Oscar', avatar: blob.emoji } })
      const sent = JSON.parse(JSON.stringify({ state, sentAt: 1, from: 'a' }))
      expect(parseStateMessage(sent)?.state.players.a.avatar).toBe(blob.emoji)
    }
  })

  it('har namn och rörelse för alla sju miner', () => {
    expect(MOODS).toHaveLength(7)
    for (const mood of MOODS) {
      expect(MOOD_NAMES[mood]).toBeTruthy()
      expect(MOOD_MOTION[mood]).toMatch(/^motion-safe:animate-/)
    }
  })
})

describe('gamla emoji-figurer', () => {
  it('blir var sin blobb, så att alla tolv blobbar används en gång', () => {
    expect(OLD_AVATARS).toEqual(['👻', '👽', '🤖', '👾', '🧙', '🧛', '🧜', '🦸', '🥷', '🤡', '💀', '🎃'])
    const upgraded = OLD_AVATARS.map(upgradeAvatar)
    expect([...upgraded].sort()).toEqual([...BLOB_AVATARS].sort())
    expect(upgradeAvatar('👻')).toBe('😳')
    expect(upgradeAvatar('🤖️')).toBe('🤓')
  })

  it('lämnar blobbar och okända värden som de är', () => {
    for (const value of BLOB_AVATARS) expect(upgradeAvatar(value)).toBe(value)
    expect(upgradeAvatar('🙂')).toBe('🙂')
  })

  it('blir blobbar i läget från en värd med en äldre version, både spelare och topplista', () => {
    const old = {
      ...initialState('narmast'),
      players: { a: { name: 'Oscar', avatar: '👻' }, b: { name: 'Lisa', avatar: '🤪' } },
      leaderboard: { a: { name: 'Oscar', avatar: '🎃', wins: 1, played: 2 } },
    }
    const parsed = parseStateMessage({ state: old, sentAt: 1, from: 'a' })!.state
    expect(parsed.players.a.avatar).toBe('😳')
    expect(parsed.players.b.avatar).toBe('🤪')
    expect(parsed.leaderboard.a).toEqual({ name: 'Oscar', avatar: '🦔', wins: 1, played: 2 })
  })

  it('blir blobbar när värden lägger till en spelare och när en sparad lobby laddas', () => {
    expect(addPlayers(initialState('narmast'), { a: { name: 'Oscar', avatar: '💀' } }).players.a.avatar).toBe('😈')
    const saved = { state: { ...initialState('narmast'), players: { a: { name: 'Oscar', avatar: '🧙' } } }, secrets: null }
    expect(restoreHostState(saved)?.state.players.a.avatar).toBe('💧')
  })

  it('ger samma läge tillbaka när inget behöver göras om', () => {
    const state = addPlayers(initialState('narmast'), { a: { name: 'Oscar', avatar: '🤪' } })
    expect(upgradeAvatars(state)).toBe(state)
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

describe('den egna profilen med en gammal figur', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('blir en blobb och sparas så', () => {
    const local = memoryStorage()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', memoryStorage())
    local.setItem('kd-player', JSON.stringify({ name: 'Kim', avatar: '👽' }))
    expect(loadPlayer()?.avatar).toBe('🧿')
    expect(JSON.parse(local.getItem('kd-player')!)).toEqual({ name: 'Kim', avatar: '🧿' })
  })

  it('blir en blobb i flikens lobby och i den sparade lobbyidentiteten', () => {
    vi.stubGlobal('sessionStorage', memoryStorage())
    markJoinedInThisTab('ABCD', { id: 'a', name: 'Kim', avatar: '🥷' })
    expect(loadPlayerInThisTab('ABCD')?.avatar).toBe('🎩')
    const saved = JSON.stringify({ id: 'a', name: 'Kim', avatar: '🦸', at: 1000 })
    expect(parseLobbyIdentity(saved, 2000)?.avatar).toBe('🤴')
  })
})
