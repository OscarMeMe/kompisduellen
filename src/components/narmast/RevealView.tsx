import { useEffect, useState } from 'react'
import { Konfetti } from '@/components/Konfetti'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import { LostMoveLine } from '@/components/lobby/LostMoveLine'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import { ResultRow, type ResultRowProps } from '@/components/lobby/ResultRow'
import { RoundStanding } from '@/components/lobby/RoundStanding'
import type { RevealViewProps } from '@/components/lobby/types'
import { Tallinje } from '@/components/narmast/Tallinje'
import { loadSoundOn, playBullseye } from '@/lib/ljud'
import { roundStanding } from '@/lib/match'
import { cn } from '@/lib/utils'

// Så länge markören rullar längs tallinjen (samma tid som animate-tallinje-markor i index.css).
const ROLL_MS = 2000

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Facit i Närmast vinner: tallinjen där allas figurer står vid sina tal och markören rullar fram till rätt tal. När den
// stannat syns talet, vem som vann och allas rader. Exakt träff ger konfetti och ett eget ljud.
export function RevealView({ state, me, isHost, clockOffset, lostMove, onNext, onPause, onResume }: RevealViewProps) {
  const result = state.lastResult
  // Markören har stannat. Med "minska rörelse" direkt.
  const [done, setDone] = useState(reducedMotion)
  useEffect(() => {
    if (done) return
    const timer = setTimeout(() => setDone(true), ROLL_MS)
    return () => clearTimeout(timer)
  }, [done])

  const target = result?.target
  const exact = result ? Object.values(result.guesses).some((guess) => guess === target) : false
  useEffect(() => {
    if (done && exact && loadSoundOn()) playBullseye()
  }, [done, exact])

  if (!result) return null
  // Matchledaren får en krona, så att den syns skild från rundans vinnare (grön).
  const standing = state.practice ? null : roundStanding(state, me.id)
  const leaderIds = standing?.leaderIds ?? []
  const newLeaderIds = standing?.newLeaderIds ?? []

  // Närmast först, den som inte svarade sist.
  const rows = Object.entries(state.players)
    .map(([id, info]) => ({ id, ...info, guess: result.guesses[id] }))
    .sort((a, b) => distance(a.guess, result.target) - distance(b.guess, result.target))
  const linePlayers = rows.flatMap((row) =>
    row.guess === undefined ? [] : [{ id: row.id, name: row.name, avatar: row.avatar, value: row.guess }],
  )
  const scorers = Object.keys(result.points).filter((id) => (result.points[id] ?? 0) > 0)

  const lastRound = state.round >= state.rounds && state.rounds > 1
  const nextIsLast = state.round === state.rounds - 1 && state.rounds > 1

  return (
    <Wide>
      <RoundBadge state={state} />
      <LostMoveLine text={lostMove} />

      <div className="relative rounded-lg border bg-card px-2 pt-5 pb-3 text-center shadow-soft">
        {done && exact && <Konfetti />}
        <p className="font-semibold text-muted-foreground">Det rätta talet var</p>
        <p
          className={cn(
            'font-heading text-7xl font-bold tabular-nums',
            done ? 'text-primary motion-safe:animate-pop' : 'text-muted-foreground',
          )}
        >
          {done ? result.target : '?'}
        </p>
        {done && <p className="mt-1 px-2 text-lg font-bold">{headline(state, me.id, lastRound)}</p>}
        {linePlayers.length > 0 && (
          <Tallinje
            key={`${state.round}-${result.target}`}
            players={linePlayers}
            target={result.target}
            done={done}
            meId={me.id}
            scorers={scorers}
          />
        )}
      </div>

      {done && (
        <ul className="space-y-2 motion-safe:animate-fade" aria-label="Allas gissningar">
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

      {done && <RoundStanding state={state} meId={me.id} />}

      {/* Inför sista rundan, så att alla vet att den är värd mer. */}
      {done && nextIsLast && (
        <p className="rounded-md bg-sun-soft px-4 py-3 text-center font-heading text-lg font-bold motion-safe:animate-pop">
          Nästa runda är den sista. Dubbla poäng!
        </p>
      )}

      <RevealFooter state={state} isHost={isHost} clockOffset={clockOffset} onNext={onNext} onPause={onPause} onResume={onResume} />
    </Wide>
  )
}

// Raden under talet: vem som vann rundan, och mina poäng om det var jag.
function headline(state: RevealViewProps['state'], meId: string, lastRound: boolean): string {
  const result = state.lastResult!
  const mine = result.points[meId] ?? 0
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const double = lastRound ? '. Dubbla poäng!' : ''
  if (Object.keys(result.guesses).length === 0) return 'Ingen hann gissa den här gången'
  const exact = result.winners.filter((id) => result.guesses[id] === result.target)
  if (exact.includes(meId)) return `Pricken mitt i! +${mine} poäng${double}`
  if (exact.length === 1) return `${name(exact[0])} prickade exakt!`
  if (exact.length > 1) return 'Flera prickade exakt!'
  if (result.winners.includes(meId)) return `${result.winners.length > 1 ? 'Delad etta!' : 'Du var närmast!'} +${mine} poäng${double}`
  if (result.winners.length > 1) return 'Delad etta! Flera var lika nära.'
  return `${name(result.winners[0])} var närmast!${mine > 0 ? ` Du fick ${mine} poäng.` : ''}`
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
