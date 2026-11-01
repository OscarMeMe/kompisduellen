import { useRef, useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { AmountInput } from '@/components/gissa-priset/AmountInput'
import { PriceQuestionCard } from '@/components/gissa-priset/PriceQuestionCard'
import { AnswerDock } from '@/components/lobby/AnswerDock'
import { WaitingStanding } from '@/components/lobby/WaitingStanding'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import { SendStatus } from '@/components/lobby/SendStatus'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import type { GuessingViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { useMyGuess } from '@/hooks/useMyGuess'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import { formatSek, MAX_PRICE, MIN_PRICE, parseTypedNumber } from '@/lib/belopp'
import { guessSecondsFor, isValidGuess, waitingStanding } from '@/lib/match'
import { findPriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

export function PriceGuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const item = findPriceItem(state.itemId)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { locked, inGame, lockIn, delivery, retry } = useMyGuess(state, me.id, onGuess)
  // Det tolkade beloppet i kronor är det som skickas som gissning.
  const value = parseTypedNumber(text)
  const valid = isValidGuess(state.game, value)
  // Tydligare när tiden håller på att ta slut, bara medan jag gissar.
  const { warning, secondsLeft } = useTimeWarning(
    state.deadline,
    clockOffset,
    guessSecondsFor(state),
    locked !== null || !inGame,
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

      <PriceQuestionCard item={item} />

      {/* Svarsdelen direkt under frågan, så att fält och knapp syns utan scrollning. Spelarna står under. */}
      <AnswerDock state={state} online={online} clockOffset={clockOffset} meId={me.id} locked={locked} warning={warning}>
        {!inGame ? (
          <p className="py-3 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : locked !== null ? (
          <div className="space-y-1 py-1 text-center sm:space-y-2 sm:py-2">
            <Lock className="mx-auto size-6 text-primary motion-safe:animate-lock-snap sm:size-8" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="font-heading text-3xl font-bold break-all text-primary motion-safe:animate-pop sm:text-5xl">{formatSek(locked)}</p>
            <p className="font-semibold text-muted-foreground">
              {state.practice ? 'Ditt svar är låst. Här kommer facit.' : 'Väntar på de andra…'}
            </p>
            <WaitingStanding text={waitingStanding(state, me.id)} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
            <AmountInput text={text} onTextChange={setText} inputRef={inputRef} />
            <p
              className={cn(
                'min-h-6 text-center text-base font-bold break-words sm:min-h-7 sm:text-lg',
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
