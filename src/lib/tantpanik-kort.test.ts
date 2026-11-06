import { describe, expect, it } from 'vitest'
import { CARD_TYPES, CARDS, cardImage, cardSrcSet, COLLECT_TYPES } from '@/lib/tantpanik-kort'

// Alla kortbilder i public, som sökvägar på sajten (/images/tantpanik/…).
const images = Object.keys(import.meta.glob('/public/images/tantpanik/*.webp')).map((path) => path.replace('/public', ''))

describe('korten i Exploderande Tanter', () => {
  it('har namnen som står på kortbilderna', () => {
    const names = Object.fromEntries(CARD_TYPES.map((type) => [type, CARDS[type].name]))
    expect(names).toMatchObject({
      tant: 'Exploderande tant',
      fika: 'Desarmera',
      dubbelpass: 'Attack',
      dudar: 'Riktad attack',
      intemin: 'Hoppa över',
      tjuvkika: 'Se framtiden',
      mobblera: 'Ändra framtiden',
      blanda: 'Blanda',
      underifran: 'Dra underifrån',
      tjanst: 'Tjänst',
      nadu: 'Nope!',
      regnbage: 'Regnbågstanten',
      kupong: 'Kupongtanten',
      stickning: 'Sticktanten',
      stavgang: 'Stavgångstanten',
      tradgard: 'Trädgårdstanten',
      vild: 'Vild tant',
      snara: 'Tantsnara',
    })
  })

  it('har fem olika tantsorter med egna namn', () => {
    expect(COLLECT_TYPES).toHaveLength(5)
    expect(new Set(COLLECT_TYPES.map((type) => CARDS[type].name)).size).toBe(5)
  })

  it('varje kort med bild har båda storlekarna i public/images/tantpanik', () => {
    const withImage = CARD_TYPES.filter((type) => CARDS[type].image)
    expect(withImage).toHaveLength(CARD_TYPES.length)
    for (const type of withImage) {
      for (const width of [360, 960] as const) {
        expect(images).toContain(cardImage(type, width))
      }
      expect(cardSrcSet(type)).toMatch(/-360\.webp 360w, .*-960\.webp 960w$/)
    }
  })

  it('alla kort har en bild, så inga textkort finns kvar', () => {
    expect(CARD_TYPES.filter((type) => !CARDS[type].image)).toEqual([])
  })
})
