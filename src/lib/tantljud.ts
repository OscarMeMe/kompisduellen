// Exploderande Tanters ljud från filer (public/ljud/tantpanik). Filerna laddas först när spelet startar
// (loadTantSounds) och spelas genom ljudeffekternas volym (ljud.ts), så att ljudknappen, volymen och "Stäng av allt"
// gäller. Ett ljud som inte hunnit laddas spelas inte. Har ett ögonblick flera varianter slumpas en av dem, aldrig
// samma två gånger i rad. Källor och licenser står i docs/ljud-licenser.md.
// Explosionen (playBoom), Nope! (playPop), nedräkningen och turkoppen görs fortfarande i kod (ljud.ts).
// Alla filer är CC0 utom trombonen (utslagen, CC BY 4.0) och applåden i konfettiljudet (CC BY 3.0), som har sina
// krediter i regelvyn (TantMenyer).

import { loadSoundFiles, playSoundFile } from '@/lib/ljud'

export type TantSound = 'dra' | 'lagga' | 'vanda' | 'blanda' | 'stjala' | 'desarmera' | 'utslagen' | 'vinst' | 'konfetti'

const DIR = '/ljud/tantpanik'

// Filerna och volymen (0–1) för varje ögonblick.
export const TANT_SOUNDS: Record<TantSound, { files: readonly string[]; volume: number }> = {
  // Ett kort dras ur högen.
  dra: { files: [`${DIR}/dra-kort-1.mp3`, `${DIR}/dra-kort-2.mp3`, `${DIR}/dra-kort-3.mp3`], volume: 0.7 },
  // Ett kort, par eller tretal läggs på bordet.
  lagga: { files: [`${DIR}/lagga-kort.mp3`], volume: 0.7 },
  // Kortet jag drog vänds upp.
  vanda: { files: [`${DIR}/vanda-kort.mp3`], volume: 0.7 },
  // Högen blandas.
  blanda: { files: [`${DIR}/blanda.mp3`], volume: 0.7 },
  // Ett kort byter hand (par, tretal, Tjänst).
  stjala: { files: [`${DIR}/stjala-kort.mp3`], volume: 0.7 },
  // Desarmera räddar den som drog tanten.
  desarmera: { files: [`${DIR}/desarmera.mp3`], volume: 0.7 },
  // En spelare exploderar och är ute: en sorglig trombon (CC BY 4.0, krediten står i regelvyn).
  utslagen: { files: [`${DIR}/utslagen.mp3`], volume: 0.7 },
  // Någon är sist kvar och vinner.
  vinst: { files: [`${DIR}/vinst.mp3`], volume: 0.7 },
  // Konfettin börjar falla på slutskärmen: en smäll och en applåd (applåden är CC BY 3.0, krediten står i regelvyn).
  konfetti: { files: [`${DIR}/konfetti.mp3`], volume: 0.7 },
}

export const TANT_SOUND_FILES: readonly string[] = Object.values(TANT_SOUNDS).flatMap((sound) => sound.files)

// Hämtar alla spelets ljud. Anropas när Exploderande Tanter startar.
export function loadTantSounds() {
  loadSoundFiles(TANT_SOUND_FILES)
}

// Vilken variant som spelas: en slumpad, men aldrig samma som förra gången när det finns fler.
export function pickVariant(files: readonly string[], last: string | undefined, random: () => number): string {
  const pool = files.length > 1 ? files.filter((file) => file !== last) : files
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}

const lastPlayed: Partial<Record<TantSound, string>> = {}

// Spelar ljudet för ett ögonblick. Ger false om filen inte är laddad (då spelas inget).
export function playTantSound(sound: TantSound, random: () => number = Math.random): boolean {
  const { files, volume } = TANT_SOUNDS[sound]
  const file = pickVariant(files, lastPlayed[sound], random)
  lastPlayed[sound] = file
  return playSoundFile(file, volume)
}

// Vinstjublet (vid bordet) och konfettin (på slutskärmen) spelas en gång per vinst: inte igen när vyn visas på nytt
// (vinnarens ögonblick blinkar till före den sista explosionen), inte efter en omladdning och aldrig två gånger för samma
// match. key = matchens vinst (winSoundKey). Den senaste vinsten som låtit sparas i fliken, för varje ljud för sig. Ger
// true första gången, och då ska ljudet spelas.
export type OnceSound = 'vinst' | 'konfetti'
const HEARD_KEYS: Record<OnceSound, string> = { vinst: 'kd-tant-vinst', konfetti: 'kd-tant-konfetti' }

export function winSoundKey(table: { order: readonly string[]; winner: string | null; log: readonly { n: number }[] }): string {
  return `${table.order.join()}|${table.winner ?? ''}|${table.log.at(-1)?.n ?? 0}`
}

export function markHeardOnce(sound: OnceSound, key: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeSessionStorage()): boolean {
  try {
    if (storage?.getItem(HEARD_KEYS[sound]) === key) return false
    storage?.setItem(HEARD_KEYS[sound], key)
  } catch {
    // Går det inte att spara spelas ljudet ändå.
  }
  return true
}

export function markWinHeard(key: string, storage?: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  return markHeardOnce('vinst', key, storage)
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
