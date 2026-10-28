import { describe, expect, it } from 'vitest'
import { findExampleItem, PRICE_ITEMS } from '@/lib/prisdata'

// Filerna i public/prisbilder, t.ex. '/public/prisbilder/game-boy-1990.webp'.
const files = Object.keys(import.meta.glob('/public/prisbilder/*'))

describe('bilderna i Gissa priset', () => {
  const withImage = PRICE_ITEMS.filter((item) => item.image)

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

describe('exempelfrågan på startsidan', () => {
  it('är exakt en fråga och har en bild med fotograf när licensen kräver det', () => {
    expect(PRICE_ITEMS.filter((item) => item.exempel)).toHaveLength(1)
    const example = findExampleItem()
    expect(example?.image).toMatch(/^\/prisbilder\/.+\.webp$/)
    expect(example?.imageSource).toMatch(/^https:\/\//)
    // Bilden ska visa just saken, så ingen anteckning om att den visar något annat.
    expect(example?.imageNote).toBeUndefined()
    // Exempelrundans ledtråd får inte avslöja priset.
    expect(example?.exempelLedtrad ?? '').not.toContain(String(example?.priceSek))
  })
})
