import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Clock, Play, Users } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { findGame, playersLabel } from '@/lib/games'
import { rulesFor } from '@/lib/spelregler'
import { GAME_PAGES, type GamePageInfo } from '@/lib/spelsidor'
import { cn } from '@/lib/utils'

// En sida per spel (/spel/gissa-priset …) som berättar vad spelet är, hur man spelar och svarar på vanliga frågor.
// Sidan förrenderas i bygget, så att sökmotorerna får all text direkt. Ingår i första laddningen (inte lazy),
// så att den förrenderade sidan inte byts mot en snurra när appen startar.
export function GameInfoPage({ page }: { page: GamePageInfo }) {
  const game = findGame(page.gameId)
  // Kommer man från ett spelkort eller en annan spelsida ska sidan börja överst, inte där man var.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page.slug])
  if (!game) return null
  const others = GAME_PAGES.filter((other) => other.slug !== page.slug)
  // Spel som går att prova på egen hand får två vägar in, och då säger huvudknappen vad skillnaden är.
  const canTestAlone = rulesFor(game.id).soloPractice === true
  const startButton = (
    <Button asChild size="lg" className="w-full sm:w-auto">
      <Link to={`/skapa?spel=${game.id}`}>
        {canTestAlone ? 'Spela med kompisar' : 'Starta en lobby'}
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pt-2 sm:pt-4">
      <Link
        to="/"
        className="flex h-11 w-fit items-center gap-2 font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Alla spel
      </Link>

      <section className="overflow-hidden rounded-lg border bg-card shadow-soft">
        <div className={cn('flex h-24 items-center justify-center sm:h-28', game.color)}>
          <Emoji emoji={game.emoji} className="text-5xl sm:text-6xl" />
        </div>
        <div className="space-y-5 p-5 sm:p-8">
          <h1 className="text-3xl leading-tight sm:text-4xl">{page.heading}</h1>
          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            <li className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
              <Users aria-hidden className="size-4" />
              {playersLabel(game)}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
              <Clock aria-hidden className="size-4" />
              {page.time}
            </li>
            {game.feel && <li className="rounded-full bg-muted px-3 py-1.5">{game.feel}</li>}
          </ul>
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              {startButton}
              {canTestAlone && (
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link to={`/skapa?spel=${game.id}&testa=1`}>
                    <Play aria-hidden />
                    Testa själv
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Gratis. Ingen app eller registrering behövs.</p>
          </div>
          <div className="space-y-3 text-lg">
            {page.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="sa-spelar-ni" className="space-y-4">
        <h2 id="sa-spelar-ni" className="text-3xl">
          Så spelar ni
        </h2>
        <ol className="space-y-4">
          {page.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold',
                  game.color,
                )}
              >
                {index + 1}
              </span>
              <p className="pt-1.5 text-lg">{step}</p>
            </li>
          ))}
        </ol>
        {startButton}
      </section>

      <section aria-labelledby="vanliga-fragor" className="space-y-4">
        <h2 id="vanliga-fragor" className="text-3xl">
          Vanliga frågor
        </h2>
        <div className="divide-y rounded-lg border bg-card shadow-soft">
          {page.faq.map((item) => (
            <div key={item.question} className="space-y-1 p-5">
              <h3 className="text-lg leading-tight">{item.question}</h3>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="fler-spel" className="space-y-4 border-t pt-8">
        <h2 id="fler-spel" className="text-2xl">
          Fler spel att köra med kompisarna
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {others.map((other) => {
            const otherGame = findGame(other.gameId)
            if (!otherGame) return null
            return (
              <li key={other.slug}>
                <Link
                  to={`/spel/${other.slug}`}
                  className="flex h-full items-center gap-3 rounded-lg border bg-card p-4 shadow-soft-sm transition-[translate,box-shadow] hover:shadow-lift motion-safe:hover:-translate-y-0.5"
                >
                  <span
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-md text-2xl',
                      otherGame.color,
                    )}
                  >
                    <Emoji emoji={otherGame.emoji} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading text-lg leading-tight font-bold">{otherGame.name}</span>
                    <span className="block text-sm leading-snug text-muted-foreground">{otherGame.tagline}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <Link to="/" className="inline-flex h-11 items-center gap-2 font-semibold underline underline-offset-4 hover:text-muted-foreground">
          Till startsidan
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>
    </div>
  )
}
