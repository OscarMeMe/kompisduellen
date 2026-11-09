// Blobbarna: spelarfigurer som ritas i kod, i lager. Kroppen med sina prylar och minen är olika lager, så att alla
// figurer kan använda samma miner och en kropp senare kan bli en PNG-bild utan att något annat ändras.
//
// Värdet som sparas och skickas som avatar är en vanlig emoji som ingen annan figur använder. Då ser en flik med en
// äldre version av sajten en emoji, och findBlob gör om den till blobben i den nya koden.

import type { HeroExpression, MouthKind } from '@/components/figurer/Miner'
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

// Kroppen är antingen ritad i kod (Kroppar.tsx) eller en bild på 200 × 200 punkter i samma koordinater (public/figurer/,
// förberedda med scripts/figurbilder.py). smallSrc är samma bild i liten storlek, för emoji-storlek. frontSrc är det som
// ligger över minen, om det är en bild.
export type BlobBody = { kind: 'svg' } | { kind: 'png'; src: string; smallSrc?: string; frontSrc?: string }

// Var ansiktet sitter på en figur som bild: ansiktets mitt (x, y) och hur stort det är (scale) i figurens koordinater.
// Bilderna är olika (Blygis har huvan runt ansiktet, Spionen kragen nedanför, Smältis sitter lägre), så varje figur har
// sin egen placering mitt i den släta ytan.
// rotate = ansiktet lutar med kroppen (grader, medurs), t.ex. hero-figuren med partyhatten.
export type FacePlacement = { x: number; y: number; scale: number; rotate?: number }

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
  // Hero-figurerna på startsidan (HERO_FIGURES) har egna id:n. De är inte spelarfigurer.
  id: BlobId | HeroId
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
  face?: FacePlacement
  // Små drag i minen. crossEyed och sleepy gäller bara öppna ögon. cyclops = ett enda stort öga i alla miner.
  // haughty = dömande blick när figuren väntar i väntrummet (Kungen). lightFace = mun och linjer i en ljus färg, så att
  // de syns på en mörk figur (Spionen, Bråkis).
  // eyeShape, mouth, brows, droopy och shy ger varje figur sitt eget ansikte när den väntar (Miner.tsx): ögonens form,
  // munnen, oroliga eller arga bryn, halvstängda ögon (droopy) och en blick som tittar ned och åt sidan (shy).
  traits?: {
    crossEyed?: boolean
    sleepy?: boolean
    cyclops?: boolean
    haughty?: boolean
    lightFace?: boolean
    eyeShape?: 'round' | 'tall' | 'wide' | 'small'
    mouth?: MouthKind
    brows?: 'worried' | 'angry'
    droopy?: boolean
    shy?: boolean
    // Hero-figurernas eget uttryck på startsidan (Miner.tsx, HeroFace).
    hero?: HeroExpression
  }
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

// Kroppen som bild, i stor och liten storlek (scripts/figurbilder.py).
const picture = (id: BlobId): BlobBody => ({ kind: 'png', src: `/figurer/${id}.webp`, smallSrc: `/figurer/${id}-liten.webp` })

export const BLOBS: readonly BlobFigure[] = [
  {
    id: 'klumpen',
    emoji: '🤪',
    name: 'Klumpen',
    palette: colors('klump'),
    body: picture('klumpen'),
    face: { x: 100, y: 134, scale: 0.8 },
    traits: { crossEyed: true, eyeShape: 'wide', mouth: 'goofy' },
    // Keps bak och fram och en tuggummibubbla som blåses upp och spricker i väntrummet.
    line: 'Lugn, jag kör på känsla.',
    idle: 'motion-safe:animate-blob-bounce',
  },
  {
    id: 'spionen',
    emoji: '🎩',
    name: 'Spionen',
    palette: colors('spion'),
    body: picture('spionen'),
    face: { x: 100, y: 96, scale: 0.72 },
    traits: { lightFace: true, mouth: 'smirk' },
    // Glasögonen döljer ögonen. När något händer hamnar de snett, så att reaktionen syns.
    frontTilt: {
      anklagad: { rotate: 14, x: 14, y: 8 },
      traffad: { rotate: -30, x: -24, y: 6 },
    },
    // Solglasögon, uppfälld rockkrage och hörsnäcka.
    line: 'Jag var aldrig här.',
    idle: 'motion-safe:animate-blob-glance',
  },
  {
    id: 'sjusovaren',
    emoji: '😴',
    name: 'Sjusovaren',
    palette: colors('sova'),
    body: picture('sjusovaren'),
    face: { x: 100, y: 125, scale: 0.85 },
    traits: { sleepy: true, mouth: 'flat' },
    // Sovmask i pannan (över ögonen när den sover) och kudd-märke på kinden. Nickar till och rycker upp sig.
    line: 'Väck mig när det är min tur.',
    idle: 'motion-safe:animate-blob-nod',
  },
  {
    id: 'droppan',
    emoji: '💧',
    name: 'Droppan',
    palette: colors('droppe'),
    shape: 'droppe',
    body: picture('droppan'),
    face: { x: 100, y: 130, scale: 0.82 },
    traits: { eyeShape: 'tall', brows: 'worried', mouth: 'wobbly' },
    // Badmössa och simglasögon. Fryser och darrar.
    line: 'Vattnet var iskallt, men jag kör ändå.',
    idle: 'motion-safe:animate-blob-tremble',
  },
  // Solglasögon på huvudet, blomsterkrans och en drink med paraply. Dansar.
  {
    id: 'festis',
    emoji: '🥳',
    name: 'Festis',
    palette: colors('fest'),
    body: picture('festis'),
    face: { x: 100, y: 110, scale: 0.75 },
    traits: { mouth: 'grin' },
    line: 'Vem har lagt på den här låten? Snyggt.',
    idle: 'motion-safe:animate-blob-dance',
  },
  // Sned krona, guldkedja och vinpokal. Står still och dömer: ingen rörelse, bara blicken.
  {
    id: 'kungen',
    emoji: '🤴',
    name: 'Kungen',
    palette: colors('kung'),
    body: picture('kungen'),
    face: { x: 100, y: 105, scale: 0.75 },
    traits: { haughty: true },
    line: 'Jag har sett bättre gissningar.',
    idle: '',
  },
  {
    id: 'ogat',
    emoji: '🧿',
    name: 'Ögat',
    palette: colors('oga'),
    body: picture('ogat'),
    face: { x: 98, y: 138, scale: 0.68 },
    traits: { cyclops: true },
    // Monokel och hög hatt. Monokeln åker snett när den träffas.
    frontTilt: { traffad: { rotate: 22, x: 14, y: 14 } },
    line: 'Jag ser allt. Bokstavligen.',
    idle: 'motion-safe:animate-blob-idle',
  },
  // Svettband och armband i 80-talsstil. Kör aerobics.
  {
    id: 'burret',
    emoji: '🦔',
    name: 'Burret',
    palette: colors('burr'),
    body: picture('burret'),
    face: { x: 100, y: 130, scale: 0.8 },
    traits: { eyeShape: 'wide', mouth: 'grin' },
    line: 'Ni andra är för stela.',
    idle: 'motion-safe:animate-blob-aerobic',
  },
  // Mössa, cigarett i mungipan och rökringar i väntrummet. Stampar.
  {
    id: 'brakis',
    emoji: '😈',
    name: 'Bråkis',
    palette: colors('brak'),
    body: picture('brakis'),
    face: { x: 98, y: 138, scale: 0.75 },
    traits: { lightFace: true, brows: 'angry', mouth: 'snarl' },
    line: 'Vad glor du på?',
    idle: 'motion-safe:animate-blob-stomp',
  },
  // Luvtröja med huvan uppe, hörlurar och mobilen i handen. Duckar och kikar fram.
  {
    id: 'blygis',
    emoji: '😳',
    name: 'Blygis',
    palette: colors('blyg'),
    outline: true,
    body: picture('blygis'),
    face: { x: 100, y: 104, scale: 0.64 },
    traits: { eyeShape: 'small', shy: true, mouth: 'tiny' },
    line: 'Jag är bara här för snacksen.',
    idle: 'motion-safe:animate-blob-peek',
  },
  {
    id: 'smaltis',
    emoji: '🧊',
    name: 'Smältis',
    palette: colors('smalt'),
    shape: 'smalt',
    body: picture('smaltis'),
    face: { x: 98, y: 118, scale: 0.82 },
    traits: { droopy: true, mouth: 'cat' },
    // Glasstrut som droppar och solkräm på näsan.
    line: 'Det är för varmt här inne.',
    idle: 'motion-safe:animate-blob-idle',
  },
  {
    id: 'plugghasten',
    emoji: '🤓',
    name: 'Plugghästen',
    palette: colors('plugg'),
    body: picture('plugghasten'),
    face: { x: 100, y: 135, scale: 0.8 },
    traits: { mouth: 'buck' },
    // De stora glasögonen åker snett när den träffas.
    frontTilt: { traffad: { rotate: -14, x: -6, y: 10 } },
    // Propellerkeps (propellern snurrar i väntrummet), glasögonen och pennor i fickan.
    line: 'Statistiskt sett vinner jag.',
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

// Figurerna i startsidans hero (HeroFigurer). De är bara dekoration och inte spelarfigurer, så de finns inte i BLOBS och
// går inte att välja. Bilderna (public/figurer/hero/, scripts/figurbilder.py) har inget ansikte: det ritas i koden med
// samma linjer, ögon och kinder som de andra, och bara uttrycket (hero i traits) skiljer sig.
export type HeroId = 'hero-musik' | 'hero-mobil' | 'hero-hej' | 'hero-fluga'

const heroPicture = (n: number): BlobBody => ({ kind: 'png', src: `/figurer/hero/hero-${n}.webp` })

export const HERO_FIGURES: readonly BlobFigure[] = [
  {
    // Blåviolett med hörlurar: njuter av musiken med stängda ögon.
    id: 'hero-musik',
    emoji: '',
    name: 'Blåviolett med hörlurar',
    palette: colors('hero-musik'),
    body: heroPicture(1),
    face: { x: 100, y: 120, scale: 0.52 },
    traits: { hero: 'musik' },
    line: '',
    idle: '',
  },
  {
    // Korallröd med mobil: läser något spännande.
    id: 'hero-mobil',
    emoji: '',
    name: 'Korallröd med mobil',
    palette: colors('hero-mobil'),
    body: heroPicture(2),
    face: { x: 100, y: 112, scale: 0.52 },
    traits: { hero: 'mobil' },
    line: '',
    idle: '',
  },
  {
    // Gul med partyhatt: ropar hej. Kroppen lutar lite, så ansiktet gör det också.
    id: 'hero-hej',
    emoji: '',
    name: 'Gul med partyhatt',
    palette: colors('hero-hej'),
    body: heroPicture(3),
    face: { x: 100, y: 116, scale: 0.52, rotate: 6 },
    traits: { hero: 'hej' },
    line: '',
    idle: '',
  },
  {
    // Mintgrön med fluga: knipglad, med händerna vid sidorna av ansiktet.
    id: 'hero-fluga',
    emoji: '',
    name: 'Mintgrön med fluga',
    palette: colors('hero-fluga'),
    body: heroPicture(4),
    face: { x: 100, y: 116, scale: 0.52 },
    traits: { hero: 'fluga' },
    line: '',
    idle: '',
  },
]
