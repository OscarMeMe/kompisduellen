import { useEffect, useState } from 'react'

// Räknar upp från 0 till target på ungefär durationMs, snabbt i början och mjukt mot slutet.
// Med "minska rörelse" visas target direkt.
export function useCountUp(target: number, durationMs = 1000): number {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, reduced])

  return reduced ? target : value
}
