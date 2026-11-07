import { describe, expect, it } from 'vitest'

// Kontrasten på startsidans färgade spelkort (SpelKort), mätt enligt WCAG 2 med färgerna i index.css. Normal text
// behöver minst 4,5:1 (AA), stor eller fet text minst 3:1. Text med opacitet blandas med kortets färg först, som i
// webbläsaren.

// Vitest gör om CSS-filer vid import, så filen läses som text med Nodes inbyggda fs (testerna körs i Node).
const node = globalThis as unknown as {
  process: { getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, encoding: 'utf8'): string } }
}
const css = node.process.getBuiltinModule('node:fs').readFileSync('src/index.css', 'utf8')

type Rgb = [number, number, number]

// Det ljusa temat: första förekomsten av varje variabel (det mörka ligger senare i filen).
function oklchVar(name: string): Rgb {
  const hex = css.match(new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i'))
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255) as Rgb
  const match = css.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`))
  if (!match) throw new Error(`--${name} saknas`)
  return oklchToSrgb(Number(match[1]), Number(match[2]), Number(match[3]))
}

// OKLCH till sRGB (0–1, med gamma), via OKLab.
function oklchToSrgb(l: number, c: number, h: number): Rgb {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear: Rgb = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ]
  return linear.map((v) => {
    const x = Math.min(1, Math.max(0, v))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }) as Rgb
}

// Text med opacitet ovanpå en bakgrund.
const mix = (fg: Rgb, bg: Rgb, alpha: number): Rgb => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as Rgb

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Kortens färger (data-spel i index.css).
const CARDS: Record<string, string> = {
  'gissa-priset': 'sun',
  narmast: 'peach',
  kortkaos: 'lilac',
  // Exploderande Tanters spelkort har egen stil (data-spelkort): krämvitt.
  tantpanik: 'tant-kram-2',
  imposterjakten: 'mint',
}

describe('spelkortens kontrast (WCAG AA)', () => {
  const foreground = oklchVar('foreground')
  const card = oklchVar('card')

  for (const [game, color] of Object.entries(CARDS)) {
    it(game, () => {
      const surface = oklchVar(color)
      // Rubriken och spelets namn (stor, fet text, men vi kräver ändå 4,5).
      expect(contrast(foreground, surface)).toBeGreaterThanOrEqual(4.5)
      // Raden med antal spelare och tid (liten text med 80 % opacitet).
      expect(contrast(mix(foreground, surface, 0.8), surface)).toBeGreaterThanOrEqual(4.5)
      // Beskrivningen (90 % opacitet).
      expect(contrast(mix(foreground, surface, 0.9), surface)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('knappen Skapa lobby och etiketten som ligger på alla kort', () => {
    // Knappen: krämvit text på mörk knapp, och vit text på den mörka korallen vid hover.
    expect(contrast(card, foreground)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(oklchVar('primary-foreground'), oklchVar('primary-button'))).toBeGreaterThanOrEqual(4.5)
    // Etiketten (t.ex. "Bluffigt"): mörk text på krämvitt.
    expect(contrast(foreground, card)).toBeGreaterThanOrEqual(4.5)
  })

  it('Exploderande Tanters vinröda knapp och etikett', () => {
    const cream = oklchVar('tant-kram-2')
    expect(contrast(cream, oklchVar('tant-vinrod'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(cream, oklchVar('tant-vinrod-mork'))).toBeGreaterThanOrEqual(4.5)
  })
})
