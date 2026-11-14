import { describe, expect, it } from 'vitest'
import { BOMB_RESULT_MS, BOMB_SKIP_AFTER_MS, SKIP_GUARD_MS, skipAllowed, skipDelay } from '@/lib/hoppaover'

describe('rutor som hoppas över med ett tryck', () => {
  it('ett tryck som började innan rutan visades räknas aldrig', () => {
    // Fingret var redan nere när rutan kom fram (trycket började inte på rutan).
    expect(skipAllowed({ shownAt: 1000, pressedAt: null, now: 5000, minMs: SKIP_GUARD_MS })).toBe(false)
    // Trycket började före rutan, även om det släpps långt senare.
    expect(skipAllowed({ shownAt: 1000, pressedAt: 990, now: 5000, minMs: SKIP_GUARD_MS })).toBe(false)
    // Rutan har inte visats än.
    expect(skipAllowed({ shownAt: null, pressedAt: 990, now: 5000, minMs: SKIP_GUARD_MS })).toBe(false)
  })

  it('ett tryck direkt efter att rutan visats räknas inte, men ett lite senare gör det', () => {
    expect(skipAllowed({ shownAt: 1000, pressedAt: 1100, now: 1150, minMs: SKIP_GUARD_MS })).toBe(false)
    expect(skipAllowed({ shownAt: 1000, pressedAt: 1000 + SKIP_GUARD_MS - 50, now: 1000 + SKIP_GUARD_MS - 1, minMs: SKIP_GUARD_MS })).toBe(false)
    expect(skipAllowed({ shownAt: 1000, pressedAt: 1000 + SKIP_GUARD_MS, now: 1000 + SKIP_GUARD_MS + 60, minMs: SKIP_GUARD_MS })).toBe(true)
  })

  it('explosionen går inte att hoppa över de första 1,5 sekunderna', () => {
    expect(BOMB_SKIP_AFTER_MS).toBe(1500)
    for (const at of [0, 200, 800, 1499]) {
      expect(skipAllowed({ shownAt: 0, pressedAt: Math.max(0, at - 40), now: at, minMs: BOMB_SKIP_AFTER_MS })).toBe(false)
    }
    expect(skipAllowed({ shownAt: 0, pressedAt: 1480, now: 1500, minMs: BOMB_SKIP_AFTER_MS })).toBe(true)
  })

  it('resultatet av explosionen syns i minst en sekund även när man hoppar över', () => {
    expect(BOMB_RESULT_MS).toBeGreaterThanOrEqual(1000)
    // Räddad! kommer efter 1350 ms och "exploderade!" efter 1150 ms (TantAnimationer). Hoppar man över så tidigt det går
    // (1500 ms) står rutan kvar tills resultatet synts i en sekund.
    for (const resultAt of [1350, 1150]) {
      const wait = skipDelay(BOMB_SKIP_AFTER_MS, resultAt, BOMB_RESULT_MS)
      expect(BOMB_SKIP_AFTER_MS + wait - resultAt).toBeGreaterThanOrEqual(1000)
    }
    // Har resultatet redan synts länge nog stängs rutan direkt.
    expect(skipDelay(2600, 1350, BOMB_RESULT_MS)).toBe(0)
    expect(skipDelay(2350, 1350, BOMB_RESULT_MS)).toBe(0)
    expect(skipDelay(2000, 1350, BOMB_RESULT_MS)).toBe(350)
  })
})
