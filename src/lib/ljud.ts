// Ljudeffekterna för reaktioner (ett kort "plopp") och kast (playThrow). Allt ritas upp med Web Audio, så inga
// ljudfiler behövs.
// Valet att stänga av ljudet sparas i webbläsaren. Ljudet är på från början.

import type { ThrowItemId } from '@/lib/kast'

const KEY = 'kd-ljud'

export function loadSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'av'
  } catch {
    return true
  }
}

export function saveSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'pa' : 'av')
  } catch {
    // Går det inte att spara gäller valet bara tills sidan laddas om.
  }
}

let context: AudioContext | undefined

export function playPop() {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(520, now)
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.2)
  } catch {
    // Inget ljud är inget fel.
  }
}

// Ljuden när något kastas på en (kast.ts). Ett svisch medan saken flyger, och träffen när den slår i skärmen efter
// impactSeconds (samma tid som rörelsen i index.css). Allt läggs på ljudklockan direkt, så att det hamnar i takt.
// Tomat: duns och blött splatt med små plask. Paj: djup duns och ett kladdigt squelch. Ägg: vasst knäck och ett plopp.
// Toapapper: fladdrande swisch och ett mjukt poff när rullen landar. Gurka: ett ihåligt bonk och ett krasch.
export function playThrow(item: ThrowItemId, impactSeconds: number) {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const ctx = context
    const now = ctx.currentTime
    const hit = now + impactSeconds
    // Svischet medan saken flyger: brus som stiger i tonhöjd och blir starkare mot slutet.
    noise(ctx, now, impactSeconds, 'bandpass', 300, 1600, 0.05, { rise: true, q: 1.2 })
    if (item === 'tomat') {
      tone(ctx, hit, 180, 70, 0.12, 0.22)
      noise(ctx, hit, 0.3, 'lowpass', 2200, 280, 0.28)
      for (const [delay, pitch] of [
        [0.06, 900],
        [0.11, 1300],
        [0.17, 700],
      ]) {
        tone(ctx, hit + delay, pitch, pitch * 0.55, 0.06, 0.05)
      }
    } else if (item === 'paj') {
      tone(ctx, hit, 120, 42, 0.28, 0.42)
      noise(ctx, hit + 0.02, 0.4, 'bandpass', 900, 250, 0.2, { q: 2.5, wobble: 18 })
    } else if (item === 'agg') {
      for (const [delay, freq, volume] of [
        [0, 3200, 0.32],
        [0.035, 4200, 0.24],
        [0.06, 2800, 0.18],
      ]) {
        noise(ctx, hit + delay, 0.02, 'highpass', freq, freq, volume, { q: 6 })
      }
      tone(ctx, hit + 0.09, 620, 190, 0.14, 0.14)
      noise(ctx, hit + 0.1, 0.22, 'lowpass', 1400, 300, 0.1)
    } else if (item === 'gurka') {
      tone(ctx, hit, 320, 140, 0.18, 0.3)
      tone(ctx, hit + 0.01, 480, 210, 0.12, 0.12)
      noise(ctx, hit, 0.2, 'bandpass', 2400, 700, 0.18, { q: 1.8 })
      noise(ctx, hit + 0.08, 0.15, 'lowpass', 1500, 400, 0.08)
    } else {
      noise(ctx, hit - 0.05, 0.6, 'bandpass', 600, 2600, 0.12, { q: 1.5, wobble: 22 })
      tone(ctx, hit + 0.65, 150, 90, 0.12, 0.12)
      noise(ctx, hit + 0.65, 0.15, 'lowpass', 800, 200, 0.08)
    }
  } catch {
    // Inget ljud är inget fel.
  }
}

// Brus genom ett filter som glider från en frekvens till en annan. Tonar ut, eller växer (rise) mot slutet.
// q = hur smalt filtret är. wobble = hur många gånger i sekunden ljudet fladdrar (för det kladdiga och pappret).
function noise(
  ctx: AudioContext,
  start: number,
  duration: number,
  type: BiquadFilterType,
  from: number,
  to: number,
  volume: number,
  options: { rise?: boolean; q?: number; wobble?: number } = {},
) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const t = i / length
    const envelope = options.rise ? t * t : (1 - t) ** 2
    const flutter = options.wobble ? 0.6 + 0.4 * Math.sin(2 * Math.PI * options.wobble * (i / ctx.sampleRate)) : 1
    data[i] = (Math.random() * 2 - 1) * envelope * flutter
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  if (options.q) filter.Q.value = options.q
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(to, start + duration)
  const gain = ctx.createGain()
  gain.gain.value = volume
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(Math.max(start, ctx.currentTime))
  source.stop(start + duration + 0.01)
}

// En ton som glider från en frekvens till en annan, t.ex. en duns.
function tone(ctx: AudioContext, start: number, from: number, to: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(from, start)
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.01)
}
