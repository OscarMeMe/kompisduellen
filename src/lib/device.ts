// Sant på en dator med mus eller styrplatta, falskt på en pekskärm.
// Används för att inte öppna mobilens tangentbord av sig självt, eftersom det täcker halva skärmen.
export function hasFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
}

// Kan sidan hålla skärmen tänd (Screen Wake Lock, se useWakeLock)? Saknas det på en telefon får värden ett tips.
export function canKeepScreenOn(): boolean {
  return 'wakeLock' in navigator
}

// Ska värdens skärm hållas tänd? Alltid under en match, och i väntrummet och på slutskärmen så länge minst en annan
// spelare är med. Gästernas skärmar styr inget, så de släcks som vanligt. Låset släpps när värden lämnar lobbyn,
// eftersom lobbysidan då försvinner (se useWakeLock).
export function shouldKeepScreenOn({
  isHost,
  connected,
  inMatch,
  othersPresent,
}: {
  isHost: boolean
  connected: boolean
  inMatch: boolean
  othersPresent: boolean
}): boolean {
  return isHost && connected && (inMatch || othersPresent)
}
