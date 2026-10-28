import { describe, expect, it } from 'vitest'
import {
  acceptReaction,
  canSendReaction,
  findReaction,
  REACTION_COOLDOWN_MS,
  REACTION_LIMIT,
  REACTION_WINDOW_MS,
  REACTIONS,
} from '@/lib/reaktioner'

describe('reaktioner', () => {
  it('har tre reaktioner med unika id', () => {
    expect(REACTIONS).toHaveLength(3)
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(3)
  })

  it('känner bara igen kända reaktioner', () => {
    expect(findReaction('eld')?.emoji).toBe('🔥')
    expect(findReaction('<script>')).toBeUndefined()
    expect(findReaction(undefined)).toBeUndefined()
  })

  it('knapparna väntar en stund efter ett tryck', () => {
    expect(canSendReaction(null, 1000)).toBe(true)
    expect(canSendReaction(1000, 1000 + REACTION_COOLDOWN_MS - 1)).toBe(false)
    expect(canSendReaction(1000, 1000 + REACTION_COOLDOWN_MS)).toBe(true)
  })

  it('mottagaren släpper igenom högst tre reaktioner per tidsfönster', () => {
    let history: number[] = []
    for (let i = 0; i < REACTION_LIMIT; i++) {
      const next = acceptReaction(history, 1000 + i)
      expect(next).not.toBeNull()
      history = next!
    }
    expect(acceptReaction(history, 1000 + REACTION_LIMIT)).toBeNull()
  })

  it('släpper igenom nya reaktioner när fönstret gått ut', () => {
    const history = [1000, 1001, 1002]
    expect(acceptReaction(history, 1000 + REACTION_WINDOW_MS)).not.toBeNull()
  })
})
