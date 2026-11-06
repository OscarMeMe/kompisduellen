import { describe, expect, it } from 'vitest'
import { shouldKeepScreenOn } from '@/lib/device'

describe('värdens skärm', () => {
  const base = { isHost: true, connected: true, inMatch: false, othersPresent: true }

  it('hålls tänd i väntrummet och på slutskärmen när andra är med', () => {
    expect(shouldKeepScreenOn(base)).toBe(true)
  })

  it('släcks som vanligt när värden är ensam utanför en match', () => {
    expect(shouldKeepScreenOn({ ...base, othersPresent: false })).toBe(false)
  })

  it('hålls alltid tänd under en match, även i en provomgång', () => {
    expect(shouldKeepScreenOn({ ...base, inMatch: true, othersPresent: false })).toBe(true)
  })

  it('gäller bara värden, och bara när lobbyn är ansluten', () => {
    expect(shouldKeepScreenOn({ ...base, isHost: false })).toBe(false)
    expect(shouldKeepScreenOn({ ...base, connected: false })).toBe(false)
  })
})
