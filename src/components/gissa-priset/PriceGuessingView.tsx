import { useRef, useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { AmountInput } from '@/components/gissa-priset/AmountInput'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import type { GuessingViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { useMyGuess } from '@/hooks/useMyGuess'
import { formatSek, MAX_PRICE, MIN_PRICE, parseTypedNumber } from '@/lib/belopp'
import { isValidGuess } from '@/lib/match'
import { findPriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

export function PriceGuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const item = findPriceItem(state.itemId)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { locked, inGame, lockIn } = useMyGuess(state, me.id, onGuess)
  // Det tolkade beloppet i kronor är det som skickas som gissning.
  const value = parseTypedNumber(text)
  const valid = isValidGuess(state.game, value)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) lockIn(value)
  }

  return (
    <Wide>
      <RoundTimer state={state} clockOffset={clockOffset} />

      {/* Kompakt på mobilen: figur och årtal på samma rad, så att frågan och rutan syns samtidigt. */}
      <div className="rounded-lg border bg-card p-4 text-center shadow-soft sm:p-8">
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl sm:text-7xl">{item?.emoji ?? '🏷️'}</span>
          {item && (
            <span className="rounded-full bg-primary px-4 py-1 font-heading text-lg font-bold text-primary-foreground shadow-primary sm:px-5 sm:py-1.5 sm:text-xl">
              År {item.year}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-muted-foreground sm:mt-3">Vad kostade det?</p>
        <h1 className="mx-auto mt-1 max-w-xl text-xl text-balance sm:text-3xl">{item?.name ?? 'Okänd sak'}</h1>
        {item?.clue && (
          <p className="mx-auto mt-2 w-fit max-w-xl rounded-md bg-sky-soft px-4 py-1.5 text-sm font-semibold sm:mt-3">
            {item.clue}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-soft sm:p-8">
        {!inGame ? (
          <p className="py-6 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : locked !== null ? (
          <div className="space-y-2 py-4 text-center">
            <Lock className="mx-auto size-8 text-primary" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="font-heading text-4xl font-bold break-all text-primary sm:text-5xl">{formatSek(locked)}</p>
            <p className="font-semibold text-muted-foreground">Väntar på de andra…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <AmountInput text={text} onTextChange={setText} inputRef={inputRef} />
            <p
              className={cn(
                'min-h-7 text-center text-lg font-bold break-words',
                valid ? 'text-primary' : 'text-sm font-normal text-muted-foreground',
              )}
            >
              {Number.isNaN(value)
                ? 'Skriv priset i kronor. Komma eller punkt för ören.'
                : valid
                  ? `= ${formatSek(value)}`
                  : value > MAX_PRICE
                    ? `Det är för mycket. Max ${formatSek(MAX_PRICE)}.`
                    : `Minst ${formatSek(MIN_PRICE)}.`}
            </p>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!valid}
            >
              Lås in gissning
            </Button>
          </form>
        )}
      </div>

      <GuessStatusList state={state} online={online} clockOffset={clockOffset} meId={me.id} locked={locked} />
    </Wide>
  )
}
