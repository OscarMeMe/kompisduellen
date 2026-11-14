import { describe, expect, it } from 'vitest'
import { DENT_DEPTH, DENT_FLOOR, dentedEdge, SQUISH_EXTRA, SQUISH_HEIGHT, SQUISH_PATH, WAVE_PATH, waveEdgeAt } from '@/lib/vag'

const xs = Array.from({ length: 1441 }, (_, x) => x)

describe('vågen på startsidan', () => {
  it('kanten börjar och slutar som vågens form, och spegelvänds med flip', () => {
    expect(waveEdgeAt(0, false)).toBeCloseTo(54, 1)
    expect(waveEdgeAt(1440, false)).toBeCloseTo(28, 1)
    expect(waveEdgeAt(0, true)).toBeCloseTo(28, 1)
    for (const x of [0, 200, 720, 1100, 1440]) expect(waveEdgeAt(x, true)).toBeCloseTo(waveEdgeAt(1440 - x, false), 5)
  })

  it('kanten är mjuk: inga hopp mellan punkter intill varandra', () => {
    for (const flip of [false, true]) {
      for (const x of xs.slice(1)) expect(Math.abs(waveEdgeAt(x, flip) - waveEdgeAt(x - 1, flip))).toBeLessThan(0.5)
    }
  })

  it('vågen som går att slå på har samma kant, men går en fjärdedel längre ned', () => {
    expect(SQUISH_EXTRA).toBe(0.25)
    expect(SQUISH_HEIGHT).toBe(112.5)
    expect(SQUISH_PATH).toContain(WAVE_PATH.slice(WAVE_PATH.indexOf('V54'), WAVE_PATH.lastIndexOf('V')))
  })
})

describe('gropen i vågen', () => {
  const sigma = 180

  it('utan djup är kanten orörd', () => {
    for (const x of [0, 300, 720, 1440]) expect(dentedEdge(x, false, 0, 720, sigma)).toBe(waveEdgeAt(x, false))
  })

  it('går djupare än förut överallt, och aldrig nedanför remsan i sektionen', () => {
    // Förut: 40 djup, med vågens nederkant (88 av 90) som mjukt tak.
    const before = (x: number, center: number) => {
      const edge = waveEdgeAt(x, false)
      const room = 88 - edge
      return edge + room * (1 - Math.exp(-(40 * Math.exp(-((x - center) ** 2) / (2 * sigma ** 2))) / room))
    }
    for (const center of [100, 400, 720, 1000, 1300]) {
      const now = dentedEdge(center, false, DENT_DEPTH, center, sigma)
      expect(now - waveEdgeAt(center, false), `mitt ${center}`).toBeGreaterThan((before(center, center) - waveEdgeAt(center, false)) * 1.25)
      const deepest = Math.max(...xs.map((x) => dentedEdge(x, false, DENT_DEPTH, center, sigma)))
      expect(deepest, `mitt ${center}`).toBeLessThanOrEqual(DENT_FLOOR)
    }
    expect(DENT_FLOOR).toBeLessThan(SQUISH_HEIGHT)
  })

  it('går nedanför vågens egen nederkant där vågen är låg', () => {
    // Förut fanns nästan ingen plats för en grop i vågens dalar. Nu går den ned i remsan i sektionen (y över 90).
    for (const flip of [false, true]) {
      const lowest = xs.reduce((best, x) => (waveEdgeAt(x, flip) > waveEdgeAt(best, flip) ? x : best), 0)
      expect(dentedEdge(lowest, flip, DENT_DEPTH, lowest, sigma)).toBeGreaterThan(90)
    }
  })

  it('är djupast i mitten och trycker aldrig kanten uppåt', () => {
    for (const center of [300, 720, 1200]) {
      const down = (x: number) => dentedEdge(x, false, DENT_DEPTH, center, sigma) - waveEdgeAt(x, false)
      for (const x of xs) expect(down(x)).toBeGreaterThanOrEqual(0)
      expect(down(center)).toBeGreaterThan(down(center - 150))
      expect(down(center)).toBeGreaterThan(down(center + 150))
      // Långt från gropen är kanten nästan orörd.
      expect(down(center > 720 ? 0 : 1440)).toBeLessThan(0.5)
    }
  })

  it('är rund och mjuk: lutningen ändras lite i taget, utan hörn', () => {
    for (const flip of [false, true]) {
      for (const center of [200, 720, 1250]) {
        const y = (x: number) => dentedEdge(x, flip, DENT_DEPTH, center, sigma)
        for (const x of xs.slice(1, -1)) {
          // Andra skillnaden (hur mycket lutningen ändras mellan två punkter intill varandra) är liten överallt.
          expect(Math.abs(y(x + 1) - 2 * y(x) + y(x - 1)), `x ${x}`).toBeLessThan(0.05)
        }
      }
    }
  })
})
