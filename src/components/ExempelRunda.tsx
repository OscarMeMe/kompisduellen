import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { RotateCcw } from 'lucide-react'
import { CountingPrice } from '@/components/CountingPrice'
import { CreditText } from '@/components/gissa-priset/ImageCredit'
import { Konfetti } from '@/components/Konfetti'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cleanTypedAmount, formatSek, isValidPrice, parseTypedNumber } from '@/lib/belopp'
import { hasFinePointer } from '@/lib/device'
import { pricePoints } from '@/lib/gissa-priset'
import { EXAMPLE_ITEMS, questionText } from '@/lib/prisdata'
import { differenceText } from '@/lib/skillnad'
import { cn } from '@/lib/utils'

// Så många poäng ger konfetti i exempelrundan.
const CONFETTI_POINTS = 90
// Så länge står facit innan nästa fråga eller resultatet kommer av sig självt. Knappen går till nästa direkt.
const FACIT_SECONDS = 5

// En liten spelbar exempelrunda på startsidan. Besökaren gissar ett pris och ser facit, helt lokalt: ingen lobby skapas,
// inget skickas och ingen klocka går. Skild från det fullständiga provläget som "Testa själv" öppnar.
// Frågorna är de tre som är markerade med exempel (1, 2, 3) i prisdata.json, i den ordningen. Efter varje fråga står
// facit en stund (FACIT_SECONDS) och sedan kommer nästa fråga av sig själv. Efter fråga 3 blir kortet suddigt bakom en
// resultatruta med totalen, och då går det inte att gissa igen förrän man trycker på Spela igen. Kortet har samma höjd
// hela tiden, så att sidan inte rycker.
export function ExempelRunda() {
  const order = EXAMPLE_ITEMS
  const [index, setIndex] = useState(0)
  // Poängen för varje besvarad fråga.
  const [scores, setScores] = useState<number[]>([])
  const item = order[index]
  const isLast = index >= order.length - 1
  const errorId = useId()
  const titleId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guess, setGuess] = useState<number | null>(null)
  // Sekunder kvar av facit.
  const [facitLeft, setFacitLeft] = useState(FACIT_SECONDS)
  // Alla tre frågorna är besvarade och facit för den sista har visats: resultatrutan står ovanpå kortet.
  const [finished, setFinished] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  // Facit räknas ned och går sedan vidare av sig självt. Nedräkningen ställs om när man svarar (reveal).
  const showingFacit = guess !== null && !finished
  useEffect(() => {
    if (!showingFacit) return
    const timer = setInterval(() => setFacitLeft((left) => Math.max(0, left - 1)), 1000)
    return () => clearInterval(timer)
  }, [showingFacit])
  useEffect(() => {
    if (showingFacit && facitLeft === 0) advance()
    // advance ändras vid varje ritning, och nedräkningen är det enda som ska starta den.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [showingFacit, facitLeft])

  if (!item) return null
  const price = item.priceSek

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
    setFacitLeft(FACIT_SECONDS)
    setScores((list) => [...list, pricePoints(value, price)])
    // Knappen försvinner, så fokus flyttas till svaret. Då läser skärmläsare upp det.
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  // Till nästa fråga, eller till resultatrutan efter den sista. Fokus följer med bara om besökaren är kvar i kortet,
  // och på mobil öppnas inte tangentbordet av sig självt.
  function advance() {
    const stayedInCard = sectionRef.current?.contains(document.activeElement) ?? false
    if (isLast) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
      setGuess(null)
      setText('')
      setError(null)
    }
    requestAnimationFrame(() => {
      if (!stayedInCard) return
      const target = isLast ? summaryRef.current : hasFinePointer() ? inputRef.current : sectionRef.current
      target?.focus({ preventScroll: true })
    })
  }

  // Spela igen: tillbaka till fråga 1 med noll poäng.
  function restart() {
    setScores([])
    setIndex(0)
    setGuess(null)
    setFinished(false)
    setText('')
    setError(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const total = scores.reduce((sum, points) => sum + points, 0)
  // "Exakt rätt!" har redan sitt skiljetecken.
  const differenceWords = guess === null ? '' : differenceText(guess, price)
  const difference = differenceWords.endsWith('!') ? differenceWords : `${differenceWords}.`

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-lg border bg-card shadow-soft outline-none md:h-full md:max-w-none"
    >
      {/* Kortets innehåll. Efter sista frågan blir det suddigt och nedtonat bakom resultatrutan (bara nedtonat med minskad rörelse). */}
      <div
        aria-hidden={finished || undefined}
        inert={finished || undefined}
        className={cn(
          'flex flex-1 flex-col p-3 sm:p-4 motion-safe:transition-[filter,opacity] motion-safe:duration-300',
          finished && 'pointer-events-none opacity-40 select-none motion-safe:blur-sm',
        )}
      >
        <h2 id={titleId} className="mb-2 text-lg leading-tight">
          Gissa priset
        </h2>
        {/* Bilden fyller kortets bredd med samma höjd för alla frågor. Den beskärs, men dras aldrig ut. */}
        <figure className="flex min-h-0 flex-col">
          <div className="relative aspect-video max-h-44 w-full overflow-hidden rounded-md bg-muted/60 md:max-h-52">
            {item.image && <img src={item.image} alt={item.imageNote ?? ''} className="absolute inset-0 size-full object-cover" />}
            <span className="absolute top-2 left-2 rounded-full bg-card px-3 py-0.5 text-sm font-bold shadow-soft-sm">Exempel</span>
          </div>
          {/* Raden finns alltid, även tom, så att alla frågor har samma höjd. Licensen kräver att krediten finns kvar. */}
          <figcaption className="mt-0.5 min-h-[1lh] truncate text-[11px] leading-tight text-muted-foreground/80">
            <CreditText item={item} />
          </figcaption>
        </figure>

        {/* Fasta minsta höjder på frågan och svarsdelen, så att kortet inte hoppar mellan frågorna. Facit tar samma plats som
            fältet och knappen. Måtten är den längsta frågan och det högsta facit med vanliga gissningar. */}
        <div className="mt-1 min-h-29 md:min-h-24">
          <h3 className="text-lg leading-snug text-balance">{questionText(item)}</h3>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground italic">Ledtråd: {item.exempelLedtrad ?? item.clue}</p>
        </div>

        {guess === null ? (
          <form onSubmit={reveal} className="mt-2 flex min-h-35 flex-col justify-end gap-2" noValidate>
            {/* Felet står ovanför fältet, på plats som redan finns, så att fältet och knappen inte flyttar sig. */}
            <p id={errorId} role="alert" className="text-sm font-semibold text-primary empty:hidden">
              {error}
            </p>
            <div className="relative">
              <Input
                aria-label="Din gissning i kronor"
                ref={inputRef}
                value={text}
                onChange={(event) => {
                  // Bara siffror, mellanslag och decimaltecken (komma eller punkt, för ören som 0,50), även vid inklistring.
                  setText(cleanTypedAmount(event.target.value))
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
            <Button type="submit" size="lg" className="w-full">
              Visa svaret
            </Button>
          </form>
        ) : (
          <div className="mt-2 min-h-35 space-y-2">
            <div
              ref={resultRef}
              tabIndex={-1}
              className="relative rounded-lg bg-mint-soft px-3 py-2 text-center outline-none motion-safe:animate-pop focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              {/* Nära rätt pris (minst 90 poäng, inom 10 procent) ger ett litet konfettiregn. */}
              {pricePoints(guess, price) >= CONFETTI_POINTS && <Konfetti />}
              <p className="flex flex-wrap items-baseline justify-center gap-x-2">
                <span className="text-sm font-semibold text-muted-foreground">Rätt pris</span>
                <span className="font-heading text-2xl leading-tight font-bold tabular-nums">
                  <CountingPrice target={price} />
                </span>
              </p>
              <p className="text-sm font-semibold">
                Du gissade {formatSek(guess)}. {difference}
              </p>
              <p className="text-sm text-muted-foreground">Det ger {pricePoints(guess, price)} av 100 poäng.</p>
            </div>
            <Button variant="outline" className="w-full tabular-nums" onClick={advance}>
              {isLast ? 'Visa resultatet' : 'Nästa fråga'} om {facitLeft} s
            </Button>
          </div>
        )}
      </div>

      {finished && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="status"
            className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-5 text-center shadow-soft outline-none motion-safe:animate-pop"
          >
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Tre frågor klara</p>
              <p className="font-heading text-2xl font-bold">
                Du fick {total} av {order.length * 100} poäng
              </p>
            </div>
            <Button asChild size="lg" className="h-auto w-full py-3 whitespace-normal">
              <Link to="/skapa?spel=gissa-priset">Spela Gissa priset med kompisar</Link>
            </Button>
            <Button variant="outline" onClick={restart}>
              <RotateCcw aria-hidden />
              Spela igen
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

