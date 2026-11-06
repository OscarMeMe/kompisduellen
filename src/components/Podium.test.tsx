import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Podium } from '@/components/Podium'
import type { RankedPlayer } from '@/lib/match'

const player = (id: string, score: number, place: number): RankedPlayer => ({ id, name: id, avatar: '🙂', score, place })

describe('prispallen', () => {
  it('visar medaljer när någon fick poäng', () => {
    const html = renderToStaticMarkup(<Podium players={[player('a', 5, 1), player('b', 3, 2), player('c', 1, 3)]} />)
    expect(html).toContain('🥇')
    expect(html).toContain('🥈')
  })

  it('visar ingen medalj när ingen fick poäng', () => {
    const html = renderToStaticMarkup(<Podium players={[player('a', 0, 1), player('b', 0, 1)]} />)
    expect(html).not.toContain('🥇')
  })
})
