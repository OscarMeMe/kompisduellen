import { Check, Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { useCountdown } from '@/hooks/useCountdown'
import type { OnlinePlayer } from '@/hooks/useLobby'
import type { GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

type GuessStatusListProps = {
  state: GameState
  online: OnlinePlayer[]
  clockOffset: number
  meId: string
  // Min inlåsta gissning. Räknas som svar direkt, innan värden hunnit skicka ut den.
  locked: number | null
}

// Statusraden under gissningsrutan ("⏱ 12 s kvar · 3/4 har svarat") och vilka i matchen som har gissat.
// Räknar samma spelare som värden gör när den avgör om alla har svarat: de i matchen som är online.
export function GuessStatusList({ state, online, clockOffset, meId, locked }: GuessStatusListProps) {
  const { secondsLeft } = useCountdown(state.deadline, clockOffset, rulesFor(state.game).guessSeconds)
  const activePlayers = online.filter((p) => state.players[p.id])
  const hasAnswered = (id: string) => state.guesses[id] !== undefined || (id === meId && locked !== null)
  const answered = activePlayers.filter((p) => hasAnswered(p.id)).length

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
        {state.deadline !== null && `⏱ ${secondsLeft} s kvar · `}
        {answered}/{activePlayers.length} har svarat
      </p>
      <ul className="flex flex-wrap justify-center gap-1.5">
        {activePlayers.map((p) => {
          const done = hasAnswered(p.id)
          return (
            <li
              key={p.id}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                done ? 'bg-mint-soft text-accent-foreground' : 'bg-card text-muted-foreground',
              )}
            >
              <Emoji emoji={p.avatar} className="text-sm" />
              {p.name}
              {done ? (
                <Check className="size-3.5" aria-label="Har svarat" />
              ) : (
                <Loader2 className="size-3.5 animate-spin" aria-label="Har inte svarat" />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
