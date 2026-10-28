import { useEffect, useState } from 'react'
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

  // Skickade jag min gissning medan värden var borta (värdbyte) har den nya värden den inte. Varje gång ett nytt
  // tillstånd kommer och gissningen fortfarande saknas där skickas den igen. Värden ignorerar dubbletter, och
  // det blir inga fler skick än tillstånd, så det kan inte börja snurra.
  useEffect(() => {
    if (sent === null || state.phase !== 'guessing' || state.guesses[myId] !== undefined) return
    onGuess(sent)
  }, [state, sent, myId, onGuess])

  return { locked, inGame, lockIn }
}
