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
