import { describe, expect, it } from 'vitest'
import { GAMES, findGame } from '@/lib/games'
import { gameNames, GUIDE_PAGES } from '@/lib/guider'
import { GAME_PAGES, gamePageFor } from '@/lib/spelsidor'

const guide = (slug: string) => GUIDE_PAGES.find((page) => page.slug === slug)!

describe('guiderna', () => {
  it('skriver spelens namn i löpande text', () => {
    expect(gameNames(['gissa-priset'])).toBe('Gissa priset')
    expect(gameNames(['gissa-priset', 'narmast'])).toBe('Gissa priset och Närmast vinner')
    expect(gameNames(['gissa-priset', 'narmast', 'kortkaos'])).toBe('Gissa priset, Närmast vinner och Kortkaos')
  })

  it('förfestguiden och Discordguiden har alla spelbara spel med egen spelsida, så att ett nytt spel inte glöms bort', () => {
    const playable = GAMES.filter((game) => game.playable && gamePageFor(game.id)).map((game) => game.id)
    expect(playable).toContain('tantpanik')
    for (const slug of ['forfestlekar', 'spel-pa-discord']) {
      expect(guide(slug).games.map((item) => item.gameId).sort(), slug).toEqual([...playable].sort())
    }
  })

  it('nämner varje spel i guiden vid namn i texten som räknar upp dem', () => {
    for (const item of guide('forfestlekar').games) expect(guide('forfestlekar').description).toContain(findGame(item.gameId)!.name)
    for (const item of guide('spel-pa-discord').games) expect(guide('spel-pa-discord').answer).toContain(findGame(item.gameId)!.name)
  })

  it('säger inte hur många spel det är i förfestguiden och Discordguiden, så att texten håller när nya spel kommer', () => {
    const counts = /\b(\d+|två|tre|fyra|fem|sex|sju|åtta) (gratis )?(spel|förfestlekar|lekar)\b/i
    for (const slug of ['forfestlekar', 'spel-pa-discord']) {
      const page = guide(slug)
      for (const text of [page.title, page.description, page.heading, page.answer]) expect(text, slug).not.toMatch(counts)
    }
  })

  it('varje spel i en guide har en spelsida med tid, så att jämförelsen blir komplett', () => {
    for (const page of GUIDE_PAGES) {
      for (const item of page.games) expect(gamePageFor(item.gameId)?.time, `${page.slug} ${item.gameId}`).toBeTruthy()
    }
  })

  it('texterna har inga tankstreck som paus', () => {
    const texts = [
      ...GUIDE_PAGES.flatMap((page) => [page.title, page.description, page.heading, page.answer, ...page.games.map((item) => item.text), ...page.faq.flatMap((item) => [item.question, item.answer])]),
      ...GAME_PAGES.flatMap((page) => [page.title, page.description, page.heading, ...page.intro, ...page.steps, ...page.faq.flatMap((item) => [item.question, item.answer])]),
    ]
    // Tankstreck mellan siffror (2–10 spelare) är intervall och går bra.
    for (const text of texts) expect(text.replace(/\d–\d/g, ''), text).not.toMatch(/[–—]/)
  })
})
