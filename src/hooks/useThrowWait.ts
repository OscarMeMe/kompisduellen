import { useEffect, useState } from 'react'
import { THROW_COOLDOWN_MS, throwCooldownSeconds } from '@/lib/kast'

// Sekunder kvar av spärren efter ett kast.
export function useThrowWait(lastThrowAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (lastThrowAt === null) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() - lastThrowAt >= THROW_COOLDOWN_MS) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [lastThrowAt])
  return throwCooldownSeconds(lastThrowAt, now)
}
