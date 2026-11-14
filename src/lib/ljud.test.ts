import { describe, expect, it } from 'vitest'
import { THROW_ITEMS } from '@/lib/kast'
import { hasOwnSound, TANT_WIN_SOUND } from '@/lib/ljud'
import { REACTIONS } from '@/lib/reaktioner'

describe('ljuden för reaktioner och kast', () => {
  it('har ett eget ljud för varje reaktion och varje sak man kan kasta', () => {
    for (const { emoji } of [...REACTIONS, ...THROW_ITEMS]) expect(hasOwnSound(emoji), emoji).toBe(true)
  })

  it('faller tillbaka på ploppet för allt annat', () => {
    expect(hasOwnSound('🦄')).toBe(false)
  })
})

describe('ljudfilerna', () => {
  // Alla ljudfiler i public, som sökvägar på sajten (/ljud/…).
  const files = Object.keys(import.meta.glob('/public/ljud/*.mp3')).map((path) => path.replace('/public', ''))

  it('vinstjublet i Exploderande Tanter finns', () => {
    expect(files).toContain(TANT_WIN_SOUND)
  })
})
