import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { LogIn, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Skapa en lobby',
    text: 'Tryck på Skapa lobby och välj ett spel. Du behöver inget konto.',
    color: 'bg-violet-500',
  },
  {
    title: 'Dela koden',
    text: 'Du får en kod på fyra bokstäver. Skicka den i Discord eller säg den högt.',
    color: 'bg-pink-500',
  },
  {
    title: 'Spela tillsammans',
    text: 'Kompisarna går med på sin egen dator eller mobil. Flest poäng vinner.',
    color: 'bg-amber-500',
  },
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
    <div className="flex flex-col gap-8 pt-6 sm:gap-10 sm:pt-10">
      {/* Hero */}
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6 text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">
            <span className="size-2 rounded-full bg-green-500" />
            Gratis och utan konto
          </span>
          <h1 className="text-4xl leading-tight font-black tracking-tight text-violet-900 sm:text-5xl">
            Gissningslekar att spela med{' '}
            <span className="rounded-xl bg-pink-200 px-2 text-pink-950 [box-decoration-break:clone]">kompisarna</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground md:mx-0">
            Skapa en lobby, dela koden med gänget och spela på var sin skärm. Passar på förfesten, i Discord eller i
            soffan.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:max-w-lg">
            <div className="space-y-1.5">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-2xl text-lg shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
              >
                <Link to="/skapa?spel=narmast">
                  <Plus className="size-5" />
                  Skapa lobby
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">Starta ett spel och bjud in andra</p>
            </div>
            <div className="space-y-1.5">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-2xl border-2 border-primary/30 bg-white text-lg transition-transform hover:-translate-y-0.5"
              >
                <Link to="/ga-med">
                  <LogIn className="size-5" />
                  Gå med i lobby
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">Har du fått en kod av en kompis?</p>
            </div>
          </div>
        </div>

        {/* Förhandsvisning av en runda i Närmast vinner */}
        <div className="mx-auto w-full max-w-sm rotate-1 rounded-3xl bg-white p-6 shadow-xl transition-transform hover:rotate-0">
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
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">Så funkar det</h2>
          <p className="mt-1 text-muted-foreground">Tre steg, och ni är igång på under en minut.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-2xl text-2xl font-black text-white',
                  step.color,
                )}
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-black text-violet-900">{step.title}</h3>
              <p className="mt-1 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Separator />

      {/* Alla spel */}
      <section id="spel" className="scroll-mt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">Alla spel</h2>
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
                <h3 className="text-xl font-black text-violet-900">{game.name}</h3>
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
