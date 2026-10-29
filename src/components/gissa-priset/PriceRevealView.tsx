import { Crown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { PriceAnswerCard, PriceFact } from '@/components/gissa-priset/PriceAnswerCard'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import { RoundStanding } from '@/components/lobby/RoundStanding'
import type { RevealViewProps } from '@/components/lobby/types'
import { formatSek } from '@/lib/belopp'
import { findPriceItem } from '@/lib/prisdata'
import { differenceText } from '@/lib/skillnad'
import { roundStanding } from '@/lib/match'
import { cn } from '@/lib/utils'

export function PriceRevealView({ state, me, isHost, clockOffset, onNext, onPause, onResume }: RevealViewProps) {
  const result = state.lastResult
  const item = findPriceItem(result?.itemId)
  const [revealed, setRevealed] = useState(false)

  // Kort paus innan priset visas, för spänningens skull. Vyn får en ny key varje runda.
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (!result) return null
  const myPoints = result.points[me.id]
  // Matchledaren får en krona, så att den syns skild från rundans vinnare (grön).
  const leaderIds = state.practice ? [] : (roundStanding(state, me.id)?.leaderIds ?? [])

  const rows = Object.entries(state.players)
    .map(([id, info]) => ({
      id,
      ...info,
      guess: result.guesses[id],
      points: result.points[id] ?? 0,
      winner: result.winners.includes(id),
    }))
    .sort((a, b) => b.points - a.points || (a.guess === undefined ? 1 : 0) - (b.guess === undefined ? 1 : 0))

  return (
    <Wide>
      <RoundBadge state={state} />

      {/* Priset och poängen först, sedan resultatlistan och sist faktatexten, så att det viktigaste syns direkt på mobilen. */}
      <PriceAnswerCard item={item} target={result.target} revealed={revealed}>
        {revealed && (
          <p className="mt-3 inline-block rounded-full bg-mint-soft px-5 py-2 font-heading text-xl font-bold sm:mt-5 sm:text-3xl">
            {myPoints === undefined
              ? 'Du hann inte gissa den här gången'
              : myPoints === 100
                ? 'Pricken mitt i! +100 poäng'
                : `Du fick ${myPoints} poäng`}
          </p>
        )}
      </PriceAnswerCard>

      {revealed && (
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
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{row.name}</span>
                  {leaderIds.includes(row.id) && (
                    <Crown className="size-4 shrink-0 text-amber-500" aria-label="Leder matchen" />
                  )}
                </span>
                <span className="block text-sm font-normal text-muted-foreground">
                  {row.guess === undefined
                    ? 'Ingen gissning'
                    : `${formatSek(row.guess)} · ${differenceText(row.guess, result.target)}`}
                </span>
              </span>
              <span className="shrink-0 text-right whitespace-nowrap">
                <span className="block font-heading text-xl font-bold tabular-nums">+{row.points}</span>
                <span className="block text-sm font-normal text-muted-foreground">{state.scores[row.id] ?? 0} totalt</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {revealed && <RoundStanding state={state} meId={me.id} />}

      {revealed && item && <PriceFact item={item} />}

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
