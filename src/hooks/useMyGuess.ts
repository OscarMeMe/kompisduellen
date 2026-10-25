import { useState } from 'react'
import type { GameState } from '@/lib/match'

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

  return { locked, inGame, lockIn }
}
