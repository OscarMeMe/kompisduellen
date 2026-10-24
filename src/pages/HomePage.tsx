import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowDown, LogIn, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Skapa en lobby',
    text: 'Tryck på Skapa lobby och välj ett spel. Du behöver inget konto.',
    color: 'bg-violet-500',
    tint: 'bg-violet-50',
  },
  {
    title: 'Dela koden',
    text: 'Du får en kod på fyra bokstäver. Skicka den i Discord eller säg den högt.',
    color: 'bg-pink-500',
    tint: 'bg-pink-50',
  },
  {
    title: 'Spela tillsammans',
    text: 'Kompisarna går med på sin egen dator eller mobil. Flest poäng vinner.',
    color: 'bg-amber-500',
    tint: 'bg-amber-50',
  },
]

// Ställningen efter runda 3: Oscar leder, Michaela är tvåa och Andreas sist.
const PREVIEW_ROWS = [
  { name: 'Oscar', guess: 40, score: 3, win: true, color: 'bg-violet-500' },
  { name: 'Michaela', guess: 57, score: 2, win: false, color: 'bg-pink-500' },
  { name: 'Andreas', guess: 12, score: 1, win: false, color: 'bg-amber-500' },
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
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            <Link
              to="/#sa-funkar"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-white"
            >
              <ArrowDown className="size-4" />
              Så funkar det
            </Link>
            <Link
              to="/#spel"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-white"
            >
              <ArrowDown className="size-4" />
              Se alla spel
            </Link>
          </div>
        </div>

        {/* Förhandsvisning av en runda i Närmast vinner */}
        <div className="mx-auto w-full max-w-sm rotate-1 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-violet-100 transition-transform hover:rotate-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Närmast vinner</p>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-primary">Runda 3 av 5</span>
          </div>
          <p className="mt-4 text-center text-6xl font-black text-primary tabular-nums">42</p>
          <p className="text-center text-sm text-muted-foreground">Rätt svar</p>
          <p className="mt-6 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Ställning</p>
          <ol className="space-y-2">
            {PREVIEW_ROWS.map((row, index) => (
              <li
                key={row.name}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5',
                  row.win ? 'bg-amber-100 font-bold' : 'bg-violet-50',
                )}
              >
                <span className="w-4 text-center text-sm font-black text-muted-foreground">{index + 1}</span>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white',
                    row.color,
                  )}
                >
                  {row.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Gissade {row.guess}
                    {row.win && ', närmast!'}
                  </span>
                </span>
                {row.win && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">+1</span>
                )}
                <span className="text-lg font-black text-primary tabular-nums">{row.score} p</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Så funkar det */}
      <section
        id="sa-funkar"
        className="scroll-mt-6 space-y-6 rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-violet-100 sm:p-10"
      >
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary sm:text-3xl">Så funkar det</h2>
          <p className="mt-1 text-muted-foreground">Tre steg, och ni är igång på under en minut.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={cn('rounded-3xl p-6', step.tint)}>
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

      {/* Alla spel, på ett lila band så att de syns direkt */}
      <section id="spel" className="scroll-mt-6 space-y-6 rounded-[2rem] bg-violet-600 p-6 shadow-xl shadow-violet-600/20 sm:p-10">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Alla spel</h2>
          <p className="mt-1 text-violet-100">Välj ett spel och skapa en lobby. Fler spel är på väg.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={cn(
                'flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-md transition-transform',
                game.playable && 'hover:-translate-y-1',
              )}
            >
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
