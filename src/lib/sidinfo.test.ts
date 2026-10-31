import { describe, expect, it } from 'vitest'
import { findGame } from '@/lib/games'
import { pageMeta, PRERENDER_PATHS, renderHeadTags, SITE_URL } from '@/lib/sidinfo'
import { findGamePage, GAME_PAGES } from '@/lib/spelsidor'

const publicFiles = import.meta.glob(['/public/sitemap.xml', '/public/robots.txt'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const sitemap = publicFiles['/public/sitemap.xml']
const robots = publicFiles['/public/robots.txt']

describe('sidinfo', () => {
  it('ger startsidan och spelsidorna en egen kanonisk adress', () => {
    expect(pageMeta('/').path).toBe('/')
    expect(pageMeta('/spel/gissa-priset').path).toBe('/spel/gissa-priset')
    expect(pageMeta('/spel/gissa-priset/').path).toBe('/spel/gissa-priset')
    expect(pageMeta('/skapa').path).toBe('/skapa')
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

  it('har en spelsida med FAQPage och VideoGame för varje spelsida', () => {
    for (const page of GAME_PAGES) {
      const types = pageMeta(`/spel/${page.slug}`).jsonLd.map((item) => item['@type'])
      expect(types, page.slug).toEqual(['VideoGame', 'FAQPage'])
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
