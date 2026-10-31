import { useEffect, useState } from 'react'
import { Konfetti } from '@/components/Konfetti'
import { Stjarnstank } from '@/components/Stjarnstank'
import { PriceAnswerCard, PriceFact } from '@/components/gissa-priset/PriceAnswerCard'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import { ResultRow, type ResultRowProps } from '@/components/lobby/ResultRow'
import { RoundStanding } from '@/components/lobby/RoundStanding'
import type { RevealViewProps } from '@/components/lobby/types'
import { formatSek } from '@/lib/belopp'
import { pricePoints } from '@/lib/gissa-priset'
import { findPriceItem } from '@/lib/prisdata'
import { differenceText } from '@/lib/skillnad'
import { roundStanding } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

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
  const standing = state.practice ? null : roundStanding(state, me.id)
  const leaderIds = standing?.leaderIds ?? []
  const newLeaderIds = standing?.newLeaderIds ?? []

  // Bäst först. Lika poäng (t.ex. noll) sorteras på hur nära man var, och den som inte svarade hamnar sist.
  const distance = (guess?: number) => (guess === undefined ? Infinity : rulesFor(state.game).distance(guess, result.target))
  const rows = Object.entries(state.players)
    .map(([id, info]) => ({ id, ...info, guess: result.guesses[id], points: result.points[id] ?? 0 }))
    .sort((a, b) => b.points - a.points || distance(a.guess) - distance(b.guess))

  return (
    <Wide>
      <RoundBadge state={state} />

      {/* Priset och poängen först, sedan faktatexten om saken och sist allas gissningar. */}
      <PriceAnswerCard item={item} target={result.target} revealed={revealed} countUp>
        {/* Pricken mitt i ger konfetti och ett stjärnstänk. */}
        {revealed && myPoints === 100 && (
          <>
            <Konfetti />
            <Stjarnstank delay={150} />
          </>
        )}
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

      {revealed && item && <PriceFact item={item} />}

      {revealed && (
        <ul className="space-y-2" aria-label="Allas gissningar">
          {rows.map((row, index) => (
            <ResultRow
              key={row.id}
              index={index}
              name={row.name}
              avatar={row.avatar}
              guess={row.guess === undefined ? undefined : formatSek(row.guess)}
              difference={row.guess === undefined ? undefined : priceDifference(row.guess, result.target)}
              points={row.points}
              total={state.scores[row.id] ?? 0}
              winner={result.winners.includes(row.id)}
              shared={result.winners.length > 1}
              leader={leaderIds.includes(row.id)}
              crownLands={newLeaderIds.includes(row.id)}
            />
          ))}
        </ul>
      )}

      {revealed && <RoundStanding state={state} meId={me.id} />}

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

// "12 % för högt" med en pil uppåt. Fullpoäng räknas som rätt, även om det skiljer några procent.
function priceDifference(guess: number, target: number): ResultRowProps['difference'] {
  const text = differenceText(guess, target)
  if (pricePoints(guess, target) === 100) return { text, direction: 'exact' }
  return { text, direction: guess > target ? 'up' : 'down' }
}
