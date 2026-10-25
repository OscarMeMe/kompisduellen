import { Crown, Trophy } from 'lucide-react'
import { findGame } from '@/lib/games'
import type { RankedEntry } from '@/lib/match'
import { cn } from '@/lib/utils'

type LeaderboardProps = {
  entries: RankedEntry[]
  matchesPlayed: number
  // Antal spelade matcher per spel, t.ex. { narmast: 2, 'gissa-priset': 1 }.
  gamesPlayed: Record<string, number>
  // Vinnarna av matchen som precis tog slut, visas som "+1 vinst".
  lastWinners?: string[]
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

// Lobbyns topplista. Räknar vunna matcher i alla spel så länge lobbyn finns.
export function Leaderboard({ entries, matchesPlayed, gamesPlayed, lastWinners }: LeaderboardProps) {
  if (matchesPlayed === 0 || entries.length === 0) return null

  const games = Object.entries(gamesPlayed)
    .map(([id, n]) => `${findGame(id)?.name ?? id} ${n}`)
    .join(' · ')

  return (
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-950">
          <Trophy className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-violet-900">Topplista</h2>
          <p className="text-sm text-muted-foreground">
            {count(matchesPlayed, 'match spelad', 'matcher spelade')} i lobbyn
          </p>
          <p className="text-xs text-muted-foreground">{games}</p>
        </div>
      </div>

      <ol className="space-y-2">
        {entries.map((entry) => {
          const leader = entry.place === 1 && entry.wins > 0
          const justWon = lastWinners?.includes(entry.id)
          return (
            <li
              key={entry.id}
              className={cn('flex items-center gap-3 rounded-2xl px-4 py-3', leader ? 'bg-amber-100' : 'bg-violet-50')}
            >
              <span className="w-6 text-lg font-black text-muted-foreground">{entry.place}</span>
              <span className="text-2xl">{entry.avatar}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{entry.name}</span>
                  {leader && <Crown className="size-4 shrink-0 text-amber-500" aria-label="Leder" />}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {count(entry.played, 'match', 'matcher')} spelade
                </span>
              </span>
              {justWon && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-bold whitespace-nowrap text-emerald-800">
                  +1
                </span>
              )}
              <span className="text-right whitespace-nowrap">
                <span className="text-xl font-black text-primary tabular-nums">{entry.wins}</span>
                <span className="ml-1 text-sm font-semibold text-muted-foreground">
                  {entry.wins === 1 ? 'vinst' : 'vinster'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
