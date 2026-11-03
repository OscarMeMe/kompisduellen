import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHitTracker, HIT_VISIBLE_MS, type FigureHits } from '@/lib/figurTraffar'
import { IMPACT_MS } from '@/lib/kast'

describe('träffar i väntrummet', () => {
  let latest: FigureHits
  let blocked: Set<string>
  const start = () => {
    const tracker = createHitTracker((hits) => {
      latest = hits
    })
    return { ...tracker, thrown: (id: string) => tracker.thrown(id, () => !blocked.has(id)) }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    latest = {}
    blocked = new Set()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reagerar när kastet landar och inte när det skickas', () => {
    const tracker = start()
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS - 1)
    expect(latest.a).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(latest.a).toBeDefined()
    vi.advanceTimersByTime(HIT_VISIBLE_MS - 1)
    expect(latest.a).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(latest.a).toBeUndefined()
  })

  it('startar om rörelsen och tiden vid flera kast i rad', () => {
    const tracker = start()
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS)
    const first = latest.a
    vi.advanceTimersByTime(HIT_VISIBLE_MS - 100)
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS)
    expect(latest.a).toBeGreaterThan(first)
    vi.advanceTimersByTime(HIT_VISIBLE_MS - 1)
    expect(latest.a).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(latest.a).toBeUndefined()
  })

  it('startar om även när två kast är i luften samtidigt', () => {
    const tracker = start()
    tracker.thrown('a')
    vi.advanceTimersByTime(100)
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS - 100)
    const first = latest.a
    vi.advanceTimersByTime(100)
    expect(latest.a).toBeGreaterThan(first)
  })

  it('håller isär spelarna', () => {
    const tracker = start()
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS)
    tracker.thrown('b')
    vi.advanceTimersByTime(HIT_VISIBLE_MS)
    expect(latest.a).toBeUndefined()
    expect(latest.b).toBeDefined()
  })

  it('städar bort timern när spelaren lämnar, både under flykten och efter träffen', () => {
    const tracker = start()
    tracker.thrown('a')
    tracker.thrown('b')
    vi.advanceTimersByTime(IMPACT_MS)
    tracker.thrown('b')
    tracker.sync([])
    expect(latest).toEqual({})
    expect(vi.getTimerCount()).toBe(0)
  })

  it('låter den som är kvar stå orörd när någon annan lämnar', () => {
    const tracker = start()
    tracker.thrown('a')
    tracker.thrown('b')
    vi.advanceTimersByTime(IMPACT_MS)
    tracker.sync(['a'])
    expect(latest.a).toBeDefined()
    expect(latest.b).toBeUndefined()
  })

  it('reagerar inte om spelaren stängt av Ta emot kast medan kastet flög', () => {
    const tracker = start()
    tracker.thrown('a')
    blocked.add('a')
    vi.advanceTimersByTime(IMPACT_MS)
    expect(latest.a).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stop tar bort alla timers', () => {
    const tracker = start()
    tracker.thrown('a')
    vi.advanceTimersByTime(IMPACT_MS)
    tracker.thrown('b')
    tracker.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
