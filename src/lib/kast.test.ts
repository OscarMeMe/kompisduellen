import { describe, expect, it } from 'vitest'
import {
  acceptThrow,
  canThrow,
  findThrowItem,
  hitText,
  nextSplat,
  THROW_ACCEPT_MS,
  THROW_COOLDOWN_MS,
  THROW_ITEMS,
  throwCooldownSeconds,
  throwTargets,
} from '@/lib/kast'

describe('kast', () => {
  it('låter mig kasta en gång per 15 sekunder', () => {
    expect(THROW_COOLDOWN_MS).toBe(15_000)
    expect(canThrow(null, 1000)).toBe(true)
    expect(canThrow(1000, 1000 + 14_999)).toBe(false)
    expect(canThrow(1000, 1000 + 15_000)).toBe(true)
  })

  it('räknar ner sekunderna tills jag får kasta igen', () => {
    expect(throwCooldownSeconds(null, 5000)).toBe(0)
    expect(throwCooldownSeconds(0, 0)).toBe(15)
    expect(throwCooldownSeconds(0, 2500)).toBe(13)
    expect(throwCooldownSeconds(0, 15_000)).toBe(0)
    expect(throwCooldownSeconds(0, 60_000)).toBe(0)
  })

  it('släpper igenom högst ett kast per avsändare inom spärren, med lite marginal för nätet', () => {
    expect(acceptThrow(undefined, 1000)).toBe(true)
    expect(acceptThrow(1000, 1000 + 5000)).toBe(false)
    expect(acceptThrow(1000, 1000 + THROW_ACCEPT_MS - 1)).toBe(false)
    expect(acceptThrow(1000, 1000 + THROW_ACCEPT_MS)).toBe(true)
    expect(THROW_ACCEPT_MS).toBeLessThan(THROW_COOLDOWN_MS)
  })

  it('kastar inte på mig själv eller på den som stängt av kast', () => {
    const online = [{ id: 'jag' }, { id: 'lisa' }, { id: 'kim', noThrows: true }, { id: 'ali', noThrows: false }]
    expect(throwTargets(online, 'jag').map((p) => p.id)).toEqual(['lisa', 'ali'])
  })

  it('visar en splatt åt gången, fler kast blir bara rader', () => {
    const place = { top: 60, size: 200 }
    const first = { key: 'a', from: 'Oscar', item: 'tomat' as const, place }
    const second = { key: 'b', from: 'Lisa', item: 'paj' as const, place }
    expect(nextSplat(null, first)).toEqual({ splat: first, shown: true })
    expect(nextSplat(first, second)).toEqual({ splat: first, shown: false })
  })

  it('har fyra saker med texter utan tankstreck', () => {
    expect(THROW_ITEMS.map((item) => item.id)).toEqual(['tomat', 'paj', 'agg', 'toapapper'])
    expect(findThrowItem('agg')?.emoji).toBe('🥚')
    expect(findThrowItem('bomb')).toBeUndefined()
    expect(hitText('Oscar', findThrowItem('tomat')!)).toBe('Oscar kastade en tomat på dig!')
    expect(hitText('Lisa', findThrowItem('agg')!)).toBe('Lisa kastade ett ägg på dig!')
    expect(hitText('Kim', findThrowItem('toapapper')!)).toBe('Kim kastade toapapper på dig!')
    for (const item of THROW_ITEMS) expect(hitText('A', item)).not.toMatch(/[–—]/)
  })

  it('ger ägget och pajen olika färger', () => {
    expect(findThrowItem('agg')?.splat).not.toBe(findThrowItem('paj')?.splat)
  })
})
