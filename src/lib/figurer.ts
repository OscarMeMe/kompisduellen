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

// Hur frontlagret (t.ex. solglasögonen) hamnar snett med en viss min, i figurens koordinater (200 × 200).
export type FrontTilt = { rotate: number; x: number; y: number }

// Kroppen är antingen ritad i kod (Kroppar.tsx) eller en bild på 200 × 200 punkter i samma koordinater. frontSrc är
// det som ligger över minen, som glasögonen.
export type BlobBody = { kind: 'svg' } | { kind: 'png'; src: string; frontSrc?: string }

export type BlobId = 'klumpen' | 'spionen' | 'sjusovaren'

export type BlobFigure = {
  id: BlobId
  // Värdet som sparas och skickas som avatar.
  emoji: string
  name: string
  // Färgerna från index.css: ljus (högdager), bas och mörk (skugga).
  palette: { light: string; base: string; dark: string }
  body: BlobBody
  // Små drag som bara gäller öppna ögon. Minerna är annars samma för alla.
  traits?: { crossEyed?: boolean; sleepy?: boolean }
  frontTilt?: Partial<Record<Mood, FrontTilt>>
}

export const BLOBS: readonly BlobFigure[] = [
  {
    id: 'klumpen',
    emoji: '🤪',
    name: 'Klumpen',
    palette: { light: 'var(--figur-klump-ljus)', base: 'var(--figur-klump)', dark: 'var(--figur-klump-mork)' },
    body: { kind: 'svg' },
    traits: { crossEyed: true },
  },
  {
    id: 'spionen',
    emoji: '🎩',
    name: 'Spionen',
    palette: { light: 'var(--figur-spion-ljus)', base: 'var(--figur-spion)', dark: 'var(--figur-spion-mork)' },
    body: { kind: 'svg' },
    // Glasögonen döljer ögonen. När något händer hamnar de snett, så att reaktionen syns.
    frontTilt: {
      anklagad: { rotate: 14, x: 14, y: 8 },
      traffad: { rotate: -30, x: -24, y: 6 },
    },
  },
  {
    id: 'sjusovaren',
    emoji: '😴',
    name: 'Sjusovaren',
    palette: { light: 'var(--figur-sova-ljus)', base: 'var(--figur-sova)', dark: 'var(--figur-sova-mork)' },
    body: { kind: 'svg' },
    traits: { sleepy: true },
  },
]

export const BLOB_AVATARS: readonly string[] = BLOBS.map((blob) => blob.emoji)

// Blobben för ett avatarvärde, eller undefined för alla andra figurer. Variantväljaren (U+FE0F) räknas inte.
export function findBlob(avatar: string): BlobFigure | undefined {
  const clean = avatar.replace(/️/g, '')
  return BLOBS.find((blob) => blob.emoji === clean)
}
