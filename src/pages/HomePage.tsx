import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { formatSek } from '@/lib/belopp'
import { GAMES, playersLabel } from '@/lib/games'
import { pricePoints } from '@/lib/gissa-priset'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Skapa en lobby', text: 'Välj spel och skriv ditt namn. Inget konto behövs.', color: 'bg-coral-soft' },
  { title: 'Dela koden', text: 'Fyra bokstäver. Skicka i Discord eller säg den högt.', color: 'bg-sun-soft' },
  { title: 'Spela!', text: 'Alla svarar på sin egen skärm. Flest poäng vinner.', color: 'bg-mint-soft' },
]

// En runda i Gissa priset med en riktig sak ur prisdata.ts. Poängen räknas som i spelet.
const PREVIEW_ITEM = { emoji: '❤️', name: 'Ikeas hjärtformade kudde med armar', year: 1998, priceSek: 79 }
const PREVIEW_ROWS = [
  { name: 'Oscar', avatar: '🧙', guess: 75 },
  { name: 'Michaela', avatar: '👽', guess: 120 },
  { name: 'Andreas', avatar: '🤖', guess: 30 },
].map((row, index) => ({ ...row, points: pricePoints(row.guess, PREVIEW_ITEM.priceSek), win: index === 0 }))

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="flex flex-col gap-7 pt-2 sm:gap-10 sm:pt-5">
      {/* Hero */}
      <section className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr] md:gap-10">
        <div className="space-y-5 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
            🎉 Gratis · inget konto behövs
          </span>
          <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
            Bra sällskap. <span className="text-primary sm:whitespace-nowrap">Dåliga förlorare.</span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground md:mx-0">
            För förfesten, soffhänget och bara en omgång till.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:max-w-md">
            {/* Till spelkorten, utan att något spel är förvalt. Scrollar även om #spel redan står i adressen. */}
            <Button asChild size="lg">
              <Link
                to="/#spel"
                onClick={() => document.getElementById('spel')?.scrollIntoView({ behavior: 'smooth' })}
              >
                ✨ Välj spel
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/ga-med">🔑 Jag har en kod</Link>
            </Button>
          </div>
        </div>

        {/* Förhandsvisning av en runda i Gissa priset */}
        <div className="mx-auto w-full max-w-sm rotate-2 rounded-lg border bg-card p-4 shadow-soft transition-transform hover:rotate-0">
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-bold">
              <Emoji emoji="🏷️" /> Gissa priset
            </p>
            <span className="rounded-full bg-sky-soft px-3 py-1 text-xs font-semibold">Runda 3 av 5</span>
          </div>
          <div className="mt-2.5 rounded-lg bg-sun-soft py-2.5 text-center">
            <p className="px-4 text-sm font-semibold">
              {PREVIEW_ITEM.emoji} {PREVIEW_ITEM.name}, {PREVIEW_ITEM.year}
            </p>
            <p className="mt-1 font-heading text-5xl font-bold tabular-nums">{formatSek(PREVIEW_ITEM.priceSek)}</p>
            <p className="text-sm text-muted-foreground">Rätt pris</p>
          </div>
          <ol className="mt-2 space-y-1">
            {PREVIEW_ROWS.map((row, index) => (
              <li
                key={row.name}
                className={cn('flex items-center gap-3 rounded-lg px-4 py-1.5', row.win ? 'bg-mint-soft' : 'bg-muted')}
              >
                <span className="w-3 text-sm font-semibold text-muted-foreground">{index + 1}</span>
                <Emoji emoji={row.avatar} className="text-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading font-bold">{row.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Gissade {formatSek(row.guess)}
                    {row.win && ' – närmast!'}
                  </span>
                </span>
                <span className="font-heading text-lg font-bold tabular-nums">+{row.points}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alla spel */}
      <section id="spel" className="scroll-mt-6 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-3xl">Spel</h2>
          <p className="text-muted-foreground">Fler spel är på väg.</p>
        </div>
        {/* Spelbara spel först och större. Kommande spel på en egen rad, nedtonade. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.filter((game) => game.playable).map((game) => (
            <div
              key={game.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border-2 border-primary/25 p-5 shadow-soft transition-transform hover:-translate-y-1',
                game.color,
              )}
            >
              <div className="flex items-center gap-3">
                <Emoji emoji={game.emoji} className="text-4xl" />
                <h3 className="text-xl leading-tight">{game.name}</h3>
              </div>
              <p className="flex-1 leading-snug text-muted-foreground">{game.tagline}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">👥 {playersLabel(game)}</p>
                <div className="flex flex-wrap gap-2">
                  {rulesFor(game.id).soloPractice && (
                    <Button asChild variant="outline">
                      <Link to={`/skapa?spel=${game.id}&testa=1`}>Testa själv</Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link to={`/skapa?spel=${game.id}`}>Spela nu</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.filter((game) => !game.playable).map((game) => (
            <div key={game.id} className={cn('flex gap-3 rounded-lg border p-4 opacity-75', game.color)}>
              <Emoji emoji={game.emoji} className="text-2xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <h3 className="text-base leading-tight">{game.name}</h3>
                  <span className="rounded-full bg-card/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    Kommer snart
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{game.tagline}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">👥 {playersLabel(game)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Så funkar det, efter spelen så att spellistan syns direkt */}
      <section id="sa-funkar" className="scroll-mt-6 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-3xl">Så funkar det</h2>
          <p className="text-muted-foreground">Igång på under en minut.</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={cn('flex items-start gap-3 rounded-lg px-4 py-3', step.color)}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card font-heading text-sm font-bold shadow-soft-sm">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg leading-tight">{step.title}</h3>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
