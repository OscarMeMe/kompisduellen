import { useEffect, useState } from 'react'

// Tid kvar till en deadline enligt värdens klocka. Uppdateras fem gånger i sekunden så länge en klocka går.
// deadline null = ingen klocka går (då är allt kvar).
export function useCountdown(deadline: number | null, clockOffset: number, totalSeconds: number) {
  const [now, setNow] = useState(() => Date.now())

  // Tickar bara när en klocka går. Annars ritas hela vyn om fem gånger i sekunden i onödan (t.ex. Imposterjaktens bord
  // under en hel match, där klockan bara går under nedräkningen).
  useEffect(() => {
    if (deadline === null) return
    const update = () => setNow(Date.now())
    const first = setTimeout(update, 0)
    const timer = setInterval(update, 200)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [deadline])

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
