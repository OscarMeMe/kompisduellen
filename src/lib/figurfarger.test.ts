import { describe, expect, it } from 'vitest'
import { BLOBS } from '@/lib/figurer'

// Vitest gör om CSS-filer vid import, så filen läses som text med Nodes inbyggda fs (testerna körs i Node).
const node = globalThis as unknown as {
  process: { getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, encoding: 'utf8'): string } }
}
const css = node.process.getBuiltinModule('node:fs').readFileSync('src/index.css', 'utf8')

// Alla --figur-X: oklch(L C H) i index.css, omräknade till OKLab, där avståndet ungefär motsvarar hur olika färgerna ser ut.
const colors = new Map<string, [number, number, number]>()
for (const [, name, l, c, h] of css.matchAll(/--figur-([a-z-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g)) {
  const hue = (Number(h) * Math.PI) / 180
  colors.set(name, [Number(l), Number(c) * Math.cos(hue), Number(c) * Math.sin(hue)])
}
const variable = (value: string) => value.match(/^var\(--figur-([a-z-]+)\)$/)?.[1] ?? value

describe('blobbarnas färger', () => {
  it('har en egen ljus, bas och mörk variabel i index.css för varje figur', () => {
    for (const blob of BLOBS) {
      const name = variable(blob.palette.base)
      expect(colors.has(name), `--figur-${name}`).toBe(true)
      expect(colors.has(variable(blob.palette.light)), blob.palette.light).toBe(true)
      expect(colors.has(variable(blob.palette.dark)), blob.palette.dark).toBe(true)
      expect(blob.palette.light).toBe(`var(--figur-${name}-ljus)`)
      expect(blob.palette.dark).toBe(`var(--figur-${name}-mork)`)
    }
    expect(new Set(BLOBS.map((blob) => blob.palette.base)).size).toBe(BLOBS.length)
  })

  it('skiljer sig så mycket att inga två går att blanda ihop i emoji-storlek', () => {
    const bases = BLOBS.map((blob) => ({ id: blob.id, lab: colors.get(variable(blob.palette.base))! }))
    for (const [i, a] of bases.entries()) {
      for (const b of bases.slice(i + 1)) {
        const distance = Math.hypot(a.lab[0] - b.lab[0], a.lab[1] - b.lab[1], a.lab[2] - b.lab[2])
        expect(distance, `${a.id} och ${b.id}`).toBeGreaterThanOrEqual(0.12)
      }
    }
  })
})
