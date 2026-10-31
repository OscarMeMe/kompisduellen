import { Check, Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { ThrowTarget } from '@/components/lobby/Kast'
import { useCountdown } from '@/hooks/useCountdown'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { guessSecondsFor, type GameState } from '@/lib/match'
import type { TimeWarning } from '@/lib/tidvarning'
import { cn } from '@/lib/utils'

type GuessStatusListProps = {
  state: GameState
  online: OnlinePlayer[]
  clockOffset: number
  meId: string
  // Min inlåsta gissning. Räknas som svar direkt, innan värden hunnit skicka ut den.
  locked: number | null
  // Från useTimeWarning. Sekunderna blir fetare vid varning och hoppar till vid varje tick när det är kritiskt.
  warning?: TimeWarning
}

function useAnswerStatus({ state, online, clockOffset, meId, locked }: GuessStatusListProps) {
  const { secondsLeft } = useCountdown(state.deadline, clockOffset, guessSecondsFor(state))
  const activePlayers = online.filter((p) => state.players[p.id])
  const hasAnswered = (id: string) => state.guesses[id] !== undefined || (id === meId && locked !== null)
  const answered = activePlayers.filter((p) => hasAnswered(p.id)).length
  return { secondsLeft, activePlayers, hasAnswered, answered }
}

// Statusraden ("⏱ 12 s kvar · 3/4 har svarat"). Räknar samma spelare som värden gör när den avgör om alla
// har svarat: de i matchen som är online.
export function GuessStatusLine(props: GuessStatusListProps) {
  const { secondsLeft, activePlayers, answered } = useAnswerStatus(props)
  return (
    <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
      {props.state.deadline !== null && (
        <>
          {'⏱ '}
          <span
            key={props.warning === 'kritisk' ? secondsLeft : 'lugnt'}
            className={cn(
              'inline-block',
              props.warning && props.warning !== 'normal' && 'font-bold text-foreground',
              props.warning === 'kritisk' && 'motion-safe:animate-hop',
            )}
          >
            {secondsLeft}
          </span>
          {' s kvar · '}
        </>
      )}
      {answered}/{activePlayers.length} har svarat
    </p>
  )
}

// Statusraden och vilka i matchen som har gissat. Med hideLine visas bara spelarna (när raden ligger i AnswerDock).
export function GuessStatusList({ hideLine = false, ...props }: GuessStatusListProps & { hideLine?: boolean }) {
  const { activePlayers, hasAnswered } = useAnswerStatus(props)

  return (
    <div className="space-y-3">
      {!hideLine && <GuessStatusLine {...props} />}
      <ul className="flex flex-wrap justify-center gap-1.5">
        {activePlayers.map((p) => {
          const done = hasAnswered(p.id)
          return (
            <li key={`${p.id}-${done}`} className={cn('flex', done && 'motion-safe:animate-pop')}>
              {/* Går det att kasta på spelaren är chipet en knapp som öppnar kastmenyn. */}
              <ThrowTarget
                player={p}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                  done ? 'bg-mint-soft text-accent-foreground' : 'bg-card text-muted-foreground',
                )}
              >
              <Emoji emoji={p.avatar} className="text-sm" />
              {p.name}
              {/* Bocken poppar fram när spelaren har svarat. */}
              {done ? (
                <Check className="size-3.5 motion-safe:animate-pop" aria-label="Har svarat" />
              ) : (
                <Loader2 className="size-3.5 animate-spin" aria-label="Har inte svarat" />
              )}
              </ThrowTarget>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
