import { describe, expect, it } from 'vitest'
import { MUSIC_FILES, musicGain } from '@/lib/tantmusik'

// Alla musikfiler i public, som sökvägar på sajten (/musik/…).
const files = Object.keys(import.meta.glob('/public/musik/*.mp3')).map((path) => path.replace('/public', ''))

describe('musiken i Exploderande Tanter', () => {
  it('har ett spår för väntrummet och ett för matchen, och båda filerna finns', () => {
    expect(MUSIC_FILES).toEqual({ lobby: '/musik/vantrum.mp3', match: '/musik/kafferep.mp3' })
    expect(files).toContain(MUSIC_FILES.lobby)
    expect(files).toContain(MUSIC_FILES.match)
  })

  it('är aldrig högre än 15 % i väntrummet', () => {
    for (const slider of [0, 0.2, 0.5, 0.8, 1]) expect(musicGain(slider, 'lobby')).toBeLessThanOrEqual(0.15)
    expect(musicGain(0, 'lobby')).toBe(0)
    expect(musicGain(1, 'lobby')).toBe(0.15)
  })

  it('är 25 % i matchen med reglaget i mitten', () => {
    expect(musicGain(0.5, 'match')).toBe(0.25)
    expect(musicGain(0, 'match')).toBe(0)
  })
})
