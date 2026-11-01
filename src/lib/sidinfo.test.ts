import { describe, expect, it } from 'vitest'
import { findGame } from '@/lib/games'
import { GUIDE_PAGES } from '@/lib/guider'
import { pageMeta, PRERENDER_PATHS, renderHeadTags, SITE_URL } from '@/lib/sidinfo'
import { findGamePage, GAME_PAGES } from '@/lib/spelsidor'

const publicFiles = import.meta.glob(['/public/sitemap.xml', '/public/robots.txt', '/index.html'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const ogImages = Object.keys(import.meta.glob('/public/og/*.png'))
const sitemap = publicFiles['/public/sitemap.xml']
const robots = publicFiles['/public/robots.txt']

describe('sökresultaten och ikonen', () => {
  it('/skapa och /ga-med är inte med i sajtkartan och ber Google att inte visa dem', () => {
    for (const path of ['/skapa', '/ga-med']) {
      expect(sitemap, path).not.toContain(`${SITE_URL}${path}<`)
      expect(pageMeta(path).path, path).toBeNull()
      const tags = renderHeadTags(pageMeta(path))
      expect(tags, path).toContain('<meta name="robots" content="noindex, follow" />')
      expect(tags, path).not.toContain('canonical')
    }
  })

  it('startsidan och spelsidorna får visas i sökresultaten', () => {
    for (const path of PRERENDER_PATHS) expect(renderHeadTags(pageMeta(path)), path).not.toContain('noindex')
  })

  it('sidan länkar ikonen i 48, 96 och 192 px', () => {
    for (const size of [48, 96, 192]) expect(publicFiles['/index.html']).toContain(`sizes="${size}x${size}"`)
  })
})

describe('sidinfo', () => {
  it('ger startsidan och spelsidorna en egen kanonisk adress', () => {
    expect(pageMeta('/').path).toBe('/')
    expect(pageMeta('/spel/gissa-priset').path).toBe('/spel/gissa-priset')
    expect(pageMeta('/spel/gissa-priset/').path).toBe('/spel/gissa-priset')
  })

  it('ger lobbyn, lobbykoder under /spel/ och okända sidor ingen kanonisk adress', () => {
    expect(pageMeta('/lobby/BHKX').path).toBeNull()
    expect(pageMeta('/spel/BHKX').path).toBeNull()
    expect(pageMeta('/profil').path).toBeNull()
    expect(renderHeadTags(pageMeta('/lobby/BHKX'))).not.toContain('canonical')
  })

  it('har alla förrenderade sidor i sajtkartan och släpper igenom dem i robots.txt', () => {
    for (const path of PRERENDER_PATHS) {
      expect(sitemap, path).toContain(`<loc>${SITE_URL}${path}</loc>`)
      if (path.startsWith('/spel/')) expect(robots, path).toMatch(new RegExp(`^Allow: ${path}\\r?$`, 'm'))
    }
  })

  it('skriver taggarna säkert, även med citattecken och <', () => {
    const tags = renderHeadTags({ title: 'A "B" <C>', description: 'x', path: '/', jsonLd: [{ name: '</script>' }] })
    expect(tags).toContain('<title>A &quot;B&quot; &lt;C&gt;</title>')
    expect(tags).not.toContain('</script>"')
    expect(tags).toContain('\\u003c/script>')
  })

  it('ger Imposterjakten en egen delningsbild, och de andra sidorna loggan', () => {
    const tags = renderHeadTags(pageMeta('/spel/imposterjakten'))
    expect(tags).toContain(`<meta property="og:image" content="${SITE_URL}/og/imposterjakten.png" />`)
    expect(tags).toContain('<meta property="og:image:width" content="1200" />')
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(renderHeadTags(pageMeta('/spel/kortkaos'))).toContain(`${SITE_URL}/icon-512.png`)
    for (const page of GAME_PAGES) {
      if (page.image) expect(ogImages, page.slug).toContain(`/public${page.image.path}`)
    }
  })

  it('har en spelsida med FAQPage och VideoGame för varje spelsida', () => {
    for (const page of GAME_PAGES) {
      const types = pageMeta(`/spel/${page.slug}`).jsonLd.map((item) => item['@type'])
      expect(types, page.slug).toEqual(['VideoGame', 'FAQPage'])
    }
  })
})

describe('guiderna', () => {
  it('förrenderas och finns i sajtkartan och robots.txt, med egen titel, beskrivning och FAQPage', () => {
    for (const page of GUIDE_PAGES) {
      const path = `/${page.slug}`
      expect(PRERENDER_PATHS, path).toContain(path)
      expect(sitemap, path).toContain(`<loc>${SITE_URL}${path}</loc>`)
      expect(robots, path).toMatch(new RegExp(`^Allow: ${path}\\r?$`, 'm'))
      const meta = pageMeta(path)
      expect(meta.title, path).toBe(page.title)
      expect(meta.path, path).toBe(path)
      expect(meta.jsonLd.map((item) => item['@type']), path).toEqual(['FAQPage'])
    }
  })

  it('har 2 till 3 vanliga frågor och bara spel som går att spela, utan tankstreck i texterna', () => {
    for (const page of GUIDE_PAGES) {
      expect(page.faq.length, page.slug).toBeGreaterThanOrEqual(2)
      expect(page.faq.length, page.slug).toBeLessThanOrEqual(3)
      for (const item of page.games) expect(findGame(item.gameId)?.playable, item.gameId).toBe(true)
      expect(JSON.stringify(page), page.slug).not.toMatch(/\s[–—]\s/)
      expect(page.slug, page.slug).not.toMatch(/^[a-z]{4}$/i)
    }
  })
})

describe('spelsidorna', () => {
  it('hör till spel som går att spela, och sökvägen kan inte förväxlas med en lobbykod', () => {
    for (const page of GAME_PAGES) {
      expect(findGame(page.gameId)?.playable, page.slug).toBe(true)
      expect(page.slug, page.slug).not.toMatch(/^[a-z]{4}$/i)
    }
    expect(findGamePage('BHKX')).toBeUndefined()
  })

  it('har inga tankstreck som paus i texterna (intervall som 2–12 är okej)', () => {
    for (const page of GAME_PAGES) {
      const texts = [page.title, page.description, page.heading, ...page.intro, ...page.steps, page.time]
      for (const item of page.faq) texts.push(item.question, item.answer)
      for (const text of texts) expect(text, page.slug).not.toMatch(/ [–—] |—| - /)
    }
  })

  it('har en kort beskrivning som får plats i sökresultaten', () => {
    for (const page of GAME_PAGES) expect(page.description.length, page.slug).toBeLessThanOrEqual(160)
  })
})
