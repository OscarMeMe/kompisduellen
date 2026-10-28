import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Info } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { GameIntroDialog } from '@/components/GameIntroDialog'
import { Button } from '@/components/ui/button'
import { formatSek } from '@/lib/belopp'
import { GAMES, playersLabel, type GameInfo } from '@/lib/games'
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

  // "Välj spel/skapa lobby": scrolla till spelen (om det behövs), flytta fokus dit och låt korten lysa upp.
  const [highlightGames, setHighlightGames] = useState(false)
  // Spelet vars förklaring visas. Spelet ligger kvar medan rutan stängs, så att innehållet inte försvinner i animationen.
  const [introGame, setIntroGame] = useState<GameInfo | null>(null)
  const [introOpen, setIntroOpen] = useState(false)
  function showIntro(game: GameInfo) {
    setIntroGame(game)
    setIntroOpen(true)
  }
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function pointAtGames() {
    const games = document.getElementById('spel')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    games?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    games?.focus({ preventScroll: true })
    // Av och på igen, så att animationen startar om vid varje klick.
    setHighlightGames(false)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => {
      setHighlightGames(true)
      highlightTimer.current = setTimeout(() => setHighlightGames(false), 1600)
    }, 30)
  }

  return (
    <div className="flex flex-col gap-7 pt-2 sm:gap-10 sm:pt-5">
      {/* Hero */}
      <section className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr] md:gap-10">
        <div className="space-y-5 text-center md:text-left">
          {/* "Dåliga förlorare." står alltid på en rad. På riktigt smala skärmar krymper rubriken lite
              i stället för att radbrytas eller klippas, från ca 400 px är den 36 px som förut. */}
          <h1 className="text-[clamp(1.75rem,9vw,2.25rem)] leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
            Bra sällskap. <span className="whitespace-nowrap text-primary">Dåliga förlorare.</span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground md:mx-0">
            Partyspel där vänskapen sätts på prov. Skapa en lobby på några sekunder. Inget konto behövs.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-start">
            {/* Till spelkorten, utan att något spel är förvalt. Korten lyser upp, så att knappen märks
                även när allt redan syns på skärmen. */}
            <Button size="lg" onClick={pointAtGames}>
              ✨ Välj spel/skapa lobby
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/ga-med">🔑 Jag har en kod</Link>
            </Button>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">📱 Alla spelar på sin egen mobil eller dator.</p>
        </div>

        {/* Förhandsvisning av en runda i Gissa priset */}
        <div className="mx-auto w-full max-w-[17rem] rotate-2 rounded-lg border bg-card p-3 shadow-soft sm:max-w-sm sm:p-4 transition-transform hover:rotate-0">
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
            <p className="mt-1 font-heading text-4xl font-bold tabular-nums sm:text-5xl">{formatSek(PREVIEW_ITEM.priceSek)}</p>
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
                    {row.win && '. Närmast!'}
                  </span>
                </span>
                <span className="font-heading text-lg font-bold tabular-nums">+{row.points}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alla spel */}
      <section id="spel" tabIndex={-1} aria-label="Spel" className="scroll-mt-6 space-y-3 outline-none">
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
                highlightGames && 'animate-pop ring-4 ring-primary/40',
              )}
            >
              {/* Klick på bild, namn eller beskrivning visar en kort förklaring av spelet. Namnet är knappen
                  för tangentbord och skärmläsare. */}
              <div className="flex flex-1 cursor-pointer flex-col gap-3" onClick={() => showIntro(game)}>
                <div className="flex items-center gap-3">
                  <Emoji emoji={game.emoji} className="text-4xl" />
                  <h3 className="text-xl leading-tight">
                    <button
                      type="button"
                      className="rounded-md text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                    >
                      {game.name}
                    </button>
                  </h3>
                </div>
                <p className="leading-snug text-muted-foreground">{game.tagline}</p>
                {/* Spelarantal, ungefärlig tid och känsla, så att man väljer rätt spel utan att öppna förklaringen. */}
                <ul className="flex flex-wrap gap-1.5 text-xs font-semibold" aria-label="Om spelet">
                  <li className="rounded-full bg-card/70 px-2.5 py-1">👥 {playersLabel(game)}</li>
                  {game.duration && <li className="rounded-full bg-card/70 px-2.5 py-1">⏱ ca {game.duration}</li>}
                  {game.feel && <li className="rounded-full bg-card/70 px-2.5 py-1">🎲 {game.feel}</li>}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="link" className="h-auto px-0" onClick={() => showIntro(game)}>
                  <Info /> Så spelar man
                </Button>
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
      <GameIntroDialog game={introGame} open={introOpen} onOpenChange={setIntroOpen} />

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
