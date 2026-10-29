import { Crown, Trophy } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { findGame } from '@/lib/games'
import type { RankedEntry } from '@/lib/match'
import { cn } from '@/lib/utils'

type LeaderboardProps = {
  entries: RankedEntry[]
  matchesPlayed: number
  // Antal spelade matcher per spel, t.ex. { narmast: 2, 'gissa-priset': 1 }.
  gamesPlayed: Record<string, number>
  // Vinnarna av matchen som precis tog slut. En vinnare får "Vann senaste", flera får "Oavgjort".
  lastWinners?: string[]
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

// Kvällens ställning i lobbyn (topplistan). Räknar vunna matcher i alla spel så länge lobbyn finns.
export function Leaderboard({ entries, matchesPlayed, gamesPlayed, lastWinners }: LeaderboardProps) {
  if (matchesPlayed === 0 || entries.length === 0) return null

  const games = Object.entries(gamesPlayed).map(([id, n]) => ({ id, label: `${findGame(id)?.name ?? id} ${n}` }))
  const tied = (lastWinners?.length ?? 0) > 1

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-soft sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-sun-soft">
          <Trophy className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl">Kvällens ställning</h2>
          <p className="text-sm font-semibold text-muted-foreground">{count(matchesPlayed, 'match', 'matcher')} i kväll</p>
        </div>
      </div>

      {games.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Matcher per spel">
          {games.map((game) => (
            <li key={game.id} className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
              {game.label}
            </li>
          ))}
        </ul>
      )}

      <ol className="space-y-2">
        {entries.map((entry) => {
          const leader = entry.place === 1 && entry.wins > 0
          const justWon = lastWinners?.includes(entry.id)
          return (
            <li
              key={entry.id}
              className={cn('flex items-center gap-2 rounded-lg px-3 py-3 sm:gap-3 sm:px-4', leader ? 'bg-sun-soft' : 'bg-muted')}
            >
              <span className="w-6 font-heading text-lg font-bold text-muted-foreground">{entry.place}</span>
              <Emoji emoji={entry.avatar} className="text-2xl" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{entry.name}</span>
                  {leader && <Crown className="size-4 shrink-0 text-crown" aria-label="Leder" />}
                </span>
                {justWon && (
                  <span className="mt-0.5 inline-block rounded-full bg-mint px-2 py-0.5 text-xs font-bold whitespace-nowrap text-accent-foreground">
                    {tied ? 'Oavgjort' : 'Vann senaste'}
                  </span>
                )}
              </span>
              <span className="flex items-baseline gap-1.5 text-right whitespace-nowrap">
                <span className="font-heading text-4xl leading-none font-bold text-primary tabular-nums">{entry.wins}</span>
                <span className="text-sm font-semibold text-muted-foreground">{entry.wins === 1 ? 'vinst' : 'vinster'}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
