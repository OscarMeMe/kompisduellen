import { Check, Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { useCountdown } from '@/hooks/useCountdown'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { kortkaosRules } from '@/lib/kortkaos'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

type PlayerStatusProps = {
  state: GameState
  online: OnlinePlayer[]
  clockOffset: number
}

// Statusraden medan alla väljer kort ("⏱ 12 s kvar · 2/3 har valt") och vilka som har valt.
// Visar bara att någon har valt, aldrig vilket kort.
export function PlayerStatus({ state, online, clockOffset }: PlayerStatusProps) {
  const table = state.cards!
  const { secondsLeft } = useCountdown(state.deadline, clockOffset, kortkaosRules.seconds.choosing)
  const players = online.filter((p) => state.players[p.id] && p.id !== table.judge)
  const chosen = players.filter((p) => table.chosen.includes(p.id)).length

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums">
        {state.deadline !== null && `⏱ ${secondsLeft} s kvar · `}
        {chosen}/{players.length} har valt
      </p>
      <ul className="flex flex-wrap justify-center gap-1.5">
        {players.map((p) => {
          const done = table.done.includes(p.id)
          const hasChosen = table.chosen.includes(p.id)
          return (
            <li
              key={p.id}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                done ? 'bg-mint-soft text-accent-foreground' : hasChosen ? 'bg-sky-soft' : 'bg-card text-muted-foreground',
              )}
            >
              <Emoji emoji={p.avatar} className="text-sm" />
              {p.name}
              {done ? (
                <Check className="size-3.5" aria-label="Klar" />
              ) : hasChosen ? (
                <span className="sr-only">Har valt ett kort</span>
              ) : (
                <Loader2 className="size-3.5 animate-spin" aria-label="Väljer" />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
