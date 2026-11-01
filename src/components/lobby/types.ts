import type { OnlinePlayer } from '@/hooks/useLobby'
import type { ImposterMove, MyImposterCard } from '@/lib/imposterjakten'
import type { CardMove, MyHand } from '@/lib/kort'
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
  // Värden pausar och fortsätter nedräkningen efter facit.
  onPause: (round: number) => void
  onResume: (round: number) => void
}

// Kortspelen har en vy för hela rundan (frågekort, välja kort, domaren väljer, avslöja).
export type CardViewProps = {
  state: GameState
  me: Player
  online: OnlinePlayer[]
  isHost: boolean
  clockOffset: number
  // Min hand, som bara jag får. null om jag inte har fått några kort (än).
  hand: MyHand | null
  onMove: (move: CardMove) => void
  // Värden går vidare från avslöjandet. round = rundan som visades.
  onNext: (round: number) => void
}

// Imposterjakten har en vy för hela omgången (kortet, ledtrådsvarven och det som kommer efter).
export type ImposterViewProps = {
  state: GameState
  me: Player
  online: OnlinePlayer[]
  isHost: boolean
  clockOffset: number
  // Mitt kort, som bara jag får. null innan det har kommit.
  imposterCard: MyImposterCard | null
  onMove: (move: ImposterMove) => void
  // Värdens knappar: Starta ändå, Nästa (när någon glömt Klar), Nytt ord, Nästa omgång och Avbryt omgången.
  onStartAnyway: () => void
  onSkipTurn: () => void
  onNewWord: () => void
  onNextRound: () => void
  onAbortRound: () => void
  // Vem som skriver på sitt ord just nu (bara den som har tur), och att jag skriver (skickas högst varannan sekund).
  typing: string | null
  onTyping: () => void
}
