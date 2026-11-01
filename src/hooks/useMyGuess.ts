import { useEffect, useState } from 'react'
import type { GameState } from '@/lib/match'

const GUESS_RESEND_MS = 3000

// Min gissning i rundan. Den räknas som inlåst direkt när den skickas, innan värden har bekräftat den.
// Vyn får en ny key varje runda, så allt börjar om inför nästa fråga.
export function useMyGuess(state: GameState, myId: string, onGuess: (value: number) => void) {
  const [sent, setSent] = useState<number | null>(null)
  const locked = state.guesses[myId] ?? sent
  const inGame = Boolean(state.players[myId])

  function lockIn(value: number) {
    if (locked !== null) return
    setSent(value)
    onGuess(value)
  }

  // Skickade jag min gissning medan värden var borta (värdbyte), eller försvann meddelandet på vägen, har värden den
  // inte. Då skickas den igen när ett nytt tillstånd kommer och var tredje sekund tills den syns i tillståndet.
  // Värden ignorerar dubbletter.
  const missing = sent !== null && state.phase === 'guessing' && state.guesses[myId] === undefined
  useEffect(() => {
    if (!missing) return
    onGuess(sent)
    const timer = setInterval(() => onGuess(sent), GUESS_RESEND_MS)
    return () => clearInterval(timer)
  }, [state, missing, sent, onGuess])

  return { locked, inGame, lockIn }
}
