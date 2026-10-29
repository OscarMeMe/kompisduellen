// Sant på en dator med mus eller styrplatta, falskt på en pekskärm.
// Används för att inte öppna mobilens tangentbord av sig självt, eftersom det täcker halva skärmen.
export function hasFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
}

// Kan sidan hålla skärmen tänd (Screen Wake Lock, se useWakeLock)? Saknas det på en telefon får värden ett tips.
export function canKeepScreenOn(): boolean {
  return 'wakeLock' in navigator
}
