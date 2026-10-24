import { Crown } from 'lucide-react'
import type { GameInfo } from '@/lib/games'
import type { RankedEntry } from '@/lib/narmast'
import { cn } from '@/lib/utils'

type LeaderboardProps = {
  game: GameInfo
  entries: RankedEntry[]
  matchesPlayed: number
  // Poäng från matchen som precis tog slut, visas som "+3" bredvid totalen.
  lastScores?: Record<string, number>
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

// Lobbyns topplista. Poängen läggs ihop för varje avslutad match så länge lobbyn finns.
export function Leaderboard({ game, entries, matchesPlayed, lastScores }: LeaderboardProps) {
  if (matchesPlayed === 0 || entries.length === 0) return null

  return (
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', game.color)}>
          <game.icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-violet-900">Topplista</h2>
          <p className="text-sm text-muted-foreground">
            {game.name} · {count(matchesPlayed, 'match spelad', 'matcher spelade')}
          </p>
        </div>
      </div>

      <ol className="space-y-2">
        {entries.map((entry) => {
          const leader = entry.place === 1 && entry.points > 0
          const added = lastScores?.[entry.id]
          return (
            <li
              key={entry.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3',
                leader ? 'bg-amber-100' : 'bg-violet-50',
              )}
            >
              <span className="w-6 text-lg font-black text-muted-foreground">{entry.place}</span>
              <span className="text-2xl">{entry.avatar}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{entry.name}</span>
                  {leader && <Crown className="size-4 shrink-0 text-amber-500" aria-label="Leder" />}
                </span>
                <span className="block text-sm text-muted-foreground">{count(entry.wins, 'vinst', 'vinster')}</span>
              </span>
              {added !== undefined && added > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-bold text-emerald-800">
                  +{added}
                </span>
              )}
              <span className="text-right text-xl font-black text-primary tabular-nums">
                {entry.points}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">p</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
