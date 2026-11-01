import { describe, expect, it } from 'vitest'
import { priceRules } from '@/lib/gissa-priset'
import { ALL_PRICE_ITEMS, EXAMPLE_ITEMS, findPriceItem, GAME_ITEMS, PRICE_ITEMS, questionText } from '@/lib/prisdata'

// Filerna i public/prisbilder, t.ex. '/public/prisbilder/game-boy-1990.webp'.
const files = Object.keys(import.meta.glob('/public/prisbilder/*'))

describe('bilderna i Gissa priset', () => {
  // Även dolda frågor har sina bilder kvar.
  const withImage = ALL_PRICE_ITEMS.filter((item) => item.image)

  it('finns i public/prisbilder', () => {
    for (const item of withImage) {
      expect(item.image).toMatch(/^\/prisbilder\/.+\.webp$/)
      expect(files, item.id).toContain(`/public${item.image}`)
    }
  })

  it('har en länk till bildens sida', () => {
    for (const item of withImage) expect(item.imageSource, item.id).toMatch(/^https:\/\//)
  })

  it('används allihop', () => {
    const used = withImage.map((item) => `/public${item.image}`)
    for (const file of files) expect(used, file).toContain(file)
  })
})

describe('exempelfrågorna på startsidan', () => {
  it('är tre frågor med en bild som visar just saken', () => {
    expect(EXAMPLE_ITEMS).toHaveLength(3)
    for (const example of EXAMPLE_ITEMS) {
      expect(example.image, example.id).toMatch(/^\/prisbilder\/.+\.webp$/)
      expect(example.imageSource, example.id).toMatch(/^https:\/\//)
      // Bilden ska visa just saken, så ingen anteckning om att den visar något annat.
      expect(example.imageNote, example.id).toBeUndefined()
      // Exempelrundans ledtråd får inte avslöja priset.
      expect(example.exempelLedtrad ?? example.clue, example.id).not.toContain(String(example.priceSek))
    }
  })

  it('kommer i den ordning som exempel anger (1, 2, 3)', () => {
    expect(EXAMPLE_ITEMS.map((item) => item.exempel)).toEqual([1, 2, 3])
    expect(EXAMPLE_ITEMS.map((item) => item.id)).toEqual(['hemgymnastikbok-1902', 'piggelin-1972', 'game-boy-1990'])
  })
})

describe('frågor och ledtrådar', () => {
  const HIDDEN = ['flygbiljett-amsterdam-1925', 'vigselplats-katrinetorp-2026']

  // Antalet frågor räknas inte, så att testerna inte behöver ändras varje gång en fråga godkänns på /granska.
  it('har frågor med unika id, och alla har en hel fråga, en ledtråd och rätt format', () => {
    expect(ALL_PRICE_ITEMS.length).toBeGreaterThan(0)
    expect(new Set(ALL_PRICE_ITEMS.map((item) => item.id)).size).toBe(ALL_PRICE_ITEMS.length)
    for (const item of ALL_PRICE_ITEMS) {
      expect(item.id, item.id).toMatch(/^[a-z0-9-]+$/)
      for (const text of [item.emoji, item.name, item.clue, item.fact]) expect(text.trim(), item.id).not.toBe('')
      // Frågan som den visas (fraga, eller byggd av namn och år när fraga saknas, se questionText).
      expect(questionText(item), item.id).toMatch(/\?$/)
      expect(Number.isInteger(item.year), item.id).toBe(true)
      expect(item.priceSek, item.id).toBeGreaterThan(0)
      expect(item.source, item.id).toMatch(/^https?:\/\//)
    }
  })

  it('har årtalet i frågan, utom de som frågar efter priset i dag', () => {
    for (const item of ALL_PRICE_ITEMS) {
      const question = questionText(item)
      expect(question.includes(String(item.year)) || question.endsWith(' i dag?'), item.id).toBe(true)
      // Inget annat årtal än prisåret.
      const years = (question.match(/(1[5-9]\d\d|20\d\d)/g) ?? []).filter((year) => year !== String(item.year))
      expect(years, item.id).toEqual([])
    }
  })

  it('har inga tankstreck och inga länkar i frågor och ledtrådar', () => {
    for (const item of ALL_PRICE_ITEMS) {
      for (const text of [item.fraga ?? '', item.clue]) {
        expect(text, item.id).not.toMatch(/[–—]| - /)
        expect(text, item.id).not.toMatch(/https?:\/\//)
      }
    }
  })

  it('har inga tankstreck som paus i faktatexterna (intervall som juni–augusti är okej)', () => {
    for (const item of ALL_PRICE_ITEMS) {
      expect(item.fact, item.id).not.toMatch(/ [–—] |—| - /)
    }
  })

  it('frågar efter auktionspris med "för på auktion" för alla som såldes', () => {
    const sold = ALL_PRICE_ITEMS.filter((item) => item.fraga?.startsWith('Vad såldes'))
    expect(sold.length).toBeGreaterThan(0)
    for (const item of sold) {
      expect(item.fraga, item.id).toMatch(/ för på (auktion|välgörenhetsauktion) \d{4}\?$/)
      expect(item.fraga, item.id).toContain(` ${item.year}?`)
    }
    expect(findPriceItem('legomodell-turning-torso-2012')?.fraga).toMatch(/ för på välgörenhetsauktion 2012\?$/)
    expect(findPriceItem('indiana-jones-hatt')?.fraga).toBe(
      'Vad såldes Indiana Jones hatt från filmen De fördömdas tempel för på auktion 2024?',
    )
  })

  it('formulerar hyresfrågan om Katrineholm som en fråga om månadshyran', () => {
    expect(findPriceItem('lagenhet-katrineholm-1954')?.fraga).toBe(
      'Vad var månadshyran för en lägenhet med eget badrum i Katrineholm 1954?',
    )
  })

  it('döljer två frågor i spelet utan att ta bort dem', () => {
    expect(ALL_PRICE_ITEMS.filter((item) => item.dold).map((item) => item.id).sort()).toEqual(HIDDEN)
    expect(PRICE_ITEMS).toHaveLength(ALL_PRICE_ITEMS.length - HIDDEN.length)
    for (const id of HIDDEN) {
      expect(PRICE_ITEMS.some((item) => item.id === id)).toBe(false)
      expect(findPriceItem(id)).toBeDefined()
    }
    // Slumpen väljer aldrig en dold fråga, hur många omgångar man än spelar.
    let used: string[] = []
    for (let i = 0; i < 400; i++) {
      const pick = priceRules.pickItem!(used)
      expect(HIDDEN).not.toContain(pick.itemId)
      used = pick.usedItemIds
    }
  })

  it('har exempelfrågorna bland de synliga, men slumpar aldrig fram dem i spelet', () => {
    expect(GAME_ITEMS).toHaveLength(PRICE_ITEMS.length - EXAMPLE_ITEMS.length)
    let used: string[] = []
    for (const example of EXAMPLE_ITEMS) {
      expect(PRICE_ITEMS).toContain(example)
      expect(GAME_ITEMS).not.toContain(example)
    }
    // Två varv genom alla frågor, så att även omstarten av listan provas.
    for (let i = 0; i < GAME_ITEMS.length * 2; i++) {
      const pick = priceRules.pickItem!(used)
      expect(EXAMPLE_ITEMS.map((item) => item.id)).not.toContain(pick.itemId)
      used = pick.usedItemIds
    }
  })
})
