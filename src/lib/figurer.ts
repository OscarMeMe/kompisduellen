// Blobbarna: spelarfigurer som ritas i kod, i lager. Kroppen med sina prylar och minen är olika lager, så att alla
// figurer kan använda samma miner och en kropp senare kan bli en PNG-bild utan att något annat ändras.
//
// Värdet som sparas och skickas som avatar är en vanlig emoji som ingen annan figur använder. Då ser en flik med en
// äldre version av sajten en emoji, och findBlob gör om den till blobben i den nya koden.

import type { ImposterTable } from '@/lib/imposterjakten'

export const MOODS = ['vantar', 'misstankt', 'anklagad', 'traffad', 'vann', 'utrostad', 'sur'] as const
export type Mood = (typeof MOODS)[number]

export const MOOD_NAMES: Record<Mood, string> = {
  vantar: 'Väntar',
  misstankt: 'Misstänksam',
  anklagad: 'Anklagad',
  traffad: 'Träffad',
  vann: 'Vann',
  utrostad: 'Utröstad',
  sur: 'Sur',
}

// Hur figuren rör sig med varje min. Bara med motion-safe:, så att den står still med "minska rörelse".
export const MOOD_MOTION: Record<Mood, string> = {
  vantar: 'motion-safe:animate-blob-idle',
  misstankt: 'motion-safe:animate-blob-lean',
  anklagad: 'motion-safe:animate-blob-shake',
  traffad: 'motion-safe:animate-blob-squash',
  vann: 'motion-safe:animate-blob-cheer',
  utrostad: 'motion-safe:animate-blob-melt',
  sur: 'motion-safe:animate-blob-sulk',
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
  // haughty = dömande blick när figuren väntar i väntrummet (Kungen).
  traits?: { crossEyed?: boolean; sleepy?: boolean; cyclops?: boolean; haughty?: boolean }
  // Repliken när man väljer figuren, och figurens egen rörelse i väntrummet (tom = står still). Rörelserna ligger i
  // index.css och använder bara transform och opacity, så att tio figurer inte blir tunga på en mobil.
  line: string
  idle: string
  frontTilt?: Partial<Record<Mood, FrontTilt>>
}

// Färgerna för en figur: --figur-X-ljus, --figur-X och --figur-X-mork i index.css.
function colors(name: string): BlobFigure['palette'] {
  return { light: `var(--figur-${name}-ljus)`, base: `var(--figur-${name})`, dark: `var(--figur-${name}-mork)` }
}

const SVG: BlobBody = { kind: 'svg' }

export const BLOBS: readonly BlobFigure[] = [
  {
    id: 'klumpen',
    emoji: '🤪',
    name: 'Klumpen',
    palette: colors('klump'),
    body: SVG,
    traits: { crossEyed: true },
    line: 'Jag fattar inte reglerna, men jag är taggad.',
    idle: 'motion-safe:animate-blob-bounce',
  },
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
    line: 'Du såg mig inte.',
    idle: 'motion-safe:animate-blob-glance',
  },
  {
    id: 'sjusovaren',
    emoji: '😴',
    name: 'Sjusovaren',
    palette: colors('sova'),
    body: SVG,
    traits: { sleepy: true },
    line: 'Väck mig när det är min tur.',
    idle: 'motion-safe:animate-blob-idle',
  },
  {
    id: 'droppan',
    emoji: '💧',
    name: 'Droppan',
    palette: colors('droppe'),
    shape: 'droppe',
    body: SVG,
    line: 'Det här slutar med tårar.',
    idle: 'motion-safe:animate-blob-tremble',
  },
  { id: 'festis', emoji: '🥳', name: 'Festis', palette: colors('fest'), body: SVG, line: 'Är det här förfesten?', idle: 'motion-safe:animate-blob-dance' },
  // Kungen står still och dömer: ingen rörelse, bara blicken.
  { id: 'kungen', emoji: '🤴', name: 'Kungen', palette: colors('kung'), body: SVG, traits: { haughty: true }, line: 'Ni får gärna buga.', idle: '' },
  {
    id: 'ogat',
    emoji: '🧿',
    name: 'Ögat',
    palette: colors('oga'),
    body: SVG,
    traits: { cyclops: true },
    line: 'Jag såg det där.',
    idle: 'motion-safe:animate-blob-idle',
  },
  { id: 'burret', emoji: '🦔', name: 'Burret', palette: colors('burr'), body: SVG, line: 'Jag har inte sovit på tre dagar.', idle: 'motion-safe:animate-blob-idle' },
  { id: 'brakis', emoji: '😈', name: 'Bråkis', palette: colors('brak'), body: SVG, line: 'Vem kastade den där?', idle: 'motion-safe:animate-blob-stomp' },
  { id: 'blygis', emoji: '😳', name: 'Blygis', palette: colors('blyg'), outline: true, body: SVG, line: 'Titta inte på mig.', idle: 'motion-safe:animate-blob-peek' },
  {
    id: 'smaltis',
    emoji: '🧊',
    name: 'Smältis',
    palette: colors('smalt'),
    shape: 'smalt',
    body: SVG,
    line: 'Ingen stress, jag rinner.',
    idle: 'motion-safe:animate-blob-idle',
  },
  {
    id: 'plugghasten',
    emoji: '🤓',
    name: 'Plugghästen',
    palette: colors('plugg'),
    body: SVG,
    // De stora glasögonen åker snett när den träffas.
    frontTilt: { traffad: { rotate: -14, x: -6, y: 10 } },
    line: 'Rent statistiskt är det du.',
    idle: 'motion-safe:animate-blob-idle',
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

// Sjusovaren somnar när inget har hänt i väntrummet på så här länge (ms): ingen har gått med, lämnat, reagerat eller kastat.
export const SLEEP_AFTER_MS = 45_000

// Minen vid Imposterjaktens bord. Alla är misstänksamma under diskussionen, så minen avslöjar inget. Den anklagade
// svettas medan de andra röstar. Den som röstades eller anklagades ut smälter först när det redan är offentligt: vid
// sista gissningen (då står det att just den gissar ordet) och i facit (som visar impostern).
export function seatMood(table: Pick<ImposterTable, 'step' | 'accusation' | 'caught' | 'votes' | 'outcome' | 'order'>, playerId: string): Mood {
  if (table.accusation?.accused === playerId) return 'anklagad'
  if (table.step === 'gissning' || table.step === 'facit') return votedOut(table) === playerId ? 'utrostad' : 'vantar'
  if (table.step === 'diskussion' && table.order.includes(playerId)) return 'misstankt'
  return 'vantar'
}

// Den som röstades eller anklagades ut i omgången: impostern som fångades, eller en oskyldig som ensam fick flest röster.
// null om ingen åkte ut (lika röster två gånger, eller en avbruten omgång).
export function votedOut(table: Pick<ImposterTable, 'step' | 'caught' | 'votes' | 'outcome'>): string | null {
  if (table.caught) return table.caught
  if (table.step !== 'facit' || table.outcome?.kind !== 'undan' || !table.votes) return null
  const counts: Record<string, number> = {}
  for (const target of Object.values(table.votes)) counts[target] = (counts[target] ?? 0) + 1
  const most = Math.max(0, ...Object.values(counts))
  const top = Object.keys(counts).filter((id) => counts[id] === most)
  return most > 0 && top.length === 1 ? top[0] : null
}

// Minen på prispallen: alla på förstaplatsen har vunnit, de andra är sura.
export function podiumMood(place: number): Mood {
  return place === 1 ? 'vann' : 'sur'
}

// Åt vilket håll Ögat tittar: mot spelaren som nyss gjorde något, räknat efter platsen i listan. 0 = rakt fram.
export function lookDirection(myIndex: number, otherIndex: number): -1 | 0 | 1 {
  if (otherIndex < 0 || otherIndex === myIndex) return 0
  return otherIndex < myIndex ? -1 : 1
}

// Blobben för ett avatarvärde, eller undefined för alla andra figurer. Variantväljaren (U+FE0F) räknas inte.
export function findBlob(avatar: string): BlobFigure | undefined {
  const clean = avatar.replace(/️/g, '')
  return BLOBS.find((blob) => blob.emoji === clean)
}
