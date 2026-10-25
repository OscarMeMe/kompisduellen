import { Check, Loader2 } from 'lucide-react'
import type { OnlinePlayer } from '@/hooks/useLobby'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Vilka i matchen som har gissat i rundan.
export function GuessStatusList({ state, online }: { state: GameState; online: OnlinePlayer[] }) {
  const activePlayers = online.filter((p) => state.players[p.id])

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {activePlayers.map((p) => {
        const done = state.guesses[p.id] !== undefined
        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors',
              done ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-muted-foreground',
            )}
          >
            <span className="text-lg">{p.avatar}</span>
            {p.name}
            {done ? <Check className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
          </li>
        )
      })}
    </ul>
  )
}
