import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { BLOBS, MOOD_MOTION, MOODS, type BlobFigure } from '@/lib/figurer'

// Ett lager ur figurens markup. Lagren är inte nästlade i varandra.
function layer(html: string, name: string): string {
  const start = html.indexOf(`data-lager="${name}"`)
  const next = html.indexOf('data-lager=', start + 1)
  return html.slice(start, next === -1 ? undefined : next)
}

describe('Figur', () => {
  it('ritar alla figurer med alla miner, med figurens namn för skärmläsare', () => {
    for (const blob of BLOBS) {
      for (const mood of MOODS) {
        const html = renderToStaticMarkup(<Figur figure={blob} mood={mood} />)
        expect(html).toContain(`aria-label="${blob.name}"`)
        expect(layer(html, 'min')).toMatch(/<(path|circle|ellipse)/)
      }
    }
  })

  it('byter miner utan att ändra kroppen', () => {
    const [blob] = BLOBS
    const back = (mood: 'vantar' | 'traffad') => layer(renderToStaticMarkup(<Figur figure={blob} mood={mood} />), 'bak').replace(/_R[^"#)]*/g, '').replace(/url\(#[^)]*\)|id="[^"]*"/g, '')
    expect(back('traffad')).toBe(back('vantar'))
  })

  it('en kropp som PNG ger samma min och samma lager, och bilden ritas i stället', () => {
    const drawn = BLOBS[1]
    const png: BlobFigure = { ...drawn, body: { kind: 'png', src: '/figurer/spion.png', frontSrc: '/figurer/spion-glas.png' } }
    for (const mood of MOODS) {
      const fromDrawn = renderToStaticMarkup(<Figur figure={drawn} mood={mood} />)
      const fromPng = renderToStaticMarkup(<Figur figure={png} mood={mood} />)
      expect(layer(fromPng, 'min')).toBe(layer(fromDrawn, 'min'))
      expect(layer(fromPng, 'bak')).toContain('href="/figurer/spion.png"')
      expect(layer(fromPng, 'fram')).toContain('href="/figurer/spion-glas.png"')
    }
  })

  it('låter Spionens glasögon hamna snett bara när den är träffad eller anklagad', () => {
    const spy = BLOBS.find((blob) => blob.id === 'spionen')!
    const hasTilt = (mood: (typeof MOODS)[number]) => layer(renderToStaticMarkup(<Figur figure={spy} mood={mood} />), 'fram').includes('transform="')
    expect(MOODS.filter(hasTilt)).toEqual(['anklagad', 'traffad'])
  })

  it('rör sig bara när den ska, och alltid med motion-safe', () => {
    const [blob] = BLOBS
    for (const mood of MOODS) {
      expect(MOOD_MOTION[mood]).toMatch(/^motion-safe:/)
      expect(renderToStaticMarkup(<Figur figure={blob} mood={mood} />)).not.toContain('animate-blob')
    }
    expect(renderToStaticMarkup(<Figur figure={blob} animated />)).toContain('motion-safe:animate-blob-idle')
  })
})

describe('Emoji med blobbar', () => {
  it('ritar en blobb stilla för blobbens värde, även med variantväljare', () => {
    for (const blob of BLOBS) {
      const html = renderToStaticMarkup(<Emoji emoji={blob.emoji} className="text-2xl" />)
      expect(html).toContain('<svg')
      expect(html).toContain(`aria-label="${blob.name}"`)
      expect(html).toContain('text-2xl')
      expect(html).not.toContain('animate-blob')
    }
    expect(renderToStaticMarkup(<Emoji emoji={'🎩️'} />)).toContain('aria-label="Spionen"')
  })

  it('visar vanliga emoji som bilder som förut, även de som var figurer (flikarna på startsidan använder dem)', () => {
    const html = renderToStaticMarkup(<Emoji emoji="🤖" className="text-2xl" />)
    expect(html).toContain('/emoji/robot.png')
    expect(html).not.toContain('<svg')
  })
})
