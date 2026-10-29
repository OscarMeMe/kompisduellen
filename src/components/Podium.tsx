import type { CSSProperties } from 'react'
import { Emoji } from '@/components/Emoji'
import { podiumShare, type RankedPlayer } from '@/lib/match'
import { cn } from '@/lib/utils'

const STEP_STYLES: Record<number, { color: string; medal: string }> = {
  1: { color: 'bg-sun', medal: '🥇' },
  2: { color: 'bg-sky', medal: '🥈' },
  3: { color: 'bg-coral-soft', medal: '🥉' },
}

function points(score: number) {
  return score === 1 ? '1 poäng' : `${score} poäng`
}

// Prispall för topp tre. Lika poäng delar placering.
export function Podium({ players }: { players: RankedPlayer[] }) {
  const onPodium = players.filter((p) => p.place <= 3)
  const rest = players.filter((p) => p.place > 3)
  const best = Math.max(0, ...players.map((p) => p.score))

  // Pallen visas i ordningen 2 – 1 – 3. Flera spelare på samma plats står bredvid varandra.
  const columns = [2, 1, 3]
    .map((place) => ({ place, players: onPodium.filter((p) => p.place === place) }))
    .filter((column) => column.players.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {columns.map(({ place, players: here }) => {
          const style = STEP_STYLES[place]
          // Stapeln följer poängen: minsta höjden räcker för medaljen, resten delas efter andelen av vinnarens poäng.
          const share = podiumShare(here[0].score, best)
          return (
            <div key={place} className="flex min-w-24 flex-1 flex-col items-center sm:max-w-48">
              <div className="mb-2 flex flex-wrap justify-center gap-2">
                {here.map((p) => (
                  <div key={p.id} className="flex flex-col items-center text-center">
                    <Emoji emoji={p.avatar} className={cn('text-4xl sm:text-5xl', place === 1 && 'animate-bounce')} />
                    <span className="max-w-28 truncate font-bold">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{points(p.score)}</span>
                  </div>
                ))}
              </div>
              <div
                className={cn(
                  'flex h-[calc(4rem+6rem*var(--share))] w-full items-start justify-center rounded-t-lg pt-3 text-3xl shadow-soft-sm sm:h-[calc(4rem+8rem*var(--share))]',
                  style.color,
                )}
                style={{ '--share': share } as CSSProperties}
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
            <li key={p.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft-sm">
              <span className="w-8 font-heading text-lg font-bold text-muted-foreground">{p.place}.</span>
              <Emoji emoji={p.avatar} className="text-2xl" />
              <span className="flex-1 truncate font-semibold">{p.name}</span>
              <span className="text-sm text-muted-foreground">{points(p.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
