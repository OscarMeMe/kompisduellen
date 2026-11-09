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

describe('armar och prylar', () => {
  const arms = (blob: BlobFigure, mood: (typeof MOODS)[number]) => layer(renderToStaticMarkup(<Figur figure={blob} mood={mood} />), 'armar')

  it('ger alla tolv armar som följer minen', () => {
    for (const blob of BLOBS) {
      const poses = new Set(MOODS.map((mood) => arms(blob, mood)))
      expect(poses.size, blob.name).toBe(MOODS.length)
      for (const mood of MOODS) expect(arms(blob, mood), `${blob.name} ${mood}`).toMatch(/<path/)
    }
  })

  it('låter en kropp som bild ha egna armar', () => {
    const png: BlobFigure = { ...BLOBS[0], body: { kind: 'png', src: '/figurer/klump.png' } }
    expect(arms(png, 'vann')).not.toMatch(/<path|<circle/)
  })

  it('ritar inga filter och rör prylarna bara i väntrummet', () => {
    for (const blob of BLOBS) {
      for (const mood of MOODS) {
        const html = renderToStaticMarkup(<Figur figure={blob} mood={mood} />)
        expect(html, blob.name).not.toMatch(/<filter|filter=/)
        expect(html, blob.name).not.toContain('animate-blob')
      }
    }
    const lively = (id: string) => renderToStaticMarkup(<Figur figure={BLOBS.find((blob) => blob.id === id)!} animated lively />)
    expect(lively('klumpen')).toContain('motion-safe:animate-blob-bubble')
    expect(lively('brakis')).toContain('motion-safe:animate-blob-smoke')
    expect(lively('plugghasten')).toContain('motion-safe:animate-blob-propeller')
  })

  it('drar ned Sjusovarens sovmask över ögonen när den sover', () => {
    const sova = BLOBS.find((blob) => blob.id === 'sjusovaren')!
    expect(layer(renderToStaticMarkup(<Figur figure={sova} animated lively asleep />), 'fram')).toContain('pryl-sovmask')
    expect(layer(renderToStaticMarkup(<Figur figure={sova} animated lively />), 'fram')).not.toContain('pryl-sovmask')
  })

  it('har kvar tantklänningen och vinnarkronan, under och över armarna', () => {
    for (const blob of BLOBS) {
      const html = renderToStaticMarkup(<Figur figure={blob} mood="vann" dress crown />)
      const armsAt = html.indexOf('data-lager="armar"')
      expect(html.indexOf('var(--klanning)'), blob.name).toBeGreaterThan(-1)
      expect(html.indexOf('var(--klanning)'), blob.name).toBeLessThan(armsAt)
      expect(html.lastIndexOf('var(--tant-guld)'), blob.name).toBeGreaterThan(armsAt)
    }
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

describe('de nya minerna och personligheterna', () => {
  it('ritar sur för alla tolv, även Ögat med ett enda öga och ett bryn', () => {
    for (const blob of BLOBS) {
      const html = renderToStaticMarkup(<Figur figure={blob} mood="sur" animated />)
      expect(layer(html, 'min')).toMatch(/<(path|circle|ellipse)/)
      expect(html).toContain('motion-safe:animate-blob-sulk')
    }
    const ogat = BLOBS.find((blob) => blob.id === 'ogat')!
    // En pupill (ljuspunkterna i ögat räknas inte).
    expect((layer(renderToStaticMarkup(<Figur figure={ogat} mood="sur" />), 'min').match(/<circle[^>]*fill-foreground/g) ?? []).length).toBe(1)
  })

  it('smälter vid utröstad', () => {
    expect(renderToStaticMarkup(<Figur figure={BLOBS[0]} mood="utrostad" animated />)).toContain('motion-safe:animate-blob-melt')
  })

  it('har sin egen rörelse bara i väntrummet, och bara när den väntar', () => {
    const klumpen = BLOBS.find((blob) => blob.id === 'klumpen')!
    expect(renderToStaticMarkup(<Figur figure={klumpen} animated lively />)).toContain('motion-safe:animate-blob-bounce')
    expect(renderToStaticMarkup(<Figur figure={klumpen} animated />)).not.toContain('animate-blob-bounce')
    expect(renderToStaticMarkup(<Figur figure={klumpen} mood="traffad" animated lively />)).not.toContain('animate-blob-bounce')
    const plugg = BLOBS.find((blob) => blob.id === 'plugghasten')!
    expect(renderToStaticMarkup(<Figur figure={plugg} animated lively />)).toContain('motion-safe:animate-blob-glasses')
    expect(renderToStaticMarkup(<Figur figure={plugg} />)).not.toContain('animate-blob-glasses')
  })

  it('visar Sjusovaren sovande med slutna ögon och ett z', () => {
    const sova = BLOBS.find((blob) => blob.id === 'sjusovaren')!
    const asleep = renderToStaticMarkup(<Figur figure={sova} animated lively asleep />)
    expect(asleep).toContain('animate-blob-zzz')
    expect(layer(asleep, 'min')).not.toContain('<circle')
    expect(renderToStaticMarkup(<Figur figure={sova} animated lively />)).not.toContain('animate-blob-zzz')
  })

  it('låter bara Sjusovaren somna, även när hela väntrummet är tyst', () => {
    for (const blob of BLOBS.filter((other) => other.id !== 'sjusovaren')) {
      const html = renderToStaticMarkup(<Figur figure={blob} animated lively asleep />)
      expect(html, blob.name).not.toContain('animate-blob-zzz')
      expect(layer(html, 'min'), blob.name).toContain('<circle')
    }
  })

  it('alla figurer följer muspekaren i väntrummet, även Kungen som sneglar under ögonlocken', () => {
    for (const blob of BLOBS) {
      const html = renderToStaticMarkup(<Figur figure={blob} animated lively gaze />)
      expect(html, blob.id).toContain('var(--gaze-x')
    }
    expect(renderToStaticMarkup(<Figur figure={BLOBS.find((blob) => blob.id === 'kungen')!} animated lively />)).not.toContain('var(--gaze-x')
  })
})
