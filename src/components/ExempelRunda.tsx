import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatSek, isValidPrice, parseTypedNumber } from '@/lib/belopp'
import { pricePoints } from '@/lib/gissa-priset'
import { findPriceItem } from '@/lib/prisdata'
import { differenceText } from '@/lib/skillnad'

// Saken i exempelrundan. Den kommer från samma datakälla som spelet.
const EXAMPLE_ID = 'ikea-famnig-1998'

type ExempelRundaProps = {
  // "Spela med kompisar": tar besökaren till spelvalet.
  onPlay: () => void
}

// En liten spelbar exempelrunda på startsidan. Besökaren gissar ett pris och ser facit, helt lokalt: ingen lobby skapas,
// inget skickas och ingen klocka går. Skild från det fullständiga provläget som "Testa själv" öppnar.
export function ExempelRunda({ onPlay }: ExempelRundaProps) {
  const item = findPriceItem(EXAMPLE_ID)
  const fieldId = useId()
  const errorId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guess, setGuess] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  if (!item) return null

  function reveal(event: FormEvent) {
    event.preventDefault()
    const value = parseTypedNumber(text)
    if (!isValidPrice(value)) {
      setError('Skriv ett belopp i kronor, till exempel 100.')
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
    <section aria-label="Exempelrunda" className="mx-auto w-full max-w-md rounded-lg border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-sky-soft px-3 py-1 text-sm font-bold">Exempelrunda</span>
        <span className="font-heading text-sm font-bold text-muted-foreground">Gissa priset</span>
      </div>

      {item.image && (
        <figure className="mt-3">
          <img src={item.image} alt="" className="aspect-2/1 max-h-40 w-full rounded-md object-cover" />
          {item.imageCredit && <figcaption className="mt-1 text-xs text-muted-foreground">{item.imageCredit}</figcaption>}
        </figure>
      )}

      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          {item.question ?? 'Vad kostade det'} år <span className="font-bold text-primary">{item.year}</span>?
        </p>
        <h2 className="mt-0.5 text-xl text-balance sm:text-2xl">{item.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{item.clue}</p>
      </div>

      {guess === null ? (
        <form onSubmit={reveal} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-base font-bold">
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
                placeholder="T.ex. 100"
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
        <div className="mt-4 space-y-3">
          <div
            ref={resultRef}
            tabIndex={-1}
            className="space-y-1 rounded-lg bg-mint-soft p-4 text-center outline-none motion-safe:animate-pop focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <p className="text-sm font-semibold text-muted-foreground">Rätt pris</p>
            <p className="font-heading text-4xl font-bold tabular-nums">{formatSek(item.priceSek)}</p>
            <p className="font-semibold">
              Du gissade {formatSek(guess)}. {differenceText(guess, item.priceSek)}.
            </p>
            <p className="text-sm text-muted-foreground">Det ger {pricePoints(guess, item.priceSek)} av 100 poäng.</p>
          </div>
          <p className="text-sm text-muted-foreground">{item.fact}</p>
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
