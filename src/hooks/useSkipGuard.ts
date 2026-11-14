import { useEffect, useRef, type MouseEvent } from 'react'
import { SKIP_GUARD_MS, skipAllowed } from '@/lib/hoppaover'

// Tryck för att hoppa över en ruta, utan att ett tryck som var på väg när rutan dök upp räknas (hoppaover.ts): trycket
// måste börja på rutan (pointerdown) efter att den visats, och tidigast minMs efter att den kom fram. Lägg handlarna på
// rutan: <div {...useSkipGuard(onDone)}>. resetKey = något som byts när rutan visar något nytt utan att monteras om
// (null = inget visas), så att tiden räknas från det nya.
export function useSkipGuard(onSkip: () => void, minMs: number = SKIP_GUARD_MS, resetKey: string | number | null = 0) {
  const shownAt = useRef<number | null>(null)
  const pressedAt = useRef<number | null>(null)
  useEffect(() => {
    shownAt.current = resetKey === null ? null : performance.now()
    pressedAt.current = null
    return () => {
      shownAt.current = null
    }
  }, [resetKey])
  return {
    onPointerDown: () => {
      pressedAt.current = performance.now()
    },
    onClick: (event: MouseEvent) => {
      const now = performance.now()
      // Ett klick från tangentbordet (Enter, mellanslag) har inget pointerdown, och räknas från nu.
      const pressed = event.detail === 0 ? now : pressedAt.current
      pressedAt.current = null
      if (skipAllowed({ shownAt: shownAt.current, pressedAt: pressed, now, minMs })) onSkip()
    },
  }
}
