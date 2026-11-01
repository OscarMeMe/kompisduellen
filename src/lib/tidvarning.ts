// Hur tydligt det ska synas att tiden håller på att ta slut medan man gissar.
// normal: som vanligt. varning: 10 sekunder eller mindre kvar. kritisk: 5 sekunder eller mindre kvar.
// Korta rundor kan varna senare (warningSeconds), annars skulle varningen synas nästan hela tiden.
// Har man låst sitt svar (eller inte är med i matchen) är det alltid normal, eftersom tiden inte längre spelar roll.
export type TimeWarning = 'normal' | 'varning' | 'kritisk'

export const WARNING_SECONDS = 10
export const CRITICAL_SECONDS = 5

export function timeWarning(secondsLeft: number, locked: boolean, warningSeconds = WARNING_SECONDS): TimeWarning {
  if (locked) return 'normal'
  if (secondsLeft <= CRITICAL_SECONDS) return 'kritisk'
  if (secondsLeft <= warningSeconds) return 'varning'
  return 'normal'
}
