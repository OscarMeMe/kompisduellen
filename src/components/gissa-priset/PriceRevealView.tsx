import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import type { RevealViewProps } from '@/components/lobby/types'
import { formatSekShort } from '@/lib/belopp'
import { findPriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

// Nära priset visas procent. Långt ifrån visas "gånger", eftersom t.ex. "100 % för lågt"
// ser ut som noll kronor och "2 400 % för högt" är svårt att greppa.
function percentOff(guess: number, price: number): string {
  const ratio = guess / price
  const times = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: n < 10 ? 1 : 0 })
  if (ratio >= 2) return `${times(ratio)} gånger för högt`
  if (ratio <= 0.5) return `${times(1 / ratio)} gånger för lågt`
  const diff = Math.round((ratio - 1) * 100)
  if (diff === 0) return guess === price ? 'Exakt rätt!' : 'Nästan exakt'
  return diff > 0 ? `${diff} % för högt` : `${Math.abs(diff)} % för lågt`
}

export function PriceRevealView({ state, me, isHost, clockOffset, onNext }: RevealViewProps) {
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
      <div className="rounded-3xl bg-white p-4 text-center shadow-sm sm:p-8">
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl sm:text-5xl">{item?.emoji ?? '🏷️'}</span>
          <span className="min-w-0 text-left">
            <span className="block font-bold text-balance">{item?.name}</span>
            {item && <span className="block text-sm font-semibold text-primary">År {item.year}</span>}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-muted-foreground sm:mt-4">Rätt pris</p>
        <p
          className={cn(
            'text-4xl font-black text-balance transition-all duration-500 sm:text-6xl',
            revealed ? 'text-primary' : 'scale-90 text-muted-foreground blur-md select-none',
          )}
        >
          {formatSekShort(result.target)}
        </p>
        {revealed && (
          <p className="mt-2 text-lg font-bold sm:mt-4">
            {myPoints === undefined
              ? 'Du hann inte gissa den här gången'
              : myPoints === 100
                ? 'Pricken mitt i! +100 poäng 🎉'
                : `Du fick ${myPoints} poäng`}
          </p>
        )}
      </div>

      {revealed && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm animate-in fade-in slide-in-from-bottom-2',
                row.winner ? 'bg-amber-100 font-bold' : 'bg-white',
              )}
            >
              <span className="text-2xl">{row.avatar}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{row.name}</span>
                <span className="block text-sm font-normal text-muted-foreground">
                  {row.guess === undefined
                    ? 'Ingen gissning'
                    : `${formatSekShort(row.guess)} · ${percentOff(row.guess, result.target)}`}
                </span>
              </span>
              <span className="shrink-0 text-right whitespace-nowrap">
                <span className="block text-xl font-black tabular-nums">+{row.points}</span>
                <span className="block text-sm font-normal text-muted-foreground">{state.scores[row.id] ?? 0} totalt</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {revealed && item && (
        <p className="rounded-3xl bg-white p-4 text-sm text-muted-foreground shadow-sm animate-in fade-in sm:p-6 sm:text-base">
          {item.fact}{' '}
          <a
            href={item.source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
          >
            Källa <ExternalLink className="size-3.5" />
          </a>
        </p>
      )}

      <RevealFooter
        state={state}
        isHost={isHost}
        clockOffset={clockOffset}
        onNext={onNext}
        nextLabel="Nästa sak kommer strax"
      />
    </Wide>
  )
}
