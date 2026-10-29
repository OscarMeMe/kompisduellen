import { ArrowDown, ArrowUp, Crown } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { cn } from '@/lib/utils'

export type ResultRowProps = {
  name: string
  avatar: string
  // Gissningen som den ska visas, t.ex. "1 250 kr". undefined = svarade inte.
  guess?: string
  // Hur långt ifrån, t.ex. "12 % för högt", och åt vilket håll (exact = rätt eller nästan rätt).
  difference?: { text: string; direction: 'up' | 'down' | 'exact' }
  points: number
  total: number
  // Bäst i rundan. shared = flera delar bästa resultatet.
  winner: boolean
  shared: boolean
  // Leder matchen efter rundan.
  leader: boolean
  // Plats i listan. Raderna dyker upp en i taget, uppifrån och ned.
  index?: number
}

// En spelares rad i facit: namn och poäng (rundan och totalt) överst, gissningen stort och hur långt ifrån den var under.
export function ResultRow({ name, avatar, guess, difference, points, total, winner, shared, leader, index = 0 }: ResultRowProps) {
  return (
    <li
      className={cn(
        'rounded-lg border px-4 py-3 shadow-soft-sm animate-pop',
        winner ? 'bg-mint-soft' : 'bg-card',
        guess === undefined && 'text-muted-foreground',
      )}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-center gap-3">
        <Emoji emoji={avatar} className="text-3xl" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-bold">{name}</span>
          {leader && <Crown className="size-4 shrink-0 text-crown" aria-label="Leder matchen" />}
          {winner && (
            <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-xs font-bold whitespace-nowrap text-accent-foreground">
              {shared ? 'Delad etta' : 'Närmast!'}
            </span>
          )}
        </div>
        <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
          <span className="block font-heading text-2xl leading-tight font-bold">+{points}</span>
          <span className="block text-xs text-muted-foreground sm:text-sm">{total} totalt</span>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        {guess === undefined ? (
          <span className="font-semibold">Ingen gissning</span>
        ) : (
          <>
            <span className="font-heading text-2xl font-bold tabular-nums sm:text-3xl">{guess}</span>
            {difference && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap',
                  difference.direction === 'exact' ? 'bg-mint' : 'bg-muted',
                )}
              >
                {difference.direction === 'up' && <ArrowUp className="size-3.5" aria-hidden />}
                {difference.direction === 'down' && <ArrowDown className="size-3.5" aria-hidden />}
                {difference.text}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  )
}
