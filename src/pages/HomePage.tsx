import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

const STEPS = [
  { emoji: '🎮', title: 'Välj ett spel', text: 'Skapa en lobby på några sekunder. Inget konto behövs.' },
  { emoji: '🔗', title: 'Bjud in gänget', text: 'Dela den fyrbokstaviga koden i Discord eller ropa ut den i soffan.' },
  { emoji: '🏆', title: 'Kör!', text: 'Alla spelar på sin egen skärm. Bäst i gänget hamnar överst på pallen.' },
]

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="flex flex-col gap-20 pt-6 sm:pt-12">
      {/* Hero */}
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6 text-center md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">
            🎉 Gratis · Inget konto · Spela direkt
          </span>
          <h1 className="text-5xl leading-[1.05] font-black tracking-tight sm:text-6xl">
            Snabba spel för <span className="text-primary">förfesten</span> och{' '}
            <span className="text-pink-500">Discord-hänget</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground md:mx-0">
            Skapa en lobby, skicka koden till gänget och se vem som är bäst. Alla spelar på sin egen dator eller mobil.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Button asChild size="lg" className="h-14 rounded-2xl px-8 text-lg shadow-lg shadow-primary/30">
              <Link to="/skapa?spel=narmast">Skapa lobby</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl bg-white px-8 text-lg">
              <Link to="/ga-med">Jag har en kod</Link>
            </Button>
          </div>
        </div>

        {/* Liten förhandsvisning av spelet */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rotate-2 rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-muted-foreground">Runda 3 av 5 · Närmast vinner</p>
            <p className="mt-4 text-center text-7xl font-black text-primary">42</p>
            <p className="text-center text-sm text-muted-foreground">Rätt tal</p>
            <ul className="mt-6 space-y-2">
              {[
                { avatar: '🦊', name: 'Oscar', guess: 40, win: true },
                { avatar: '🐸', name: 'Kompisen', guess: 57, win: false },
                { avatar: '🦄', name: 'Sara', guess: 12, win: false },
              ].map((row) => (
                <li
                  key={row.name}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2',
                    row.win ? 'bg-amber-100 font-bold' : 'bg-violet-50',
                  )}
                >
                  <span className="text-2xl">{row.avatar}</span>
                  <span className="flex-1">{row.name}</span>
                  <span className="tabular-nums">{row.guess}</span>
                  {row.win && <span>+1</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="absolute -top-5 -left-5 -rotate-12 rounded-2xl bg-pink-500 px-4 py-2 text-lg font-black text-white shadow-lg">
            Närmast!
          </div>
        </div>
      </section>

      {/* Så funkar det */}
      <section className="space-y-6">
        <h2 className="text-center text-3xl font-black tracking-tight">Så funkar det</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{step.emoji}</span>
                <span className="text-sm font-bold text-primary">Steg {index + 1}</span>
              </div>
              <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
              <p className="mt-1 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alla spel */}
      <section id="spel" className="scroll-mt-6 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight">Alla spel</h2>
          <p className="mt-1 text-muted-foreground">Fler spel är på väg.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <div key={game.id} className={cn('flex flex-col gap-4 rounded-3xl p-6', game.color)}>
              <div className="flex items-start justify-between">
                <span className="text-5xl">{game.emoji}</span>
                {!game.playable && (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">Kommer snart</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black">{game.name}</h3>
                <p className="mt-1 opacity-80">{game.tagline}</p>
              </div>
              {game.playable ? (
                <Button asChild size="lg" className="h-12 rounded-2xl text-base">
                  <Link to={`/skapa?spel=${game.id}`}>Spela</Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="h-12 rounded-2xl bg-white/60 text-base" disabled>
                  Snart
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
