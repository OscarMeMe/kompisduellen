import type { RankedPlayer } from '@/lib/match'
import { cn } from '@/lib/utils'

const STEP_STYLES: Record<number, { height: string; color: string; medal: string }> = {
  1: { height: 'h-40 sm:h-48', color: 'bg-amber-300', medal: '🥇' },
  2: { height: 'h-28 sm:h-36', color: 'bg-slate-200', medal: '🥈' },
  3: { height: 'h-20 sm:h-24', color: 'bg-orange-200', medal: '🥉' },
}

function points(score: number) {
  return score === 1 ? '1 poäng' : `${score} poäng`
}

// Prispall för topp tre. Lika poäng delar placering.
export function Podium({ players }: { players: RankedPlayer[] }) {
  const onPodium = players.filter((p) => p.place <= 3)
  const rest = players.filter((p) => p.place > 3)

  // Pallen visas i ordningen 2 – 1 – 3. Flera spelare på samma plats står bredvid varandra.
  const columns = [2, 1, 3]
    .map((place) => ({ place, players: onPodium.filter((p) => p.place === place) }))
    .filter((column) => column.players.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {columns.map(({ place, players: here }) => {
          const style = STEP_STYLES[place]
          return (
            <div key={place} className="flex min-w-24 flex-1 flex-col items-center sm:max-w-48">
              <div className="mb-2 flex flex-wrap justify-center gap-2">
                {here.map((p) => (
                  <div key={p.id} className="flex flex-col items-center text-center">
                    <span className={cn('text-4xl sm:text-5xl', place === 1 && 'animate-bounce')}>{p.avatar}</span>
                    <span className="max-w-28 truncate font-bold">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{points(p.score)}</span>
                  </div>
                ))}
              </div>
              <div
                className={cn(
                  'flex w-full items-start justify-center rounded-t-2xl pt-3 text-3xl font-black shadow-inner',
                  style.height,
                  style.color,
                )}
              >
                {style.medal}
              </div>
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <ol className="space-y-2">
          {rest.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <span className="w-8 text-lg font-black text-muted-foreground">{p.place}.</span>
              <span className="text-2xl">{p.avatar}</span>
              <span className="flex-1 truncate font-semibold">{p.name}</span>
              <span className="text-sm text-muted-foreground">{points(p.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
