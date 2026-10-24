import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Välj ett spel', text: 'Skapa en lobby på några sekunder. Du behöver inget konto.' },
  { title: 'Bjud in gänget', text: 'Dela koden på fyra bokstäver, i Discord eller rakt ut i rummet.' },
  { title: 'Spela', text: 'Alla svarar på sin egen dator eller mobil. Flest poäng vinner.' },
]

const PREVIEW_ROWS = [
  { name: 'Oscar', guess: 40, win: true },
  { name: 'Kompisen', guess: 57, win: false },
  { name: 'Sara', guess: 12, win: false },
]

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="flex flex-col gap-12 pt-6 sm:gap-16 sm:pt-12">
      {/* Hero */}
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6 text-center md:text-left">
          <p className="text-sm font-semibold text-primary">Gratis och utan konto</p>
          <h1 className="text-4xl leading-tight font-black tracking-tight sm:text-5xl">
            Gissningslekar att spela med kompisarna
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground md:mx-0">
            Skapa en lobby, dela koden med gänget och spela på var sin skärm. Passar på förfesten, i Discord eller i
            soffan.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Button asChild size="lg" className="h-14 rounded-2xl px-8 text-lg">
              <Link to="/skapa?spel=narmast">Skapa lobby</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl bg-white px-8 text-lg">
              <Link to="/ga-med">Jag har en kod</Link>
            </Button>
          </div>
        </div>

        {/* Förhandsvisning av en runda i Närmast vinner */}
        <div className="mx-auto w-full max-w-sm rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Närmast vinner, runda 3 av 5</p>
          <p className="mt-4 text-center text-6xl font-black text-primary tabular-nums">42</p>
          <p className="text-center text-sm text-muted-foreground">Rätt svar</p>
          <ul className="mt-6 space-y-2">
            {PREVIEW_ROWS.map((row) => (
              <li
                key={row.name}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-2.5',
                  row.win ? 'bg-amber-100 font-bold' : 'bg-muted',
                )}
              >
                <span className="flex-1">{row.name}</span>
                <span className="tabular-nums">{row.guess}</span>
                {row.win && <span className="text-sm">+1 poäng</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      {/* Så funkar det */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Så funkar det</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Separator />

      {/* Alla spel */}
      <section id="spel" className="scroll-mt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Alla spel</h2>
          <p className="mt-1 text-muted-foreground">Fler spel är på väg.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <div key={game.id} className="flex flex-col gap-4 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <span className={cn('flex size-12 items-center justify-center rounded-2xl', game.color)}>
                  <game.icon className="size-6" />
                </span>
                {!game.playable && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                    Kommer snart
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black">{game.name}</h3>
                <p className="mt-1 text-muted-foreground">{game.tagline}</p>
              </div>
              {game.playable ? (
                <Button asChild size="lg" className="h-12 rounded-2xl text-base">
                  <Link to={`/skapa?spel=${game.id}`}>Spela</Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="h-12 rounded-2xl text-base" disabled>
                  Inte klart än
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
