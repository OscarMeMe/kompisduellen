import { describe, expect, it } from 'vitest'
import { markWinHeard, pickVariant, playTantSound, TANT_SOUND_FILES, TANT_SOUNDS, winSoundKey } from '@/lib/tantljud'

// Alla ljudfiler för spelet i public, som sökvägar på sajten (/ljud/tantpanik/…).
const files = Object.keys(import.meta.glob('/public/ljud/tantpanik/*.mp3')).map((path) => path.replace('/public', ''))

describe('ljuden i Exploderande Tanter', () => {
  it('varje ljud har en fil som finns, och inga andra filer ligger i mappen', () => {
    for (const file of TANT_SOUND_FILES) expect(files, file).toContain(file)
    expect([...files].sort()).toEqual([...new Set(TANT_SOUND_FILES)].sort())
  })

  it('att dra ett kort har flera varianter', () => {
    expect(TANT_SOUNDS.dra.files.length).toBeGreaterThanOrEqual(2)
  })

  it('varianterna slumpas, men aldrig samma två gånger i rad', () => {
    const variants = TANT_SOUNDS.dra.files
    let last: string | undefined
    const played = new Set<string>()
    let seed = 0
    const random = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280)
    for (let i = 0; i < 200; i++) {
      const next = pickVariant(variants, last, random)
      expect(variants).toContain(next)
      expect(next).not.toBe(last)
      played.add(next)
      last = next
    }
    expect(played.size).toBe(variants.length)
    // Med en enda fil spelas alltid den, även när slumpen ger sitt högsta värde.
    expect(pickVariant(['a'], 'a', () => 0.999999)).toBe('a')
    expect(pickVariant(['a', 'b'], undefined, () => 0.999999)).toBe('b')
  })

  it('ett ljud som inte är laddat spelas inte, och det är inget fel', () => {
    expect(playTantSound('dra')).toBe(false)
    expect(playTantSound('vinst')).toBe(false)
  })

  it('vinstjublet spelas exakt en gång per vinst, även efter en omladdning', () => {
    const saved = new Map<string, string>()
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => void saved.set(key, value) }
    const table = { order: ['a', 'b', 'c'], winner: 'b', log: [{ n: 41 }, { n: 42 }] }
    const key = winSoundKey(table)
    expect(markWinHeard(key, storage)).toBe(true)
    // Vinnarens ögonblick visas igen, sidan laddas om eller slutskärmen kommer: samma vinst, inget ljud.
    expect(markWinHeard(key, storage)).toBe(false)
    expect(markWinHeard(winSoundKey({ ...table }), storage)).toBe(false)
    // Nästa match är en ny vinst.
    expect(markWinHeard(winSoundKey({ ...table, log: [{ n: 57 }] }), storage)).toBe(true)
    expect(markWinHeard(winSoundKey({ ...table, winner: 'a', log: [{ n: 57 }] }), storage)).toBe(true)
    // Utan lagring spelas ljudet.
    expect(markWinHeard(key, null)).toBe(true)
  })
})
