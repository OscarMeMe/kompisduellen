import { describe, expect, it, vi } from 'vitest'

// Klienten skapas när filen läses in och kräver nycklar, så den byts mot en tom i testet.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { felText, hasHost } from '@/lib/lobbykoll'

describe('lobbykoll', () => {
  it('en lobby finns när någon i närvarolistan är värd', () => {
    expect(hasHost({ a: [{ host: true }], b: [{ host: false }] })).toBe(true)
    expect(hasHost({ a: [{ host: false }] })).toBe(false)
    expect(hasHost({})).toBe(false)
  })

  it('ger ett kort och tydligt felmeddelande', () => {
    expect(felText('BHKX', 'saknas')).toBe('Ingen lobby med koden BHKX. Kolla koden eller be värden om en ny.')
    expect(felText('BHKX', 'fel')).toContain('Försök igen')
    expect(`${felText('BHKX', 'saknas')}${felText('BHKX', 'fel')}`).not.toMatch(/[–—]/)
  })
})
