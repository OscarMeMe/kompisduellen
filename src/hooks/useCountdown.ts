import { useEffect, useState } from 'react'

// Tid kvar till en deadline enligt värdens klocka. Uppdateras fem gånger i sekunden.
// deadline null = ingen klocka går (då är allt kvar).
export function useCountdown(deadline: number | null, clockOffset: number, totalSeconds: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(timer)
  }, [])

  if (deadline === null) return { secondsLeft: totalSeconds, progress: 1, urgent: false }
  const msLeft = Math.max(0, deadline + clockOffset - now)
  const secondsLeft = Math.ceil(msLeft / 1000)
  return {
    secondsLeft,
    progress: Math.min(1, msLeft / (totalSeconds * 1000)),
    // De sista fem sekunderna
    urgent: secondsLeft <= 5,
  }
}
