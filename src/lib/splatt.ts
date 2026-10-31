// Var en splatt från ett kast (kast.ts) får synas: i övre delen av skärmen, under tidsstapeln och ovanför allt som
// inte får täckas (svarsdelen, Lås svaret och kort man ska välja). placeSplat är en ren funktion, measureSplatPlace
// läser av sidan när kastet kommer in.

// Markerar det som en splatt aldrig får täcka. Sätts som attribut, t.ex. <div {...SPLAT_SHIELD}>.
export const SPLAT_SHIELD = { 'data-splat-skydd': '' }
// Markerar tidsstapeln högst upp. Splatten hamnar under den.
export const SPLAT_CEILING = { 'data-splat-tak': '' }

// Hur stor splatten får bli (px). Under SPLAT_MIN_SIZE visas ingen splatt, bara en rad i flödet.
export const SPLAT_MAX_SIZE = 240
export const SPLAT_MIN_SIZE = 120
const GAP = 8

export type SplatPlace = { top: number; size: number }
type Box = { top: number; bottom: number }

// Platsen för splatten, eller null om den inte får plats. ceiling = tidsstapelns nederkant (null om den saknas).
// shields = det som inte får täckas, i skärmens koordinater. Ligger något av det redan överst finns ingen plats.
export function placeSplat(
  viewport: { width: number; height: number },
  ceiling: number | null,
  shields: readonly Box[],
): SplatPlace | null {
  const top = Math.max(GAP, (ceiling ?? 0) + GAP)
  let bottom = viewport.height - GAP
  for (const box of shields) {
    if (box.bottom <= box.top || box.bottom <= top || box.top >= viewport.height) continue
    if (box.top <= top) return null
    bottom = Math.min(bottom, box.top - GAP)
  }
  const size = Math.min(bottom - top, SPLAT_MAX_SIZE, viewport.width * 0.7)
  return size >= SPLAT_MIN_SIZE ? { top, size } : null
}

// Läser av sidan just nu.
export function measureSplatPlace(): SplatPlace | null {
  const ceiling = document.querySelector('[data-splat-tak]')?.getBoundingClientRect().bottom ?? null
  const shields = Array.from(document.querySelectorAll('[data-splat-skydd]'), (element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom }
  })
  return placeSplat({ width: window.innerWidth, height: window.innerHeight }, ceiling, shields)
}
