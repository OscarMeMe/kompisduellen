import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowDown, Check, Play } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { GaMedKod } from '@/components/GaMedKod'
import { SpelKort } from '@/components/SpelKort'
import { ExempelRunda } from '@/components/ExempelRunda'
import { GameIntroDialog } from '@/components/GameIntroDialog'
import { Button } from '@/components/ui/button'
import { GAMES, type GameInfo } from '@/lib/games'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Välj ett spel', text: 'Skapa en lobby med ditt namn.', color: 'bg-coral-soft' },
  { title: 'Dela koden', text: 'Skicka den till kompisarna.', color: 'bg-sun-soft' },
  { title: 'Låt duellen börja', text: 'Alla spelar på sin egen skärm.', color: 'bg-mint-soft' },
]

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
      <section className="grid items-start gap-8 md:grid-cols-[1.15fr_1fr] md:items-stretch md:gap-12">
        <div className="space-y-6 text-center md:text-left">
          {/* "Dåliga förlorare." står alltid på en rad. På riktigt smala skärmar krymper rubriken lite
              i stället för att radbrytas eller klippas, från ca 400 px är den 36 px som förut. */}
          <h1 className="text-[clamp(1.75rem,9vw,2.25rem)] leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
            Bra sällskap. <span className="inline-block whitespace-nowrap text-primary motion-safe:hover:animate-wiggle">Dåliga förlorare.</span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground md:mx-0">
            Samla kompisarna, välj ett spel och dela koden. Alla spelar på sin egen mobil eller dator.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              {/* Till spelkorten, utan att något spel är förvalt. Korten lyser upp, så att knappen märks
                  även när allt redan syns på skärmen. */}
              <Button size="lg" onClick={pointAtGames}>
                Välj spel
                <ArrowDown aria-hidden />
              </Button>
              {/* Det befintliga provläget i Gissa priset: en provrunda på egen hand. */}
              <Button asChild size="lg" variant="outline" className="hover:bg-card hover:border-foreground/30">
                <Link to="/skapa?spel=gissa-priset&testa=1">
                  <Play aria-hidden />
                  Testa själv
                </Link>
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground md:justify-start">
              <Check className="size-4 text-primary" aria-hidden />
              Inget konto behövs
            </p>
          </div>
          <div className="border-t pt-5">
            <GaMedKod className="mx-auto max-w-sm md:mx-0" />
          </div>
        </div>

        {/* En liten spelbar exempelrunda, helt lokal. */}
        <ExempelRunda onPlay={pointAtGames} />
      </section>

      {/* Alla spel */}
      <section id="spel" tabIndex={-1} aria-labelledby="spel-rubrik" className="scroll-mt-6 space-y-4 outline-none">
        <div className="space-y-1">
          <h2 id="spel-rubrik" className="text-3xl">
            Vad ska ni spela?
          </h2>
          <p className="text-muted-foreground">Välj ett spel och skapa en lobby.</p>
        </div>
        {/* Spelbara spel först och större. Kommande spel på en egen rad, nedtonade. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.filter((game) => game.playable).map((game) => (
            <SpelKort
              key={game.id}
              game={game}
              recommended={game.id === 'gissa-priset'}
              highlight={highlightGames}
              onShowRules={() => showIntro(game)}
            />
          ))}
        </div>
      </section>
      <GameIntroDialog game={introGame} open={introOpen} onOpenChange={setIntroOpen} />

      {/* Så fungerar det, efter spelen så att spellistan syns direkt */}
      <section id="sa-funkar" aria-labelledby="sa-funkar-rubrik" className="scroll-mt-6 space-y-4">
        <h2 id="sa-funkar-rubrik" className="text-3xl">
          Så fungerar det
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold',
                  step.color,
                )}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg leading-tight">{step.title}</h3>
                <p className="mt-0.5 text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Kommande spel, diskret och utan knappar */}
      <section aria-labelledby="kommande-rubrik" className="space-y-3 border-t pt-6">
        <h2 id="kommande-rubrik" className="text-xl">
          Fler dueller är på väg.
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.filter((game) => !game.playable).map((game) => (
            <li key={game.id} className="flex items-center gap-3 rounded-lg border bg-card/60 p-3 opacity-80">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md text-xl', game.color)}>
                <Emoji emoji={game.emoji} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <h3 className="text-base leading-tight">{game.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Kommer snart
                  </span>
                </div>
                <p className="text-sm leading-snug text-muted-foreground">{game.tagline}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
