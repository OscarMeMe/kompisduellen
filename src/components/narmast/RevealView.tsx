import { useEffect, useState } from 'react'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { LostMoveLine } from '@/components/lobby/LostMoveLine'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import { ResultRow, type ResultRowProps } from '@/components/lobby/ResultRow'
import { RoundStanding } from '@/components/lobby/RoundStanding'
import type { RevealViewProps } from '@/components/lobby/types'
import { MAX_NUMBER, MIN_NUMBER } from '@/lib/narmast'
import { roundStanding } from '@/lib/match'
import { cn } from '@/lib/utils'

export function RevealView({ state, me, isHost, clockOffset, lostMove, onNext, onPause, onResume }: RevealViewProps) {
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
  // Matchledaren får en krona, så att den syns skild från rundans vinnare (grön).
  const standing = state.practice ? null : roundStanding(state, me.id)
  const leaderIds = standing?.leaderIds ?? []
  const newLeaderIds = standing?.newLeaderIds ?? []

  // Närmast först, den som inte svarade sist.
  const rows = Object.entries(state.players)
    .map(([id, info]) => ({ id, ...info, guess: result.guesses[id] }))
    .sort((a, b) => distance(a.guess, result.target) - distance(b.guess, result.target))

  const iWon = result.winners.includes(me.id)

  return (
    <Wide>
      <RoundBadge state={state} />
      <LostMoveLine text={lostMove} />

      <div className="rounded-lg border bg-card p-8 text-center shadow-soft">
        <p className="font-semibold text-muted-foreground">Det rätta talet var</p>
        <p className={cn('font-heading text-8xl font-bold tabular-nums', rolling ? 'text-muted-foreground' : 'text-primary')}>
          {shownTarget ?? '?'}
        </p>
        {!rolling && (
          <p className="mt-2 text-lg font-bold">
            {result.winners.length === 0
              ? 'Ingen hann gissa den här gången'
              : result.winners.length > 1
                ? iWon
                  ? 'Delad etta! +1 poäng'
                  : 'Delad etta! Flera var lika nära.'
                : iWon
                  ? 'Du var närmast! +1 poäng'
                  : `${state.players[result.winners[0]]?.name ?? 'Någon'} var närmast!`}
          </p>
        )}
      </div>

      {!rolling && (
        <ul className="space-y-2" aria-label="Allas gissningar">
          {rows.map((row, index) => (
            <ResultRow
              key={row.id}
              index={index}
              name={row.name}
              avatar={row.avatar}
              guess={row.guess === undefined ? undefined : String(row.guess)}
              difference={row.guess === undefined ? undefined : numberDifference(row.guess, result.target)}
              points={result.points[row.id] ?? 0}
              total={state.scores[row.id] ?? 0}
              winner={result.winners.includes(row.id)}
              shared={result.winners.length > 1}
              leader={leaderIds.includes(row.id)}
              crownLands={newLeaderIds.includes(row.id)}
            />
          ))}
        </ul>
      )}

      {!rolling && <RoundStanding state={state} meId={me.id} />}

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

function distance(guess: number | undefined, target: number) {
  return guess === undefined ? Infinity : Math.abs(guess - target)
}

// "8 för lågt" med en pil nedåt, eller "Exakt rätt!".
function numberDifference(guess: number, target: number): ResultRowProps['difference'] {
  const diff = guess - target
  if (diff === 0) return { text: 'Exakt rätt!', direction: 'exact' }
  return { text: `${Math.abs(diff)} för ${diff > 0 ? 'högt' : 'lågt'}`, direction: diff > 0 ? 'up' : 'down' }
}
