import { describe, expect, it } from 'vitest'
import { applyVerdict, exportReviews, missingFields, publishedImage, type ReviewFiles } from '@/lib/granskning'

const NOW = new Date('2026-10-27T12:00:00Z')

function question(id: string) {
  return { id, emoji: '🍕', name: 'En pizza', year: 2010, clue: 'Ledtråd', priceSek: 100, fact: 'Fakta.', source: 'https://example.com' }
}

function files(): ReviewFiles<ReturnType<typeof question> & { image?: string }> {
  return { items: [question('a'), question('b')], inbox: [question('ny')], reviews: {} }
}

describe('applyVerdict', () => {
  it('flyttar en godkänd inkorgsfråga till slutet av prisdata', () => {
    const next = applyVerdict(files(), 'ny', 'inkorg', 'godkand', '', NOW)
    expect(next.items.map((i) => i.id)).toEqual(['a', 'b', 'ny'])
    expect(next.inbox).toEqual([])
    expect(next.reviews.ny.verdict).toBe('godkand')
  })

  it('ger inkorgsbilden sin publicerade sökväg när frågan godkänns', () => {
    const before = { ...files(), inbox: [{ ...question('ny'), image: '/prisbilder-inkorg/ny.webp' }] }
    const next = applyVerdict(before, 'ny', 'inkorg', 'godkand', '', NOW)
    expect(next.items.at(-1)?.image).toBe('/prisbilder/ny.webp')
  })

  it('sparar bara omdömet när en fråga i spelet godkänns', () => {
    const before = files()
    const next = applyVerdict(before, 'a', 'prisdata', 'godkand', ' Bra ', NOW)
    expect(next.items).toBe(before.items)
    expect(next.inbox).toBe(before.inbox)
    expect(next.reviews.a).toEqual({ verdict: 'godkand', comment: 'Bra', reviewedAt: NOW.toISOString() })
  })

  it('tar bort en fråga ur filen där den ligger', () => {
    expect(applyVerdict(files(), 'ny', 'inkorg', 'ta-bort', '', NOW).inbox).toEqual([])
    expect(applyVerdict(files(), 'a', 'prisdata', 'ta-bort', '', NOW).items.map((i) => i.id)).toEqual(['b'])
  })

  it('ändrar inga frågor för Behöver fixas', () => {
    const before = files()
    const next = applyVerdict(before, 'ny', 'inkorg', 'fixa', 'Fel år', NOW)
    expect(next.items).toBe(before.items)
    expect(next.inbox).toBe(before.inbox)
    expect(next.reviews.ny.comment).toBe('Fel år')
  })

  it('godkänner inte en inkorgsfråga med ett id som redan finns', () => {
    const before = { ...files(), inbox: [question('a')] }
    expect(() => applyVerdict(before, 'a', 'inkorg', 'godkand', '', NOW)).toThrow('finns redan')
  })

  it('godkänner inte en inkorgsfråga som saknar fält', () => {
    const before = { ...files(), inbox: [{ ...question('ny'), priceSek: '100' as unknown as number }] }
    expect(() => applyVerdict(before, 'ny', 'inkorg', 'godkand', '', NOW)).toThrow('priceSek')
  })

  it('säger till om frågan inte finns', () => {
    expect(() => applyVerdict(files(), 'ny', 'prisdata', 'fixa', '', NOW)).toThrow('Hittar ingen fråga')
  })
})

describe('publishedImage', () => {
  it('flyttar bara inkorgsbilder', () => {
    expect(publishedImage('/prisbilder-inkorg/a.webp')).toBe('/prisbilder/a.webp')
    expect(publishedImage('/prisbilder/a.webp')).toBe('/prisbilder/a.webp')
  })
})

describe('missingFields', () => {
  it('hittar saknade och tomma fält', () => {
    expect(missingFields(question('a'))).toEqual([])
    expect(missingFields({ ...question('a'), fact: '', year: undefined })).toEqual(['year', 'fact'])
  })
})

describe('exportReviews', () => {
  it('ger en rad per granskad fråga', () => {
    const reviews = {
      a: { verdict: 'godkand' as const, comment: '', reviewedAt: '' },
      b: { verdict: 'fixa' as const, comment: 'Fel år', reviewedAt: '' },
    }
    expect(exportReviews(reviews)).toBe('a: Godkänd\nb: Behöver fixas – Fel år')
  })
})
