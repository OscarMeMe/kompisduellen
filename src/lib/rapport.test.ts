import { afterEach, describe, expect, it, vi } from 'vitest'
import * as statistik from '@/lib/statistik'
import { REPORT_REASONS, reportQuestion } from '@/lib/rapport'

describe('Rapportera fel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skickar frågans id och orsaken, och inget annat', () => {
    const track = vi.spyOn(statistik, 'track').mockImplementation(() => {})
    reportQuestion('ps2', 'bild')
    expect(track).toHaveBeenCalledWith('rapporterade_fel', { fraga: 'ps2', orsak: 'bild' })
  })

  it('har korta orsaker utan tankstreck', () => {
    expect(REPORT_REASONS.map((reason) => reason.label)).toEqual(['Fel pris', 'Fel bild', 'Konstig text', 'Något annat'])
    for (const reason of REPORT_REASONS) expect(reason.label).not.toMatch(/[–—]/)
  })
})
