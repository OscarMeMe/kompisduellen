import { describe, expect, it } from 'vitest'
import { findEmoji } from '@/lib/emoji'
import { BLOB_AVATARS, BLOBS, findBlob, MOOD_MOTION, MOOD_NAMES, MOODS } from '@/lib/figurer'
import { GAMES } from '@/lib/games'
import { THROW_ITEMS } from '@/lib/kast'
import { addPlayers, initialState } from '@/lib/match'
import { parseStateMessage } from '@/lib/meddelanden'
import { AVATARS, defaultGuest, PICKABLE_AVATARS } from '@/lib/player'
import prisdata from '@/lib/prisdata.json'
import { REACTIONS } from '@/lib/reaktioner'

describe('blobbarnas värden', () => {
  it('är vanliga emoji som ingen annan figur eller sak på sajten använder', () => {
    const taken = [
      ...AVATARS,
      ...THROW_ITEMS.map((item) => item.emoji),
      ...REACTIONS.map((reaction) => reaction.emoji),
      ...GAMES.flatMap((game) => [game.emoji, game.intro?.emoji]),
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

  it('hittas med och utan variantväljare, och inga andra figurer blir blobbar', () => {
    expect(findBlob('🤪')?.id).toBe('klumpen')
    expect(findBlob('🎩️')?.id).toBe('spionen')
    expect(findBlob('😴')?.id).toBe('sjusovaren')
    for (const avatar of AVATARS) expect(findBlob(avatar)).toBeUndefined()
    expect(findBlob('')).toBeUndefined()
  })

  it('går att välja, men slumpas aldrig fram', () => {
    expect(PICKABLE_AVATARS).toEqual([...AVATARS, ...BLOB_AVATARS])
    for (let i = 0; i < 20; i++) expect(BLOB_AVATARS).not.toContain(defaultGuest(() => i / 20).avatar)
    expect(AVATARS).toHaveLength(12)
  })

  it('kommer igenom läget från värden oförändrade', () => {
    for (const blob of BLOBS) {
      const state = addPlayers(initialState('narmast'), { a: { name: 'Oscar', avatar: blob.emoji } })
      const sent = JSON.parse(JSON.stringify({ state, sentAt: 1, from: 'a' }))
      expect(parseStateMessage(sent)?.state.players.a.avatar).toBe(blob.emoji)
    }
  })

  it('har namn och rörelse för alla sex miner', () => {
    expect(MOODS).toHaveLength(6)
    for (const mood of MOODS) {
      expect(MOOD_NAMES[mood]).toBeTruthy()
      expect(MOOD_MOTION[mood]).toMatch(/^motion-safe:animate-/)
    }
  })
})
