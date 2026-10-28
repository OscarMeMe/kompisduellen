import { useEffect, useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import type { RevealViewProps } from '@/components/lobby/types'
import { MAX_NUMBER, MIN_NUMBER } from '@/lib/narmast'
import { cn } from '@/lib/utils'

export function RevealView({ state, me, isHost, clockOffset, onNext, onPause, onResume }: RevealViewProps) {
  const result = state.lastResult
  const [shownTarget, setShownTarget] = useState<number | null>(null)

  // Liten "rulle"-effekt innan rätt tal visas.
  const target = result?.target
  useEffect(() => {
    if (target === undefined) return
    let ticks = 0
    const timer = setInterval(() => {
      ticks++
      if (ticks >= 12) {
        setShownTarget(target)
        clearInterval(timer)
      } else {
        setShownTarget(Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER)
      }
    }, 70)
    return () => clearInterval(timer)
  }, [target, state.round])

  if (!result) return null
  const rolling = shownTarget !== result.target

  const rows = Object.entries(state.players)
    .map(([id, info]) => {
      const guess = result.guesses[id]
      return {
        id,
        ...info,
        guess,
        diff: guess === undefined ? null : Math.abs(guess - result.target),
        winner: result.winners.includes(id),
      }
    })
    .sort((a, b) => (a.diff ?? Infinity) - (b.diff ?? Infinity))

  const iWon = result.winners.includes(me.id)

  return (
    <Wide>
      <RoundBadge state={state} />

      <div className="rounded-lg border bg-card p-8 text-center shadow-soft">
        <p className="font-semibold text-muted-foreground">Det rätta talet var</p>
        <p className={cn('font-heading text-8xl font-bold tabular-nums', rolling ? 'text-muted-foreground' : 'text-primary')}>
          {shownTarget ?? '?'}
        </p>
        {!rolling && (
          <p className="mt-2 text-lg font-bold">
            {result.winners.length === 0
              ? 'Ingen hann gissa den här gången 😅'
              : iWon
                ? 'Du var närmast! +1 poäng 🎉'
                : result.winners.length > 1
                  ? 'Delad seger!'
                  : `${state.players[result.winners[0]]?.name ?? 'Någon'} var närmast!`}
          </p>
        )}
      </div>

      {!rolling && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-soft-sm animate-pop',
                row.winner ? 'bg-mint-soft font-bold' : 'bg-card',
              )}
            >
              <Emoji emoji={row.avatar} className="text-2xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{row.name}</span>
                <span className="block text-sm font-normal text-muted-foreground">
                  {row.diff === null ? 'Ingen gissning' : `${row.diff} ifrån`}
                </span>
              </span>
              <span className="w-10 text-right font-heading text-xl font-bold tabular-nums">{row.guess ?? '–'}</span>
              <span className="shrink-0 text-right text-sm whitespace-nowrap">
                {row.winner ? '+1 · ' : ''}
                {state.scores[row.id] ?? 0} p
              </span>
            </li>
          ))}
        </ul>
      )}

      <RevealFooter
        state={state}
        isHost={isHost}
        clockOffset={clockOffset}
        onNext={onNext}
        onPause={onPause}
        onResume={onResume}
      />
    </Wide>
  )
}
