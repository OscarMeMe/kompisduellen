import { Countdown } from '@/components/Countdown'
import { Button } from '@/components/ui/button'
import type { GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

type RevealFooterProps = {
  state: GameState
  isHost: boolean
  clockOffset: number
  onNext: () => void
  // Texten när det finns fler rundor kvar, t.ex. "Nästa runda startar strax".
  nextLabel: string
}

// Nedräkning till nästa runda (eller prispallen), och en knapp så att värden kan hoppa fram.
export function RevealFooter({ state, isHost, clockOffset, onNext, nextLabel }: RevealFooterProps) {
  const isLast = state.round >= state.rounds

  return (
    <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-center text-sm font-semibold text-muted-foreground">
        {isLast ? 'Prispallen kommer strax' : nextLabel}
      </p>
      {state.deadline !== null && (
        <Countdown deadline={state.deadline} clockOffset={clockOffset} totalSeconds={rulesFor(state.game).revealSeconds} />
      )}
      {isHost && (
        <Button variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={onNext}>
          {isLast ? 'Visa prispallen nu' : 'Nästa runda nu'}
        </Button>
      )}
    </div>
  )
}
