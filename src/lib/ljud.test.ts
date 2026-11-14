import { describe, expect, it } from 'vitest'
import { THROW_ITEMS } from '@/lib/kast'
import { hasOwnSound } from '@/lib/ljud'
import { REACTIONS } from '@/lib/reaktioner'

describe('ljuden för reaktioner och kast', () => {
  it('har ett eget ljud för varje reaktion och varje sak man kan kasta', () => {
    for (const { emoji } of [...REACTIONS, ...THROW_ITEMS]) expect(hasOwnSound(emoji), emoji).toBe(true)
  })

  it('faller tillbaka på ploppet för allt annat', () => {
    expect(hasOwnSound('🦄')).toBe(false)
  })
})
