import { Loader2 } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { Button } from '@/components/ui/button'
import { autoAdvanceFor, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

type RevealFooterProps = {
  state: GameState
  isHost: boolean
  clockOffset: number
  onNext: (round: number) => void
  // Texten när det finns fler rundor kvar, t.ex. "Nästa runda startar strax".
  nextLabel: string
}

// Efter facit. Automatiskt: nedräkning till nästa runda (eller prispallen) och en knapp så att
// värden kan hoppa fram. Värden går vidare: facit står kvar tills värden klickar.
export function RevealFooter({ state, isHost, clockOffset, onNext, nextLabel }: RevealFooterProps) {
  const isLast = state.round >= state.rounds
  const auto = autoAdvanceFor(state)

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5 shadow-soft">
      {auto ? (
        <p className="text-center text-sm font-semibold text-muted-foreground">
          {isLast ? 'Prispallen kommer strax' : nextLabel}
        </p>
      ) : (
        !isHost && (
          <p role="status" className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {isLast ? 'Väntar på att värden visar prispallen…' : 'Väntar på att värden startar nästa runda…'}
          </p>
        )
      )}
      {auto && state.deadline !== null && (
        <Countdown deadline={state.deadline} clockOffset={clockOffset} totalSeconds={rulesFor(state.game).revealSeconds} />
      )}
      {isHost && (
        <Button
          variant={auto ? 'outline' : 'default'}
          size="lg"
          className="w-full"
          onClick={() => onNext(state.round)}
        >
          {auto ? (isLast ? 'Visa prispallen nu' : 'Nästa runda nu') : isLast ? 'Visa prispallen' : 'Nästa runda'}
        </Button>
      )}
    </div>
  )
}
