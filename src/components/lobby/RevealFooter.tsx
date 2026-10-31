import { Loader2, Pause, Play } from 'lucide-react'
import { ThrowBar } from '@/components/lobby/Kast'
import { ReactionBar } from '@/components/lobby/Reactions'
import { useCountdown } from '@/hooks/useCountdown'
import { Button } from '@/components/ui/button'
import { autoAdvanceFor, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

type RevealFooterProps = {
  state: GameState
  isHost: boolean
  clockOffset: number
  onNext: (round: number) => void
  // Pausa och fortsätta nedräkningen (bara gissningsspelen). Utan dem visas inga pausknappar.
  onPause?: (round: number) => void
  onResume?: (round: number) => void
  // Visningens hela tid, om spelet inte har revealSeconds i spelregler.ts (t.ex. kortspelen).
  totalSeconds?: number
}

// Efter facit. Automatiskt: nedräkning till nästa runda (eller prispallen) och en knapp så att
// värden kan hoppa fram. Värden går vidare: facit står kvar tills värden klickar.
export function RevealFooter({ state, isHost, clockOffset, onNext, onPause, onResume, totalSeconds }: RevealFooterProps) {
  const isLast = state.round >= state.rounds
  const auto = autoAdvanceFor(state)
  const total = totalSeconds ?? rulesFor(state.game).revealSeconds
  const counted = useCountdown(state.deadline, clockOffset, total)
  // Pausad: nedräkningen står still på tiden som var kvar.
  const paused = state.pause
  const secondsLeft = paused ? Math.ceil(paused.msLeft / 1000) : counted.secondsLeft
  const progress = paused ? Math.min(1, paused.msLeft / (total * 1000)) : counted.progress
  const canPause = auto && isHost && onPause !== undefined && onResume !== undefined

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 shadow-soft-sm">
      {auto && (state.deadline !== null || paused) && (
        <div className="space-y-2">
          <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
            {paused
              ? `${isHost ? 'Du har' : `${paused.by} har`} pausat · ${secondsLeft} s kvar`
              : isLast
                ? `Resultatet visas om ${secondsLeft} s`
                : `Runda ${state.round + 1} börjar om ${secondsLeft} s`}
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
        <div className="flex gap-2">
          {canPause && (
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => (paused ? onResume(state.round) : onPause(state.round))}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {paused ? 'Fortsätt' : 'Pausa'}
            </Button>
          )}
          <Button
            variant={auto ? 'outline' : 'default'}
            size={auto ? 'default' : 'lg'}
            className={auto ? 'h-11 flex-1' : 'flex-1'}
            onClick={() => onNext(state.round)}
          >
            {auto ? (isLast ? 'Resultatet nu' : 'Nästa nu') : isLast ? 'Visa resultatet' : 'Nästa runda'}
          </Button>
        </div>
      )}
      <ReactionBar />
      <ThrowBar />
    </div>
  )
}
