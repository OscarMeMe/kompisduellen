// Bakgrundsmusik i Exploderande Tanter, bara under matchen. Musikfilen (MUSIC_FILE i public/) laddas först när matchen
// startar och loopar sömlöst (AudioBufferSourceNode med loop). Finns ingen fil spelas en enkel slinga som skapas med
// Web Audio, som platshållare. Låg volym, sänks när ljudeffekter spelas (duck) och tystnar en stund vid en explosion
// (silence). Lite snabbare när det är spännande (setFast). Startar först efter ett tryck (webbläsarnas regel) och tonas
// in. Volymen (0–1, där 1 är musikens högsta volym MAX_VOLUME) sparas i localStorage (kd-musik-volym), skild från
// ljudeffekterna, och sätts med en GainNode, som fungerar även på iPhone.

// Lägg musiken här: public/ljud/tantmusik.mp3 (eller .ogg, ändra då sökvägen). Helst en kort slinga som loopar sömlöst.
export const MUSIC_FILE = '/ljud/tantmusik.mp3'

const VOLUME_KEY = 'kd-musik-volym'
// Äldre val: musiken av eller på.
const OLD_KEY = 'kd-tant-musik'
// Musikens högsta volym, förvald andel av den, hur mycket den sänks när en ljudeffekt spelas, och tiderna (sekunder).
const MAX_VOLUME = 0.5
const DEFAULT_VOLUME = 0.5
const DUCKED = 0.35
const FADE_IN = 1.5
const FADE_OUT = 0.6
// Hur mycket snabbare musiken går när det är spännande.
const FAST_RATE = 1.12

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

let volume = loadMusicVolume()

type Source = { stop: () => void; setRate: (rate: number) => void }

let context: AudioContext | null = null
let output: GainNode | null = null
let source: Source | null = null
let starting = false
let wanted = false
let rate = 1
let duckUntil = 0
let silentUntil = 0
let buffer: AudioBuffer | null | 'none' = null

function ctx(): AudioContext {
  context ??= new AudioContext()
  if (!output) {
    output = context.createGain()
    output.gain.value = 0
    output.connect(context.destination)
  }
  return context
}

// Målvolymen just nu, med hänsyn till duck och tystnad.
function targetVolume(): number {
  const now = performance.now()
  if (now < silentUntil) return 0
  const full = volume * MAX_VOLUME
  return now < duckUntil ? full * DUCKED : full
}

function rampTo(volume: number, seconds: number) {
  if (!context || !output) return
  const now = context.currentTime
  output.gain.cancelScheduledValues(now)
  output.gain.setValueAtTime(output.gain.value, now)
  output.gain.linearRampToValueAtTime(volume, now + seconds)
}

async function loadBuffer(audio: AudioContext): Promise<AudioBuffer | 'none'> {
  try {
    const response = await fetch(MUSIC_FILE)
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || !type.startsWith('audio')) return 'none'
    return await audio.decodeAudioData(await response.arrayBuffer())
  } catch {
    return 'none'
  }
}

function playBuffer(audio: AudioContext, data: AudioBuffer): Source {
  const node = audio.createBufferSource()
  node.buffer = data
  node.loop = true
  node.playbackRate.value = rate
  node.connect(output!)
  node.start()
  return {
    stop: () => node.stop(),
    setRate: (value) => node.playbackRate.setTargetAtTime(value, audio.currentTime, 0.5),
  }
}

// Platshållaren: en enkel, glad slinga (bas och en liten melodi) som schemaläggs i förväg.
const BASS = [45, 45, 52, 52, 41, 41, 43, 43]
const MELODY = [69, null, 72, 74, null, 72, 69, null, 67, null, 69, 72, null, 74, 76, null]
function playSynth(audio: AudioContext): Source {
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
    oscillator.connect(envelope).connect(output!)
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

async function start() {
  if (source || starting) return
  starting = true
  try {
    const audio = ctx()
    if (audio.state === 'suspended') await audio.resume()
    if (audio.state !== 'running') return
    buffer ??= await loadBuffer(audio)
    if (!wanted || source) return
    source = buffer === 'none' ? playSynth(audio) : playBuffer(audio, buffer)
    rampTo(targetVolume(), FADE_IN)
  } catch {
    // Ingen musik är inget fel.
  } finally {
    starting = false
  }
}

function stop() {
  const playing = source
  source = null
  if (!playing) return
  rampTo(0, FADE_OUT)
  setTimeout(() => {
    if (source !== playing) playing.stop()
  }, FADE_OUT * 1000 + 50)
}

// Webbläsaren låter musiken starta först efter ett tryck. Försöker igen vid varje tryck tills den spelar.
function onGesture() {
  if (wanted && !source) void start()
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
    if (source) rampTo(targetVolume(), 0.1)
  },
  // Ska musiken spela just nu (match pågår, musik och ljud på)?
  setWanted(on: boolean) {
    wanted = on
    if (on) void start()
    else stop()
  },
  // Spännande läge: lite snabbare.
  setFast(fast: boolean) {
    rate = fast ? FAST_RATE : 1
    source?.setRate(rate)
  },
  // En ljudeffekt spelas: musiken sänks en stund.
  duck(ms = 700) {
    duckUntil = Math.max(duckUntil, performance.now() + ms)
    if (!source) return
    rampTo(targetVolume(), 0.08)
    setTimeout(() => source && rampTo(targetVolume(), 0.4), ms)
  },
  // En explosion: musiken tystnar helt en stund och tonas sedan in igen.
  silence(ms = 1000) {
    silentUntil = Math.max(silentUntil, performance.now() + ms)
    if (!source) return
    rampTo(0, 0.05)
    setTimeout(() => source && rampTo(targetVolume(), 0.8), ms)
  },
}
