// Ljudeffekten för reaktioner: ett kort "plopp" som ritas upp med Web Audio, så ingen ljudfil behövs.
// Valet att stänga av ljudet sparas i webbläsaren. Ljudet är på från början.

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

// Ljudet när något splattar mot en (kast.ts): ett kort, dovt "splatt" av brus som filtreras ner.
export function playSplat() {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    const length = Math.floor(context.sampleRate * 0.25)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
    const noise = context.createBufferSource()
    noise.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, now)
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
    noise.connect(filter).connect(gain).connect(context.destination)
    noise.start(now)
    noise.stop(now + 0.26)
  } catch {
    // Inget ljud är inget fel.
  }
}
