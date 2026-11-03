import { describe, expect, it } from 'vitest'
import {
  acceptThrow,
  addThrow,
  EMPTY_THROW_STATS,
  throwCounterText,
  totalThrows,
  type ThrowItemId,
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
  it('låter mig kasta en gång per 10 sekunder', () => {
    expect(THROW_COOLDOWN_MS).toBe(10_000)
    expect(canThrow(null, 1000)).toBe(true)
    expect(canThrow(1000, 1000 + 9_999)).toBe(false)
    expect(canThrow(1000, 1000 + 10_000)).toBe(true)
  })

  it('räknar ner sekunderna tills jag får kasta igen', () => {
    expect(throwCooldownSeconds(null, 5000)).toBe(0)
    expect(throwCooldownSeconds(0, 0)).toBe(10)
    expect(throwCooldownSeconds(0, 2500)).toBe(8)
    expect(throwCooldownSeconds(0, 10_000)).toBe(0)
    expect(throwCooldownSeconds(0, 60_000)).toBe(0)
    // Klockan som visar nedräkningen kan ligga lite före kastet.
    expect(throwCooldownSeconds(5000, 4000)).toBe(10)
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

  it('har fem saker med texter utan tankstreck', () => {
    expect(THROW_ITEMS.map((item) => item.id)).toEqual(['tomat', 'paj', 'agg', 'toapapper', 'gurka'])
    expect(findThrowItem('agg')?.emoji).toBe('🥚')
    expect(findThrowItem('bomb')).toBeUndefined()
    expect(hitText('Oscar', findThrowItem('tomat')!)).toBe('Oscar kastade en tomat på dig!')
    expect(hitText('Lisa', findThrowItem('agg')!)).toBe('Lisa kastade ett ägg på dig!')
    expect(hitText('Kim', findThrowItem('toapapper')!)).toBe('Kim kastade toapapper på dig!')
    expect(hitText('Oscar', findThrowItem('gurka')!)).toBe('Oscar kastade en gurka på dig!')
    for (const item of THROW_ITEMS) expect(hitText('A', item)).not.toMatch(/[–—]/)
  })

  it('ger ägget och pajen olika färger', () => {
    expect(findThrowItem('agg')?.splat).not.toBe(findThrowItem('paj')?.splat)
  })
})

describe('kasträknaren', () => {
  const lisa = { id: 'l', name: 'Lisa' }
  const oscar = { id: 'o', name: 'Oscar' }
  const many = (list: [ThrowItemId, { id: string; name: string }][]) =>
    list.reduce((stats, [item, to]) => addThrow(stats, item, to), EMPTY_THROW_STATS)

  it('räknar saker och träffar utan att ändra det gamla värdet', () => {
    const one = addThrow(EMPTY_THROW_STATS, 'tomat', lisa)
    const two = addThrow(one, 'tomat', lisa)
    expect(EMPTY_THROW_STATS).toEqual({ items: {}, received: {} })
    expect(one.items.tomat).toBe(1)
    expect(two.items.tomat).toBe(2)
    expect(two.received.l).toEqual({ name: 'Lisa', count: 2 })
    expect(totalThrows(two)).toBe(2)
  })

  it('säger till när inget kastats', () => {
    expect(throwCounterText(EMPTY_THROW_STATS)).toBe('Ingen har kastat något än.')
  })

  it('skriver ett enda kast i singular', () => {
    expect(throwCounterText(many([['tomat', lisa]]))).toBe('Ni har kastat 1 tomat, på Lisa.')
    expect(throwCounterText(many([['agg', oscar]]))).toBe('Ni har kastat 1 ägg, på Oscar.')
  })

  it('skriver saken i plural när bara en sorts sak kastats', () => {
    expect(throwCounterText(many([['tomat', lisa], ['tomat', lisa], ['tomat', oscar]]))).toBe('Ni har kastat 3 tomater. Lisa har fått flest.')
    expect(throwCounterText(many([['toapapper', lisa], ['toapapper', lisa]]))).toBe('Ni har kastat 2 toapapper. Lisa har fått flest.')
  })

  it('skriver saker och vad som kastats mest när det är blandat', () => {
    expect(throwCounterText(many([['paj', lisa], ['paj', lisa], ['gurka', lisa]]))).toBe('Ni har kastat 3 saker, mest pajer. Lisa har fått flest.')
    expect(throwCounterText(many([['paj', lisa], ['gurka', lisa]]))).toBe('Ni har kastat 2 saker. Lisa har fått flest.')
  })

  it('namnger delad förstaplats, men inte fler än tre', () => {
    const a = { id: 'a', name: 'A' }
    const b = { id: 'b', name: 'B' }
    const c = { id: 'c', name: 'C' }
    const d = { id: 'd', name: 'D' }
    expect(throwCounterText(many([['tomat', a], ['tomat', b]]))).toBe('Ni har kastat 2 tomater. A och B har fått flest.')
    expect(throwCounterText(many([['tomat', a], ['tomat', b], ['tomat', c]]))).toBe('Ni har kastat 3 tomater. A, B och C har fått flest.')
    expect(throwCounterText(many([['tomat', a], ['tomat', b], ['tomat', c], ['tomat', d]]))).toBe('Ni har kastat 4 tomater. Flera ligger lika.')
  })

  it('ignorerar okända saker från läget', () => {
    expect(throwCounterText({ items: { sten: 5 }, received: {} })).toBe('Ingen har kastat något än.')
  })
})
