// Ljudeffekterna för reaktioner (ett kort "plopp") och kast (playHit). Allt ritas upp med Web Audio, så inga
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

// Ljuden när något träffar en (kast.ts). Allt ritas upp med Web Audio, så inga ljudfiler behövs.
// Tomat: ett blött splatt. Paj: en dov duns och ett kladdigt ljud. Ägg: ett knäck och ett litet plask.
// Toapapper: ett fladdrande swisch.
export function playHit(item: ThrowItemId) {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const ctx = context
    const now = ctx.currentTime
    if (item === 'tomat') {
      noise(ctx, now, 0.25, 'lowpass', 1800, 300, 0.25)
    } else if (item === 'paj') {
      tone(ctx, now, 140, 55, 0.22, 0.35)
      noise(ctx, now + 0.02, 0.3, 'lowpass', 700, 200, 0.15)
    } else if (item === 'agg') {
      noise(ctx, now, 0.025, 'highpass', 2500, 2500, 0.3)
      noise(ctx, now + 0.05, 0.025, 'highpass', 3000, 3000, 0.22)
      noise(ctx, now + 0.08, 0.18, 'lowpass', 1200, 300, 0.12)
    } else {
      noise(ctx, now, 0.45, 'bandpass', 500, 2500, 0.14)
    }
  } catch {
    // Inget ljud är inget fel.
  }
}

// Brus genom ett filter som glider från en frekvens till en annan, och tonar ut.
function noise(
  ctx: AudioContext,
  start: number,
  duration: number,
  type: BiquadFilterType,
  from: number,
  to: number,
  volume: number,
) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(to, start + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(start)
  source.stop(start + duration + 0.01)
}

// En ton som glider från en frekvens till en annan, t.ex. en duns.
function tone(ctx: AudioContext, start: number, from: number, to: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(from, start)
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.01)
}
