import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import type { GuessingViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMyGuess } from '@/hooks/useMyGuess'
import { hasFinePointer } from '@/lib/device'
import { isValidGuess } from '@/lib/match'
import { MAX_NUMBER, MIN_NUMBER } from '@/lib/narmast'
import { rulesFor } from '@/lib/spelregler'

export function GuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const [value, setValue] = useState(50)
  const { locked, inGame, lockIn } = useMyGuess(state, me.id, onGuess)
  const valid = isValidGuess(state.game, value)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) lockIn(value)
  }

  return (
    <Wide>
      <RoundBadge state={state} />

      {state.deadline !== null && (
        <Countdown deadline={state.deadline} clockOffset={clockOffset} totalSeconds={rulesFor(state.game).guessSeconds} />
      )}

      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        {!inGame ? (
          <p className="py-8 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : locked !== null ? (
          <div className="space-y-3 py-6 text-center">
            <Lock className="mx-auto size-8 text-primary" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="text-7xl font-black text-primary">{locked}</p>
            <p className="font-semibold text-muted-foreground">Väntar på de andra…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-center text-2xl font-black">
              Vilket tal mellan {MIN_NUMBER} och {MAX_NUMBER}?
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-2xl text-2xl"
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
                className="h-20 w-36 rounded-2xl text-center text-5xl font-black"
                autoFocus={hasFinePointer()}
              />
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-2xl text-2xl"
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
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-2xl text-lg shadow-lg shadow-primary/30"
              disabled={!valid}
            >
              Lås in gissning
            </Button>
          </form>
        )}
      </div>

      <GuessStatusList state={state} online={online} />
    </Wide>
  )
}
