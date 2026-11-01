import { useEffect, useState } from 'react'
import { guessDelivery, RESEND_MAX_TRIES, RESEND_MS } from '@/lib/leverans'
import type { GameState } from '@/lib/match'

// Min gissning i rundan. Den räknas som inlåst direkt när den skickas, innan värden har bekräftat den.
// Vyn får en ny key varje runda, så allt börjar om inför nästa fråga.
export function useMyGuess(state: GameState, myId: string, onGuess: (value: number) => void) {
  const [sent, setSent] = useState<number | null>(null)
  // Hur många gånger gissningen skickats igen. Över gränsen har försöken tagit slut, och spelaren får försöka igen.
  const [tries, setTries] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const locked = state.guesses[myId] ?? sent
  const inGame = Boolean(state.players[myId])

  function lockIn(value: number) {
    if (locked !== null) return
    setSent(value)
    onGuess(value)
  }

  // Skickade jag min gissning medan värden var borta (värdbyte), eller försvann meddelandet på vägen, har värden den
  // inte. Då skickas den igen var tredje sekund tills den syns i tillståndet, högst RESEND_MAX_TRIES gånger.
  // Värden ignorerar dubbletter.
  const missing = sent !== null && state.phase === 'guessing' && state.guesses[myId] === undefined
  useEffect(() => {
    if (!missing) return
    let count = 0
    const timer = setInterval(() => {
      count += 1
      setTries(count)
      if (count > RESEND_MAX_TRIES) clearInterval(timer)
      else onGuess(sent)
    }, RESEND_MS)
    return () => clearInterval(timer)
  }, [missing, sent, onGuess, attempt])

  // Tryck igen: skickas direkt, och försöken börjar om.
  function retry() {
    if (sent === null) return
    setTries(1)
    setAttempt((n) => n + 1)
    onGuess(sent)
  }

  return { locked, inGame, lockIn, delivery: guessDelivery({ missing, tries }), retry }
}
