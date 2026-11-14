import { describe, expect, it } from 'vitest'
import { MUSIC_FILES, MUSIC_SETS, musicGain, soundBounds } from '@/lib/tantmusik'

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

describe('musiken i Imposterjakten', () => {
  it('har ett spår för väntrummet som finns, och matchen är tyst och har inget eget spår', () => {
    expect(MUSIC_SETS.imposter.lobby).toBe('/musik/imposter-vantrum.mp3')
    expect(files).toContain(MUSIC_SETS.imposter.lobby)
    const match = MUSIC_SETS.imposter.match
    if (match !== null) expect(files).toContain(match)
    // Ingen reservslinga: den är skriven för Exploderande Tanter.
    expect(MUSIC_SETS.imposter.synth).toBe(false)
  })

  it('spelar matchen tydligt lägre än Exploderande Tanter, och väntrummet lika lågt', () => {
    for (const slider of [0.2, 0.5, 1]) {
      expect(musicGain(slider, 'match', 'imposter')).toBeLessThanOrEqual(musicGain(slider, 'match', 'tant') * 0.5)
      expect(musicGain(slider, 'lobby', 'imposter')).toBe(musicGain(slider, 'lobby', 'tant'))
    }
    expect(musicGain(0.5, 'match', 'imposter')).toBeCloseTo(0.1)
  })

  it('klipper bort tystnaden i början och slutet av spåret, så att loopen blir sömlös', () => {
    const rate = 1000
    const channel = new Float32Array(2000)
    channel.fill(0.5, 30, 1950)
    expect(soundBounds([channel], rate)).toEqual({ start: 0.03, end: 1.95 })
    // Ett spår utan tystnad lämnas som det är, och tystnad mitt i spåret rörs inte.
    const full = new Float32Array(2000).fill(0.5)
    full.fill(0, 900, 1100)
    expect(soundBounds([full], rate)).toEqual({ start: 0, end: 2 })
    // Två kanaler: ljud i någon av dem räknas.
    const left = new Float32Array(2000)
    const right = new Float32Array(2000)
    left.fill(0.5, 100, 1900)
    right.fill(0.5, 50, 1800)
    expect(soundBounds([left, right], rate)).toEqual({ start: 0.05, end: 1.9 })
  })
})
