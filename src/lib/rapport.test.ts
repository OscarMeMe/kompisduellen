import { afterEach, describe, expect, it, vi } from 'vitest'
import * as statistik from '@/lib/statistik'
import { canSendWish, REPORT_REASONS, reportQuestion, sendWish, WISH_MAX_LENGTH, WISH_PAUSE_MS } from '@/lib/rapport'

describe('Rapportera fel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skickar frågans id och orsaken, och inget annat', () => {
    const track = vi.spyOn(statistik, 'track').mockImplementation(() => {})
    reportQuestion('ps2', 'bild')
    expect(track).toHaveBeenCalledWith('rapporterade_fel', { typ: 'fel', fraga: 'ps2', orsak: 'bild' })
  })

  it('har korta orsaker utan tankstreck', () => {
    expect(REPORT_REASONS.map((reason) => reason.label)).toEqual(['Fel pris', 'Fel bild', 'Konstig text', 'Något annat'])
    for (const reason of REPORT_REASONS) expect(reason.label).not.toMatch(/[–—]/)
  })

  it('önskemål hamnar på samma ställe, markerade som önskemål, med namn bara om man skrivit ett', () => {
    const track = vi.spyOn(statistik, 'track').mockImplementation(() => {})
    const store = memoryStore()
    expect(sendWish('  Ett frågesportspel om musik  ', '', 1000, store)).toBe(true)
    expect(track).toHaveBeenLastCalledWith('rapporterade_fel', { typ: 'önskemål', text: 'Ett frågesportspel om musik' })
    expect(sendWish('Charader', 'Lisa', 1000 + WISH_PAUSE_MS, store)).toBe(true)
    expect(track).toHaveBeenLastCalledWith('rapporterade_fel', { typ: 'önskemål', text: 'Charader', namn: 'Lisa' })
  })

  it('samma skydd mot spam: ett önskemål åt gången per flik, högst 300 tecken och inga tomma', () => {
    const track = vi.spyOn(statistik, 'track').mockImplementation(() => {})
    const store = memoryStore()
    expect(sendWish('  ', '', 1000, store)).toBe(false)
    expect(sendWish('x'.repeat(500), '', 1000, store)).toBe(true)
    expect((track.mock.lastCall![1] as { text: string }).text).toHaveLength(WISH_MAX_LENGTH)
    expect(canSendWish(1000 + WISH_PAUSE_MS - 1, store)).toBe(false)
    expect(sendWish('Ett till', '', 2000, store)).toBe(false)
    expect(track).toHaveBeenCalledTimes(1)
    expect(canSendWish(1000 + WISH_PAUSE_MS, store)).toBe(true)
  })
})

function memoryStore() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}
