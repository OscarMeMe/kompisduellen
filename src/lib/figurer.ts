// Blobbarna: spelarfigurer som ritas i kod, i lager. Kroppen med sina prylar och minen är olika lager, så att alla
// figurer kan använda samma miner och en kropp senare kan bli en PNG-bild utan att något annat ändras.
//
// Värdet som sparas och skickas som avatar är en vanlig emoji som ingen annan figur använder. Då ser en flik med en
// äldre version av sajten en emoji, och findBlob gör om den till blobben i den nya koden.

export const MOODS = ['vantar', 'misstankt', 'anklagad', 'traffad', 'vann', 'utrostad'] as const
export type Mood = (typeof MOODS)[number]

export const MOOD_NAMES: Record<Mood, string> = {
  vantar: 'Väntar',
  misstankt: 'Misstänksam',
  anklagad: 'Anklagad',
  traffad: 'Träffad',
  vann: 'Vann',
  utrostad: 'Utröstad',
}

// Hur figuren rör sig med varje min. Bara med motion-safe:, så att den står still med "minska rörelse".
export const MOOD_MOTION: Record<Mood, string> = {
  vantar: 'motion-safe:animate-blob-idle',
  misstankt: 'motion-safe:animate-blob-lean',
  anklagad: 'motion-safe:animate-blob-shake',
  traffad: 'motion-safe:animate-blob-squash',
  vann: 'motion-safe:animate-blob-cheer',
  utrostad: 'motion-safe:animate-blob-sink',
}

// Hur frontlagret (t.ex. glasögon) hamnar snett med en viss min, i figurens koordinater (200 × 200).
export type FrontTilt = { rotate: number; x: number; y: number }

// Kroppen är antingen ritad i kod (Kroppar.tsx) eller en bild på 200 × 200 punkter i samma koordinater. frontSrc är
// det som ligger över minen, som glasögonen.
export type BlobBody = { kind: 'svg' } | { kind: 'png'; src: string; frontSrc?: string }

// Kroppens form. Ansiktet sitter på samma ställe i alla, så att minerna passar.
export type BlobShape = 'blob' | 'droppe' | 'smalt'

export type BlobId =
  | 'klumpen'
  | 'spionen'
  | 'sjusovaren'
  | 'droppan'
  | 'festis'
  | 'kungen'
  | 'ogat'
  | 'burret'
  | 'brakis'
  | 'blygis'
  | 'smaltis'
  | 'plugghasten'

export type BlobFigure = {
  id: BlobId
  // Värdet som sparas och skickas som avatar.
  emoji: string
  name: string
  // Färgerna från index.css: ljus (högdager), bas och mörk (skugga). Basen skiljer sig tydligt från alla andras
  // (testet i figurer.test.ts mäter det), så att figurerna går att skilja åt även i emoji-storlek.
  palette: { light: string; base: string; dark: string }
  shape?: BlobShape
  // En tunn kant i figurens mörka färg, för en ljus figur som annars försvinner mot den ljusa bakgrunden.
  outline?: boolean
  body: BlobBody
  // Små drag i minen. crossEyed och sleepy gäller bara öppna ögon. cyclops = ett enda stort öga i alla miner.
  traits?: { crossEyed?: boolean; sleepy?: boolean; cyclops?: boolean }
  frontTilt?: Partial<Record<Mood, FrontTilt>>
}

// Färgerna för en figur: --figur-X-ljus, --figur-X och --figur-X-mork i index.css.
function colors(name: string): BlobFigure['palette'] {
  return { light: `var(--figur-${name}-ljus)`, base: `var(--figur-${name})`, dark: `var(--figur-${name}-mork)` }
}

const SVG: BlobBody = { kind: 'svg' }

export const BLOBS: readonly BlobFigure[] = [
  { id: 'klumpen', emoji: '🤪', name: 'Klumpen', palette: colors('klump'), body: SVG, traits: { crossEyed: true } },
  {
    id: 'spionen',
    emoji: '🎩',
    name: 'Spionen',
    palette: colors('spion'),
    body: SVG,
    // Glasögonen döljer ögonen. När något händer hamnar de snett, så att reaktionen syns.
    frontTilt: {
      anklagad: { rotate: 14, x: 14, y: 8 },
      traffad: { rotate: -30, x: -24, y: 6 },
    },
  },
  { id: 'sjusovaren', emoji: '😴', name: 'Sjusovaren', palette: colors('sova'), body: SVG, traits: { sleepy: true } },
  { id: 'droppan', emoji: '💧', name: 'Droppan', palette: colors('droppe'), shape: 'droppe', body: SVG },
  { id: 'festis', emoji: '🥳', name: 'Festis', palette: colors('fest'), body: SVG },
  { id: 'kungen', emoji: '🤴', name: 'Kungen', palette: colors('kung'), body: SVG },
  { id: 'ogat', emoji: '🧿', name: 'Ögat', palette: colors('oga'), body: SVG, traits: { cyclops: true } },
  { id: 'burret', emoji: '🦔', name: 'Burret', palette: colors('burr'), body: SVG },
  { id: 'brakis', emoji: '😈', name: 'Bråkis', palette: colors('brak'), body: SVG },
  { id: 'blygis', emoji: '😳', name: 'Blygis', palette: colors('blyg'), outline: true, body: SVG },
  { id: 'smaltis', emoji: '🧊', name: 'Smältis', palette: colors('smalt'), shape: 'smalt', body: SVG },
  {
    id: 'plugghasten',
    emoji: '🤓',
    name: 'Plugghästen',
    palette: colors('plugg'),
    body: SVG,
    // De stora glasögonen åker snett när den träffas.
    frontTilt: { traffad: { rotate: -14, x: -6, y: 10 } },
  },
]

export const BLOB_AVATARS: readonly string[] = BLOBS.map((blob) => blob.emoji)

// De gamla emoji-figurerna och blobben var och en blir. Sparade profiler och spelare från flikar med en äldre version
// av sajten görs om med upgradeAvatar, så att alla syns som blobbar.
export const LEGACY_AVATARS: Readonly<Record<string, BlobId>> = {
  '👻': 'blygis',
  '👽': 'ogat',
  '🤖': 'plugghasten',
  '👾': 'sjusovaren',
  '🧙': 'droppan',
  '🧛': 'klumpen',
  '🧜': 'smaltis',
  '🦸': 'kungen',
  '🥷': 'spionen',
  '🤡': 'festis',
  '💀': 'brakis',
  '🎃': 'burret',
}

// En gammal figur blir sin blobb. Allt annat (blobbar och okända värden) lämnas som det är.
export function upgradeAvatar(avatar: string): string {
  const id = LEGACY_AVATARS[avatar.replace(/\uFE0F/g, '')]
  return id ? BLOBS.find((blob) => blob.id === id)!.emoji : avatar
}

// Blobben för ett avatarvärde, eller undefined för alla andra figurer. Variantväljaren (U+FE0F) räknas inte.
export function findBlob(avatar: string): BlobFigure | undefined {
  const clean = avatar.replace(/️/g, '')
  return BLOBS.find((blob) => blob.emoji === clean)
}
