// Bakgrundsmusik i spel med egen musik (MUSIC_SETS: Exploderande Tanter och Imposterjakten), bara när det spelet är valt
// (setSet): ett spår i väntrummet och ett under matchen (setLevel). När man går mellan dem tonas spåren över i varandra (CROSSFADE). Spåren laddas först när de behövs och
// loopar sömlöst (AudioBufferSourceNode med loop). Saknas en fil spelas en enkel slinga som skapas med Web Audio. Låg
// volym (i väntrummet högst LOBBY_MAX), sänks när ljudeffekter spelas (duck) och tystnar en stund vid en explosion
// (silence). Lite snabbare när det är spännande (setFast). Startar först efter ett tryck (webbläsarnas regel) och tonas
// in. Volymen (0–1, där 1 är musikens högsta volym MAX_VOLUME) sparas i localStorage (kd-musik-volym), skild från
// ljudeffekterna, och sätts med en GainNode, som fungerar även på iPhone. Källor och licenser står i
// docs/ljud-licenser.md.

import { setEffectListener } from '@/lib/ljud'

export type MusicLevel = 'lobby' | 'match'
// Vilket spels musik som spelas.
export type MusicSet = 'tant' | 'imposter'

// Väntrummet: "Upbeat - Upbeat Music" av lNPLUSMUSIC från Pixabay (ingen kredit krävs). Matchen: "Happy Arcade Tune" av
// rezoner från OpenGameArt, CC BY 3.0 (krediten står i regelvyn).
export const MUSIC_FILES: Record<MusicLevel, string> = {
  lobby: '/musik/vantrum.mp3',
  match: '/musik/kafferep.mp3',
}

// Spelens spår. file null = spåret finns inte än, och då är det tyst. matchShare är hur stor del av musikens högsta
// volym matchens spår får (Imposterjaktens ska ligga lågt, så att det inte stör när man pratar). trim = tystnaden som
// mp3-formatet lägger i början och slutet av filen klipps bort, så att loopen blir sömlös. synth = saknas en fil spelas
// reservslingan (bara Exploderande Tanter, där den är skriven för spelet).
//
// Imposterjaktens väntrum och slutskärm: "Trouble Makers (Cool/Riff-Jazz)" av Matthew Pablo från OpenGameArt, CC BY 3.0
// (krediten står i regelvyn). Matchen: "Investigation" av Umplix (CC0) läggs in när filen finns.
type TrackSet = { lobby: string | null; match: string | null; matchShare: number; trim: boolean; synth: boolean }
export const MUSIC_SETS: Record<MusicSet, TrackSet> = {
  tant: { ...MUSIC_FILES, matchShare: 1, trim: false, synth: true },
  imposter: { lobby: '/musik/imposter-vantrum.mp3', match: null, matchShare: 0.4, trim: true, synth: false },
}

const VOLUME_KEY = 'kd-musik-volym'
// Äldre val: musiken av eller på.
const OLD_KEY = 'kd-tant-musik'
// Musikens högsta volym, förvald andel av den, hur mycket den sänks när en ljudeffekt spelas, och tiderna (sekunder).
const MAX_VOLUME = 0.5
const DEFAULT_VOLUME = 0.5
const DUCKED = 0.35
const FADE_IN = 1.5
const FADE_OUT = 0.6
// I väntrummet är musiken aldrig högre än så här, hur högt reglaget än står.
const LOBBY_MAX = 0.15
// Hur länge spåren tonas över i varandra när man går mellan väntrummet och matchen (sekunder).
const CROSSFADE = 1.5
// Hur mycket snabbare musiken går när det är spännande.
const FAST_RATE = 1.12
// Så länge musiken får vara utan någon som vill ha den innan den tonas ut (ms), så att den fortsätter utan avbrott när
// väntrummet byts mot matchen.
const STOP_DELAY = 400

export function loadMusicVolume(): number {
  try {
    const saved = localStorage.getItem(VOLUME_KEY)
    if (saved !== null && Number.isFinite(Number(saved))) return Math.max(0, Math.min(1, Number(saved)))
    return localStorage.getItem(OLD_KEY) === '0' ? 0 : DEFAULT_VOLUME
  } catch {
    return DEFAULT_VOLUME
  }
}

function saveMusicVolume(volume: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(volume))
  } catch {
    // Utan lagring gäller valet bara tills sidan laddas om.
  }
}

// Musikens verkliga volym för ett läge (0–1). Exporterad för testerna.
export function musicGain(sliderVolume: number, level: MusicLevel, set: MusicSet = 'tant'): number {
  const full = sliderVolume * MAX_VOLUME
  return level === 'lobby' ? Math.min(full, LOBBY_MAX) : full * MUSIC_SETS[set].matchShare
}

type Source = { stop: () => void; setRate: (rate: number) => void }
// Ett spår som spelar: vilket (spel och läge), källan och dess egen volym, som används när spåren tonas över i varandra.
type Playing = { key: string; source: Source; gain: GainNode }

let volume = loadMusicVolume()
// De som vill veta när volymen ändras (useMusicVolume), så att alla reglage och all musik följer samma värde.
const volumeListeners = new Set<() => void>()

export function getMusicVolume(): number {
  return volume
}

export function subscribeMusicVolume(listener: () => void): () => void {
  volumeListeners.add(listener)
  return () => volumeListeners.delete(listener)
}
let context: AudioContext | null = null
// Huvudvolymen: musikens volym, duck och tystnad. Spåren går hit genom sina egna GainNodes.
let output: GainNode | null = null
let playing: Playing | null = null
let starting = false
let wanted = false
let level: MusicLevel = 'match'
let set: MusicSet = 'tant'
// Spåret som ska spela just nu.
const trackKey = () => `${set}/${level}`
let rate = 1
let duckUntil = 0
let silentUntil = 0
let stopTimer: ReturnType<typeof setTimeout> | null = null
const buffers: Record<string, Promise<AudioBuffer | 'none'>> = {}

function ctx(): AudioContext {
  context ??= new AudioContext()
  if (!output) {
    output = context.createGain()
    output.gain.value = 0
    output.connect(context.destination)
  }
  return context
}

// Målvolymen just nu, med hänsyn till läget, duck och tystnad.
function targetVolume(): number {
  const now = performance.now()
  if (now < silentUntil) return 0
  const full = musicGain(volume, level, set)
  return now < duckUntil ? full * DUCKED : full
}

function ramp(gain: GainNode, value: number, seconds: number) {
  if (!context) return
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(value, now + seconds)
}

function rampTo(value: number, seconds: number) {
  if (output) ramp(output, value, seconds)
}

function loadBuffer(audio: AudioContext, file: string): Promise<AudioBuffer | 'none'> {
  buffers[file] ??= (async () => {
    try {
      const response = await fetch(file)
      const type = response.headers.get('content-type') ?? ''
      if (!response.ok || !type.startsWith('audio')) return 'none'
      return await audio.decodeAudioData(await response.arrayBuffer())
    } catch {
      return 'none'
    }
  })()
  return buffers[file]
}

// Var ljudet börjar och slutar i ett spår (sekunder): mp3-formatet lägger en kort tystnad först och sist i filen, som
// annars hörs som ett hack varje gång spåret börjar om. Letar högst TRIM_SEARCH sekunder in från varje ände. Exporterad
// för testerna.
const TRIM_SEARCH = 0.25
const TRIM_LEVEL = 0.003
export function soundBounds(channels: readonly Float32Array[], sampleRate: number): { start: number; end: number } {
  const length = channels[0]?.length ?? 0
  const search = Math.min(Math.floor(TRIM_SEARCH * sampleRate), Math.floor(length / 4))
  const loud = (i: number) => channels.some((channel) => Math.abs(channel[i]) > TRIM_LEVEL)
  let first = 0
  while (first < search && !loud(first)) first += 1
  let last = length - 1
  while (last > length - 1 - search && !loud(last)) last -= 1
  return { start: first / sampleRate, end: (last + 1) / sampleRate }
}

function playBuffer(audio: AudioContext, data: AudioBuffer, destination: AudioNode, trim: boolean): Source {
  const node = audio.createBufferSource()
  node.buffer = data
  node.loop = true
  let offset = 0
  if (trim) {
    const channels = Array.from({ length: data.numberOfChannels }, (_, i) => data.getChannelData(i))
    const bounds = soundBounds(channels, data.sampleRate)
    node.loopStart = bounds.start
    node.loopEnd = bounds.end
    offset = bounds.start
  }
  node.playbackRate.value = rate
  node.connect(destination)
  node.start(0, offset)
  return {
    stop: () => node.stop(),
    setRate: (value) => node.playbackRate.setTargetAtTime(value, audio.currentTime, 0.5),
  }
}

// Reserven om en fil saknas: en enkel, glad slinga (bas och en liten melodi) som schemaläggs i förväg.
const BASS = [45, 45, 52, 52, 41, 41, 43, 43]
const MELODY = [69, null, 72, 74, null, 72, 69, null, 67, null, 69, 72, null, 74, 76, null]
function playSynth(audio: AudioContext, destination: AudioNode): Source {
  let tempo = rate
  let step = 0
  let next = audio.currentTime + 0.05
  const note = (midi: number, at: number, length: number, type: OscillatorType, gain: number) => {
    const oscillator = audio.createOscillator()
    const envelope = audio.createGain()
    oscillator.type = type
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12)
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(gain, at + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
    oscillator.connect(envelope).connect(destination)
    oscillator.start(at)
    oscillator.stop(at + length + 0.05)
  }
  const timer = setInterval(() => {
    // Åttondelar i 112 slag per minut, gånger tempot.
    const eighth = 60 / 112 / 2 / tempo
    while (next < audio.currentTime + 0.3) {
      note(BASS[Math.floor(step / 2) % BASS.length], next, eighth * 0.9, 'triangle', 0.5)
      const melody = MELODY[step % MELODY.length]
      if (melody !== null) note(melody, next, eighth * 0.8, 'square', 0.08)
      step += 1
      next += eighth
    }
  }, 100)
  return { stop: () => clearInterval(timer), setRate: (value) => (tempo = value) }
}

// Ett spår som inte finns än: tyst.
const SILENT: Source = { stop: () => {}, setRate: () => {} }

// Startar spåret som ska spela just nu, med en egen volym som börjar på from (0 vid en övertoning, 1 annars).
async function playTrack(audio: AudioContext, from: number): Promise<Playing> {
  const key = trackKey()
  const tracks = MUSIC_SETS[set]
  const file = tracks[level]
  const data = file ? await loadBuffer(audio, file) : 'none'
  const gain = audio.createGain()
  gain.gain.value = from
  gain.connect(output!)
  const source = data !== 'none' ? playBuffer(audio, data, gain, tracks.trim) : tracks.synth ? playSynth(audio, gain) : SILENT
  return { key, source, gain }
}

function stopTrack(track: Playing, seconds: number) {
  ramp(track.gain, 0, seconds)
  setTimeout(
    () => {
      track.source.stop()
      track.gain.disconnect()
    },
    seconds * 1000 + 50,
  )
}

async function start() {
  if (playing || starting) return
  starting = true
  try {
    const audio = ctx()
    if (audio.state === 'suspended') await audio.resume()
    if (audio.state !== 'running') return
    const track = await playTrack(audio, 1)
    if (!wanted || playing) {
      track.source.stop()
      track.gain.disconnect()
      return
    }
    playing = track
    rampTo(targetVolume(), FADE_IN)
    // Läget eller spelet kan ha bytts medan spåret laddades.
    if (track.key !== trackKey()) void crossfade()
  } catch {
    // Ingen musik är inget fel.
  } finally {
    starting = false
  }
}

// Byter till spåret för läget och tonar över mjukt: det gamla tonas ut medan det nya tonas in.
async function crossfade() {
  const audio = context
  const old = playing
  if (!audio || !old || old.key === trackKey()) return
  const track = await playTrack(audio, 0)
  // Har något hänt under laddningen (stoppad, eller läget bytt igen) tas det nya spåret bort.
  if (playing !== old || !wanted || track.key !== trackKey()) {
    track.source.stop()
    track.gain.disconnect()
    if (playing === old && wanted && old.key !== trackKey()) void crossfade()
    return
  }
  playing = track
  ramp(track.gain, 1, CROSSFADE)
  stopTrack(old, CROSSFADE)
  rampTo(targetVolume(), CROSSFADE)
}

function stop() {
  const track = playing
  playing = null
  if (!track) return
  rampTo(0, FADE_OUT)
  stopTrack(track, FADE_OUT)
}

// Webbläsaren låter musiken starta först efter ett tryck. Försöker igen vid varje tryck tills den spelar.
function onGesture() {
  if (wanted && !playing) void start()
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', onGesture, { capture: true })
  window.addEventListener('keydown', onGesture, { capture: true })
}

export const tantMusic = {
  // Ny volym (0–1): hörs direkt och sparas.
  setVolume(next: number) {
    volume = Math.max(0, Math.min(1, next))
    saveMusicVolume(volume)
    if (playing) rampTo(targetVolume(), 0.1)
    for (const listener of volumeListeners) listener()
  },
  // Ska musiken spela just nu (Exploderande Tanter valt, ljud på och musikvolym över 0)?
  setWanted(on: boolean) {
    wanted = on
    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = null
    if (on) {
      void start()
      return
    }
    stopTimer = setTimeout(() => {
      stopTimer = null
      if (!wanted) stop()
    }, STOP_DELAY)
  },
  // Vilket spels musik som gäller. Spelar ett annat spels spår tonas det över i det nya.
  setSet(next: MusicSet) {
    if (next === set) return
    set = next
    if (playing) void crossfade()
  },
  // Väntrummet eller matchen: spåren tonas över i varandra, och väntrummet är som mest LOBBY_MAX.
  setLevel(next: MusicLevel) {
    if (next === level) return
    level = next
    if (playing) void crossfade()
  },
  // Spännande läge: lite snabbare.
  setFast(fast: boolean) {
    rate = fast ? FAST_RATE : 1
    playing?.source.setRate(rate)
  },
  // En ljudeffekt spelas: musiken sänks en stund.
  duck(ms = 700) {
    duckUntil = Math.max(duckUntil, performance.now() + ms)
    if (!playing) return
    rampTo(targetVolume(), 0.08)
    setTimeout(() => playing && rampTo(targetVolume(), 0.4), ms)
  },
  // En explosion: musiken tystnar helt en stund och tonas sedan in igen.
  silence(ms = 1000) {
    silentUntil = Math.max(silentUntil, performance.now() + ms)
    if (!playing) return
    rampTo(0, 0.05)
    setTimeout(() => playing && rampTo(targetVolume(), 0.8), ms)
  },
}

// Imposterjakten: musiken sänks en stund varje gång en ljudeffekt spelas (ordets tur, nedräkningen, reaktioner och
// kast). Exploderande Tanter sänker själv vid sina egna ljud.
setEffectListener(() => {
  if (set === 'imposter' && playing) tantMusic.duck(700)
})
