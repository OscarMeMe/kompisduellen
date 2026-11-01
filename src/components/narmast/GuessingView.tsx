import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { WaitingStanding } from '@/components/lobby/WaitingStanding'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import { SendStatus } from '@/components/lobby/SendStatus'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import type { GuessingViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMyGuess } from '@/hooks/useMyGuess'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import { hasFinePointer } from '@/lib/device'
import { guessSecondsFor, isValidGuess, waitingStanding } from '@/lib/match'
import { MAX_NUMBER, MIN_NUMBER } from '@/lib/narmast'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

export function GuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const [value, setValue] = useState(50)
  const { locked, inGame, lockIn, delivery, retry } = useMyGuess(state, me.id, onGuess)
  const valid = isValidGuess(state.game, value)
  // Tydligare när tiden håller på att ta slut, bara medan jag gissar.
  const { warning, secondsLeft } = useTimeWarning(
    state.deadline,
    clockOffset,
    guessSecondsFor(state),
    locked !== null || !inGame,
    rulesFor(state.game).warningSeconds,
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) lockIn(value)
  }

  return (
    <Wide>
      <TimeWarningFrame warning={warning} secondsLeft={secondsLeft} />
      <SendStatus delivery={delivery} onRetry={retry} />
      <RoundTimer state={state} clockOffset={clockOffset} warning={warning} />

      {/* Svarsdelen. En splatt från ett kast täcker den aldrig. */}
      <div {...SPLAT_SHIELD} className="rounded-lg border bg-card p-6 shadow-soft sm:p-8">
        {!inGame ? (
          <p className="py-8 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : locked !== null ? (
          <div className="space-y-3 py-6 text-center">
            {/* Låset stängs med ett knäpp och gissningen poppar fram när den låses in. */}
            <Lock className="mx-auto size-8 text-primary motion-safe:animate-lock-snap" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="font-heading text-7xl font-bold text-primary motion-safe:animate-pop">{locked}</p>
            <p className="font-semibold text-muted-foreground">Väntar på de andra…</p>
            <WaitingStanding text={waitingStanding(state, me.id)} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-center text-2xl">
              Vilket tal mellan {MIN_NUMBER} och {MAX_NUMBER}?
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-14 text-2xl"
                onClick={() => setValue((v) => Math.max(MIN_NUMBER, v - 1))}
                aria-label="Minska"
              >
                −
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_NUMBER}
                max={MAX_NUMBER}
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => setValue(e.target.valueAsNumber)}
                aria-label="Din gissning"
                className="h-20 w-36 text-center font-heading text-5xl font-bold"
                autoFocus={hasFinePointer()}
              />
              <Button
                type="button"
                variant="outline"
                className="size-14 text-2xl"
                onClick={() => setValue((v) => Math.min(MAX_NUMBER, v + 1))}
                aria-label="Öka"
              >
                +
              </Button>
            </div>
            <input
              type="range"
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              value={Number.isNaN(value) ? 50 : value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="Dra för att välja tal"
              className="w-full accent-primary"
            />
            {/* Vickar till en gång när det blir fem sekunder kvar. */}
            <Button
              type="submit"
              size="lg"
              className={cn('w-full', warning === 'kritisk' && 'motion-safe:animate-wiggle')}
              disabled={!valid}
            >
              Lås svaret
            </Button>
          </form>
        )}
      </div>

      <GuessStatusList state={state} online={online} clockOffset={clockOffset} meId={me.id} locked={locked} warning={warning} />
    </Wide>
  )
}
