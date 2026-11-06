import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { AnswerDock } from '@/components/lobby/AnswerDock'
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
import { MAX_NUMBER, MIN_NUMBER, randomTarget } from '@/lib/narmast'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

export function GuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  // Fältet börjar tomt, så att alla gör ett eget val. − och + och reglaget börjar från 50.
  const [value, setValue] = useState<number | null>(null)
  // Ökar vid varje Slumpa åt mig, så att talet poppar fram igen även när det blir samma.
  const [rolls, setRolls] = useState(0)
  const { locked, inGame, lockIn, delivery, retry } = useMyGuess(state, me.id, onGuess)
  const valid = value !== null && isValidGuess(state.game, value)
  const lastRound = state.round >= state.rounds && state.rounds > 1 && !state.practice
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
    if (valid && value !== null) lockIn(value)
  }

  return (
    <Wide>
      <TimeWarningFrame warning={warning} secondsLeft={secondsLeft} />
      <SendStatus delivery={delivery} onRetry={retry} />
      <RoundTimer state={state} clockOffset={clockOffset} warning={warning} />
      {lastRound && (
        <p className="rounded-md bg-sun-soft px-4 py-3 text-center font-heading text-lg font-bold motion-safe:animate-pop">
          Sista rundan. Dubbla poäng!
        </p>
      )}

      {/* Svarsdelen med tiden kvar ovanför, som i Gissa priset. På mobil ligger den fast i nederkant, så att tiden och
          Lås svaret alltid syns. En splatt från ett kast täcker den aldrig. */}
      <AnswerDock state={state} online={online} clockOffset={clockOffset} meId={me.id} locked={locked} warning={warning}>
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
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <h1 className="text-center text-2xl">
              Vilket tal mellan {MIN_NUMBER} och {MAX_NUMBER}?
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-14 text-2xl"
                onClick={() => setValue((v) => Math.max(MIN_NUMBER, (v ?? 51) - 1))}
                aria-label="Minska"
              >
                −
              </Button>
              <Input
                key={rolls}
                type="number"
                inputMode="numeric"
                min={MIN_NUMBER}
                max={MAX_NUMBER}
                placeholder="?"
                value={value === null || Number.isNaN(value) ? '' : value}
                onChange={(e) => setValue(Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber)}
                aria-label="Din gissning"
                className={cn('h-20 w-36 text-center font-heading text-5xl font-bold', rolls > 0 && 'motion-safe:animate-pop')}
                autoFocus={hasFinePointer()}
              />
              <Button
                type="button"
                variant="outline"
                className="size-14 text-2xl"
                onClick={() => setValue((v) => Math.min(MAX_NUMBER, (v ?? 49) + 1))}
                aria-label="Öka"
              >
                +
              </Button>
            </div>
            <input
              type="range"
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              value={value === null || Number.isNaN(value) ? 50 : value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="Dra för att välja tal"
              // Nedtonat tills ett tal är valt, så att 50 inte ser ut som ett val.
              className={cn('w-full accent-primary', (value === null || Number.isNaN(value)) && 'opacity-50')}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setValue(randomTarget())
                setRolls((n) => n + 1)
              }}
            >
              <span aria-hidden>🎲</span>
              Slumpa åt mig
            </Button>
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
      </AnswerDock>

      <GuessStatusList state={state} online={online} clockOffset={clockOffset} meId={me.id} locked={locked} hideLine />
    </Wide>
  )
}
