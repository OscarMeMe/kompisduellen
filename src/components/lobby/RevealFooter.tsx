import { Loader2 } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { Button } from '@/components/ui/button'
import { autoAdvanceFor, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

type RevealFooterProps = {
  state: GameState
  isHost: boolean
  clockOffset: number
  onNext: (round: number) => void
  // Visningens hela tid, om spelet inte har revealSeconds i spelregler.ts (t.ex. kortspelen).
  totalSeconds?: number
}

// Efter facit. Automatiskt: nedräkning till nästa runda (eller prispallen) och en knapp så att
// värden kan hoppa fram. Värden går vidare: facit står kvar tills värden klickar.
export function RevealFooter({ state, isHost, clockOffset, onNext, totalSeconds }: RevealFooterProps) {
  const isLast = state.round >= state.rounds
  const auto = autoAdvanceFor(state)
  const total = totalSeconds ?? rulesFor(state.game).revealSeconds
  const { secondsLeft, progress } = useCountdown(state.deadline, clockOffset, total)

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5 shadow-soft">
      {auto && state.deadline !== null && (
        <div className="space-y-2">
          <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
            {isLast ? `Resultatet visas om ${secondsLeft} s` : `Runda ${state.round + 1} börjar om ${secondsLeft} s`}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-mint transition-[width] duration-200 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
      {!auto && !isHost && (
        <p role="status" className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {isLast ? 'Väntar på att värden visar resultatet…' : 'Väntar på att värden startar nästa runda…'}
        </p>
      )}
      {isHost && (
        <Button
          variant={auto ? 'outline' : 'default'}
          size="lg"
          className="w-full"
          onClick={() => onNext(state.round)}
        >
          {auto ? (isLast ? 'Visa resultatet nu' : 'Nästa runda nu') : isLast ? 'Visa resultatet' : 'Nästa runda'}
        </Button>
      )}
    </div>
  )
}
