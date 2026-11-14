// Rutor som går att hoppa över med ett tryck (explosionen, kortet man drar, stölden, fällan, utdelningen). Ett tryck
// räknas bara om det började på rutan efter att den visats, och tidigast en stund efter att den kom fram, så att ett
// tryck som var på väg när rutan dök upp aldrig hoppar över den. Rena funktioner, som useSkipGuard använder.

// Så länge efter att en ruta visats ignoreras tryck (ms), så att ett dubbeltryck inte stänger den direkt.
export const SKIP_GUARD_MS = 400
// Explosionen: tryck de första 1,5 sekunderna ignoreras.
export const BOMB_SKIP_AFTER_MS = 1500
// Explosionen: "Räddad!" eller "[namn] exploderade!" syns minst så här länge (ms), även när man hoppar över.
export const BOMB_RESULT_MS = 1000

// Får trycket hoppa över rutan? shownAt = när rutan visades, pressedAt = när trycket började på rutan (null om det inte
// började där, t.ex. före att rutan fanns), now = när trycket släpptes. Alla i samma klocka (ms).
export function skipAllowed({ shownAt, pressedAt, now, minMs }: { shownAt: number | null; pressedAt: number | null; now: number; minMs: number }): boolean {
  if (shownAt === null || pressedAt === null) return false
  return pressedAt >= shownAt && now - shownAt >= minMs
}

// Explosionen hoppas över: hur länge till den ska visas (ms), så att resultatet synts i minst minResultMs. elapsed = hur
// länge explosionen visats, resultAt = när resultatet ("Räddad!", "exploderade!") kom fram.
export function skipDelay(elapsed: number, resultAt: number, minResultMs: number): number {
  return Math.max(0, resultAt + minResultMs - elapsed)
}
