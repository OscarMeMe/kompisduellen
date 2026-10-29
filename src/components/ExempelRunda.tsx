import { useId, useRef, useState, type FormEvent } from 'react'
import { Konfetti } from '@/components/Konfetti'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatExactSek, formatSek, isValidPrice, parseTypedNumber, roundSek } from '@/lib/belopp'
import { pricePoints } from '@/lib/gissa-priset'
import { findExampleItem, questionText } from '@/lib/prisdata'
import { differenceText } from '@/lib/skillnad'
import { useCountUp } from '@/hooks/useCountUp'

// Så många poäng ger konfetti i exempelrundan.
const CONFETTI_POINTS = 85

type ExempelRundaProps = {
  // "Spela med kompisar": tar besökaren till spelvalet.
  onPlay: () => void
}

// En liten spelbar exempelrunda på startsidan. Besökaren gissar ett pris och ser facit, helt lokalt: ingen lobby skapas,
// inget skickas och ingen klocka går. Skild från det fullständiga provläget som "Testa själv" öppnar.
// Frågan är den som är markerad med exempel: true i prisdata.json. Rutan är kompakt: bilden är liten bredvid frågan,
// och bildkrediten står alltid under bilden.
export function ExempelRunda({ onPlay }: ExempelRundaProps) {
  const item = findExampleItem()
  const fieldId = useId()
  const errorId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guess, setGuess] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  if (!item) return null
  // Som i spelet räknas priset från en krona i hela kronor, och det exakta priset står under.
  const target = roundSek(item.priceSek)

  function reveal(event: FormEvent) {
    event.preventDefault()
    const value = parseTypedNumber(text)
    if (!isValidPrice(value)) {
      setError('Skriv ett belopp i kronor, till exempel 10.')
      inputRef.current?.focus()
      return
    }
    setError(null)
    setGuess(value)
    // Knappen försvinner, så fokus flyttas till svaret. Då läser skärmläsare upp det direkt.
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  function again() {
    setGuess(null)
    setText('')
    setError(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <section
      aria-label="Exempelrunda"
      className="mx-auto flex w-full max-w-md flex-col rounded-lg border bg-card p-4 shadow-soft md:h-full md:max-w-none"
    >
      {/* Bilden överst. På bred skärm tar den all höjd som blir över, och hela föremålet visas (ingen uppklippt del). */}
      <figure className="flex min-h-0 flex-col md:flex-1">
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-md bg-muted/60 md:h-auto md:min-h-28 md:flex-1">
          {item.image && <img src={item.image} alt="" className="absolute inset-0 size-full object-contain" />}
          <span className="absolute top-2 left-2 rounded-full bg-card px-3 py-0.5 text-sm font-bold shadow-soft-sm">
            Exempelrunda
          </span>
          <span className="absolute top-2 right-2 rounded-full bg-card px-3 py-0.5 font-heading text-sm font-bold text-muted-foreground shadow-soft-sm">
            Gissa priset
          </span>
        </div>
        {item.imageCredit && (
          <figcaption className="mt-1 truncate text-[11px] leading-tight text-muted-foreground/80">{item.imageCredit}</figcaption>
        )}
      </figure>

      <div className="mt-3">
        <h2 className="text-xl leading-snug text-balance">{questionText(item)}</h2>
        <p className="mt-1 text-sm text-muted-foreground italic">Ledtråd: {item.exempelLedtrad ?? item.clue}</p>
      </div>

      {guess === null ? (
        <form onSubmit={reveal} className="mt-3 space-y-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-sm font-bold">
              Din gissning i kronor
            </Label>
            <div className="relative">
              <Input
                id={fieldId}
                ref={inputRef}
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  setError(null)
                }}
                inputMode="decimal"
                autoComplete="off"
                placeholder="T.ex. 10"
                aria-invalid={error !== null}
                aria-describedby={error ? errorId : undefined}
                className="pr-12 font-heading text-lg font-bold"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted-foreground" aria-hidden>
                kr
              </span>
            </div>
            <p id={errorId} role="alert" className="text-sm font-semibold text-primary empty:hidden">
              {error}
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full">
            Visa svaret
          </Button>
        </form>
      ) : (
        <div className="mt-3 space-y-2">
          <div
            ref={resultRef}
            tabIndex={-1}
            className="relative rounded-lg bg-mint-soft p-3 text-center outline-none motion-safe:animate-pop focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            {/* Nära rätt pris (minst 85 poäng, ungefär inom 10 procent) ger ett litet konfettiregn. */}
            {pricePoints(guess, target) >= CONFETTI_POINTS && <Konfetti />}
            <p className="text-sm font-semibold text-muted-foreground">Rätt pris</p>
            <CountingPrice target={target} />
            {item.priceSek !== target && (
              <p className="text-xs font-semibold text-muted-foreground">exakt {formatExactSek(item.priceSek)}</p>
            )}
            <p className="text-sm font-semibold">
              Du gissade {formatSek(guess)}. {differenceText(guess, target)}.
            </p>
            <p className="text-sm text-muted-foreground">Det ger {pricePoints(guess, target)} av 100 poäng.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={onPlay}>
              Spela med kompisar
            </Button>
            <Button size="lg" variant="outline" className="sm:flex-1" onClick={again}>
              Gissa igen
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// Rätt pris räknas upp till sitt värde på ungefär en sekund. Skärmläsare får det färdiga priset direkt.
function CountingPrice({ target }: { target: number }) {
  const value = useCountUp(target, 1000)
  return (
    <p className="font-heading text-3xl font-bold tabular-nums">
      {/* Avrundas som priset (ören under en krona, annars hela kronor), så att det aldrig står 100 öre på vägen. */}
      <span aria-hidden>{formatSek(roundSek(value))}</span>
      <span className="sr-only">{formatSek(target)}</span>
    </p>
  )
}
