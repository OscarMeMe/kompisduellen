import type { OnlinePlayer } from '@/hooks/useLobby'
import type { GameState } from '@/lib/match'
import type { Player } from '@/lib/player'

// Varje spel har en vy för att gissa och en för att visa svaret, med samma props.

export type GuessingViewProps = {
  state: GameState
  me: Player
  online: OnlinePlayer[]
  clockOffset: number
  onGuess: (value: number) => void
}

export type RevealViewProps = {
  state: GameState
  me: Player
  isHost: boolean
  clockOffset: number
  // Värden går vidare från facit. round = rundan som visades, så att ett dubbelklick inte hoppar över en runda.
  onNext: (round: number) => void
}
