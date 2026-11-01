import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { findGame, playersLabel } from '@/lib/games'
import type { GuidePageInfo } from '@/lib/guider'
import { gamePageFor } from '@/lib/spelsidor'
import { cn } from '@/lib/utils'

// En guide (/forfestlekar …): ett kort svar först, en jämförelse av spelen, ett avsnitt med startlänk per spel och
// vanliga frågor. Sidan förrenderas i bygget, så den ingår i första laddningen (inte lazy).
export function GuidePage({ page }: { page: GuidePageInfo }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page.slug])
  const showGuessOn = page.games.some((item) => item.guessOn)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pt-2 sm:pt-4">
      <Link to="/" className="flex h-11 w-fit items-center gap-2 font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        Alla spel
      </Link>

      <section className="space-y-4 rounded-lg border bg-card p-5 shadow-soft sm:p-8">
        <h1 className="text-3xl leading-tight sm:text-4xl">{page.heading}</h1>
        <p className="text-lg">{page.answer}</p>
      </section>

      {page.howTo && (
        <section aria-labelledby="sa-gor-ni" className="space-y-4">
          <h2 id="sa-gor-ni" className="text-3xl">
            {page.howTo.heading}
          </h2>
          <ol className="space-y-4">
            {page.howTo.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-coral-soft font-heading text-lg font-bold">
                  {index + 1}
                </span>
                <p className="pt-1.5 text-lg">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {page.sections?.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="text-2xl sm:text-3xl">{section.heading}</h2>
          <p className="text-lg">{section.text}</p>
        </section>
      ))}

      <section aria-labelledby="jamforelse" className="space-y-3">
        <h2 id="jamforelse" className="text-3xl">
          Spelen jämförda
        </h2>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-soft">
          <table className="w-full text-left text-xs sm:text-base [&_td]:p-2 [&_th]:p-2 sm:[&_td]:p-3 sm:[&_th]:p-3">
            <thead>
              <tr className="border-b font-heading">
                <th>Spel</th>
                {showGuessOn && <th>Ni gissar på</th>}
                <th>Spelare</th>
                <th>Tid</th>
                {!showGuessOn && <th>Typ</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {page.games.map((item) => {
                const game = findGame(item.gameId)
                if (!game) return null
                return (
                  <tr key={item.gameId}>
                    <th scope="row" className="font-semibold">
                      {game.name}
                    </th>
                    {showGuessOn && <td>{item.guessOn}</td>}
                    <td className="whitespace-nowrap">{playersLabel(game).replace(' spelare', '')}</td>
                    <td className="whitespace-nowrap">{gamePageFor(item.gameId)?.time.replace(' minuter', ' min')}</td>
                    {!showGuessOn && <td>{game.feel}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="spelen" className="space-y-4">
        <h2 id="spelen" className="text-3xl">
          Så går det till
        </h2>
        <ul className="space-y-4">
          {page.games.map((item) => {
            const game = findGame(item.gameId)
            if (!game) return null
            const gamePage = gamePageFor(item.gameId)
            return (
              <li key={item.gameId} className="space-y-3 rounded-lg border bg-card p-5 shadow-soft-sm">
                <div className="flex items-center gap-3">
                  <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-md text-2xl', game.color)}>
                    <Emoji emoji={game.emoji} />
                  </span>
                  <h3 className="text-xl leading-tight">
                    {gamePage ? (
                      <Link to={`/spel/${gamePage.slug}`} className="underline-offset-4 hover:underline">
                        {game.name}
                      </Link>
                    ) : (
                      game.name
                    )}
                  </h3>
                </div>
                <p>{item.text}</p>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to={`/skapa?spel=${item.gameId}`}>
                    Spela {game.name}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
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
    </div>
  )
}
