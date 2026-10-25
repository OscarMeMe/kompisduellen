import { useRef, useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { AmountInput } from '@/components/gissa-priset/AmountInput'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { RoundBadge, Wide } from '@/components/lobby/LobbyLayout'
import type { GuessingViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { useMyGuess } from '@/hooks/useMyGuess'
import {
  DEFAULT_UNIT,
  describeKronor,
  formatSek,
  formatSekShort,
  MAX_PRICE,
  MIN_PRICE,
  parseTypedNumber,
  PRICE_UNITS,
  toKronor,
  type PriceUnit,
} from '@/lib/belopp'
import { hasFinePointer } from '@/lib/device'
import { isValidGuess } from '@/lib/match'
import { findPriceItem } from '@/lib/prisdata'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

export function PriceGuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const item = findPriceItem(state.itemId)
  const [text, setText] = useState('')
  // Vyn får en ny key varje runda, så enheten börjar om på kr inför varje fråga.
  const [unit, setUnit] = useState<PriceUnit>(DEFAULT_UNIT)
  const inputRef = useRef<HTMLInputElement>(null)
  const { locked, inGame, lockIn } = useMyGuess(state, me.id, onGuess)
  const typed = parseTypedNumber(text)
  // Det tolkade beloppet i kronor är det som skickas som gissning.
  const value = toKronor(typed, unit)
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

      <div className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-7xl">{item?.emoji ?? '🏷️'}</p>
        {item && (
          <p className="mx-auto mt-3 w-fit rounded-full bg-primary px-5 py-1.5 text-xl font-black text-primary-foreground shadow-md shadow-primary/30">
            År {item.year}
          </p>
        )}
        <p className="mt-3 text-sm font-semibold text-muted-foreground">Vad kostade det?</p>
        <h1 className="mx-auto mt-1 max-w-xl text-2xl font-black text-balance sm:text-3xl">{item?.name ?? 'Okänd sak'}</h1>
        {item?.clue && (
          <p className="mx-auto mt-3 w-fit max-w-xl rounded-2xl bg-violet-50 px-4 py-1.5 text-sm font-semibold text-primary">
            {item.clue}
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        {!inGame ? (
          <p className="py-6 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : locked !== null ? (
          <div className="space-y-2 py-4 text-center">
            <Lock className="mx-auto size-8 text-primary" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="text-4xl font-black break-all text-primary sm:text-5xl">{formatSek(locked)}</p>
            <p className="font-semibold text-muted-foreground">Väntar på de andra…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AmountInput text={text} onTextChange={setText} inputRef={inputRef} />
            {/* Mobil: tre knappar på första raden och två på andra. Bred skärm: alla fem på en rad. */}
            <div role="group" aria-label="Enhet" className="grid grid-cols-6 gap-2 sm:grid-cols-5">
              {PRICE_UNITS.map((u, index) => (
                <Button
                  key={u.id}
                  type="button"
                  variant={unit === u.id ? 'default' : 'outline'}
                  aria-pressed={unit === u.id}
                  className={cn(
                    'h-12 rounded-2xl px-2 text-base font-bold sm:col-span-1',
                    index < 3 ? 'col-span-2' : 'col-span-3',
                    unit === u.id && 'shadow-md shadow-primary/30',
                  )}
                  onClick={() => {
                    setUnit(u.id)
                    // På mobilen får tangentbordet stänga sig, så att knappen Lås in syns.
                    if (hasFinePointer()) inputRef.current?.focus()
                  }}
                >
                  {u.label}
                </Button>
              ))}
            </div>
            <p
              className={cn(
                'min-h-7 text-center text-lg font-bold break-words',
                valid ? 'text-primary' : 'text-sm font-normal text-muted-foreground',
              )}
            >
              {Number.isNaN(typed)
                ? 'Skriv ett tal och välj enhet. Komma eller punkt för decimaler.'
                : valid
                  ? describeKronor(value)
                  : value > MAX_PRICE
                    ? `Det är för mycket. Max ${formatSekShort(MAX_PRICE)}.`
                    : `Minst ${formatSek(MIN_PRICE)}.`}
            </p>
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
