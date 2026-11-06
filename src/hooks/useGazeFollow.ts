import { useEffect, useState, type RefObject } from 'react'

// Hur långt bort (px) muspekaren ska vara för att blicken ska gå hela vägen åt sidan.
const GAZE_REACH = 260

// Kan figurerna följa muspekaren? Bara med mus (inte på pekskärm) och inte med "minska rörelse".
function canFollow(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Figurerna inuti root (element med data-gaze) följer muspekaren med blicken. Blicken räknas ut högst en gång per
// bildruta och sätts som CSS-variablerna --gaze-x och --gaze-y (-1 till 1), så att React inte ritar om något. Figurerna
// letas upp varje gång, så att spelare som går med i väntrummet också följer med. Ger tillbaka om blicken följer, så
// att figurerna annars kan behålla sin egen blick (Ögat sveper med blicken i väntrummet).
export function useGazeFollow(ref: RefObject<HTMLElement | null>): boolean {
  const [active] = useState(canFollow)

  useEffect(() => {
    const root = ref.current
    if (!root || !active) return
    let frame = 0
    let pointer = { x: 0, y: 0 }
    function update() {
      frame = 0
      for (const figure of root!.querySelectorAll<HTMLElement>('[data-gaze]')) {
        const box = figure.getBoundingClientRect()
        if (box.bottom < 0 || box.top > window.innerHeight) continue
        const dx = pointer.x - (box.left + box.width / 2)
        const dy = pointer.y - (box.top + box.height * 0.45)
        figure.style.setProperty('--gaze-x', Math.max(-1, Math.min(1, dx / GAZE_REACH)).toFixed(2))
        figure.style.setProperty('--gaze-y', Math.max(-1, Math.min(1, dy / GAZE_REACH)).toFixed(2))
      }
    }
    function onMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY }
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [ref, active])

  return active
}
