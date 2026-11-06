import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomId } from '@/lib/slumpid'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('ger ett id även när randomUUID saknas (sidan öppnad via http i nätverket)', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: (array: Uint8Array<ArrayBuffer>) => real.getRandomValues(array) })
    const ids = new Set(Array.from({ length: 50 }, () => randomId()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(UUID)
  })

  it('använder randomUUID när den finns', () => {
    expect(randomId()).toMatch(UUID)
  })
})
