import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playersLabel, type GameInfo } from '@/lib/games'
import { gamePageFor } from '@/lib/spelsidor'
import { cn } from '@/lib/utils'

// Små förhandsvisningar med egen karaktär för varje spel. De är bara dekoration (göms för skärmläsare), och texten i dem
// är påhittad för att visa idén, inte riktiga rundor eller spelare.
// De får liv när man håller musen över kortet (group-hover), och på pekskärmar en gång när kortet syns eller när man
// trycker på det (group-data-[play=true]). Allt med motion-safe:, så att det stängs av med "minska rörelse".
const PREVIEWS: Record<string, ReactNode> = {
  'gissa-priset': (
    <div className="-rotate-3 rounded-md border bg-card px-5 py-2 shadow-soft-sm motion-safe:group-hover:animate-wiggle motion-safe:group-data-[play=true]:animate-wiggle">
      <p className="font-heading text-3xl font-bold tabular-nums">
        {/* Frågetecknen rullar in ett i taget, som på en spelautomat. */}
        {[0, 90, 180].map((delay) => (
          <span key={delay} className="inline-block overflow-hidden align-bottom">
            <span
              className="inline-block motion-safe:group-hover:animate-slot motion-safe:group-data-[play=true]:animate-slot"
              style={{ animationDelay: `${delay}ms` }}
            >
              ?
            </span>
          </span>
        ))}{' '}
        kr
      </p>
    </div>
  ),
  narmast: (
    <div className="w-full max-w-[14rem] px-2">
      {/* Prickarna och reglaget glider till nya platser, och tillbaka när musen går därifrån. */}
      <div className="relative h-2 rounded-full bg-card/80 [&>span]:transition-[left] [&>span]:duration-500 [&>span]:ease-out">
        <span className="absolute top-1/2 left-[22%] size-4 -translate-y-1/2 rounded-full bg-sky shadow-soft-sm motion-safe:group-hover:left-[40%] motion-safe:group-data-[play=true]:left-[40%]" />
        <span className="absolute top-1/2 left-[78%] size-4 -translate-y-1/2 rounded-full bg-mint shadow-soft-sm motion-safe:group-hover:left-[64%] motion-safe:group-data-[play=true]:left-[64%]" />
        <span className="absolute top-1/2 left-[56%] size-6 -translate-x-1/4 -translate-y-1/2 rounded-full border-4 border-primary bg-card shadow-soft-sm motion-safe:group-hover:left-[30%] motion-safe:group-data-[play=true]:left-[30%]" />
      </div>
      <div className="mt-2 flex justify-between font-heading text-sm font-bold text-muted-foreground">
        <span>1</span>
        <span>100</span>
      </div>
    </div>
  ),
  kortkaos: (
    // Korten vecklar ut sig som en hand med kort.
    <div className="flex items-center [&>div]:transition-[rotate,translate] [&>div]:duration-300 [&>div]:ease-out">
      <div className="-mr-3 -rotate-6 rounded-md bg-foreground px-4 py-3 whitespace-nowrap text-background shadow-soft-sm motion-safe:group-hover:-translate-x-2 motion-safe:group-hover:-rotate-12 motion-safe:group-data-[play=true]:-translate-x-2 motion-safe:group-data-[play=true]:-rotate-12">
        <p className="font-heading text-sm leading-tight font-bold">Jag älskar</p>
        <p className="font-heading text-sm font-bold">____</p>
      </div>
      <div className="rotate-6 rounded-md border bg-card px-3 py-3 whitespace-nowrap shadow-soft-sm motion-safe:group-hover:translate-x-2 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-12 motion-safe:group-data-[play=true]:translate-x-2 motion-safe:group-data-[play=true]:-translate-y-1 motion-safe:group-data-[play=true]:rotate-12">
        <p className="font-heading text-sm leading-tight font-bold">Farsans strumpor</p>
      </div>
    </div>
  ),
  imposterjakten: (
    // Tre ordkort i rad, två med samma ord och ett med frågetecken. Korten glider isär, frågetecknet vickar till och
    // ett förstoringsglas glider fram och stannar över det. Då får kortet en korallröd kant, som att impostern hittats.
    <div className="relative flex items-center gap-1.5 [&>div]:transition-[translate,border-color] [&>div]:duration-300 [&>div]:ease-out">
      <div className="-rotate-6 rounded-md border bg-card px-2.5 py-2 shadow-soft-sm motion-safe:group-hover:-translate-x-2 motion-safe:group-data-[play=true]:-translate-x-2">
        <p className="font-heading text-xs font-bold">Paraply</p>
      </div>
      <div className="rounded-md border bg-card px-2.5 py-2 shadow-soft-sm motion-safe:group-hover:-translate-y-1 motion-safe:group-data-[play=true]:-translate-y-1">
        <p className="font-heading text-xs font-bold">Paraply</p>
      </div>
      <div className="rotate-6 rounded-md border-2 bg-card px-3 py-1.5 shadow-soft-sm delay-200 group-hover:border-primary group-data-[play=true]:border-primary motion-safe:group-hover:translate-x-2 motion-safe:group-hover:animate-wiggle motion-safe:group-data-[play=true]:translate-x-2 motion-safe:group-data-[play=true]:animate-wiggle">
        <p className="font-heading text-sm font-bold text-primary">???</p>
      </div>
      <Search
        className="absolute -right-12 -bottom-4 size-8 rotate-12 opacity-0 transition-[translate,rotate,opacity] delay-150 duration-500 ease-out motion-safe:group-hover:-translate-x-9 motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:rotate-0 motion-safe:group-hover:opacity-100 motion-safe:group-data-[play=true]:-translate-x-9 motion-safe:group-data-[play=true]:-translate-y-2 motion-safe:group-data-[play=true]:rotate-0 motion-safe:group-data-[play=true]:opacity-100"
        strokeWidth={2.5}
      />
    </div>
  ),
}

type SpelKortProps = {
  game: GameInfo
  // Kortet lyser upp en kort stund när besökaren tryckt på Välj spel.
  highlight?: boolean
  onShowRules: () => void
}

// Ett spelkort på startsidan: förhandsvisning, namn, spelarantal och känsla, kort beskrivning och två tydliga knappar.
// Kortet är inte en enda stor klickyta, så att reglerna och Skapa lobby inte konkurrerar.
export function SpelKort({ game, highlight = false, onShowRules }: SpelKortProps) {
  const { ref, playing, play } = usePlayOnce()
  const page = gamePageFor(game.id)
  return (
    <article
      ref={ref}
      data-play={playing}
      className={cn(
        // Lyfter lite med större skugga när musen är över kortet (hover gäller bara enheter med mus).
        'group flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-soft transition-[translate,box-shadow] duration-300 ease-out hover:shadow-lift motion-safe:hover:-translate-y-1',
        highlight && 'motion-safe:animate-pop ring-4 ring-primary/40',
      )}
    >
      <div className={cn('relative flex h-28 items-center justify-center', game.color)} onClick={play}>
        <div aria-hidden className="flex w-full items-center justify-center pt-6">
          {PREVIEWS[game.id]}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">
            {[playersLabel(game), page?.time, game.feel].filter(Boolean).join(' · ')}
          </p>
          <h3 className="text-xl leading-tight">
            {/* Namnet leder till spelets egen sida med mer om spelet. */}
            {page ? (
              <Link to={`/spel/${page.slug}`} className="underline-offset-4 hover:underline">
                {game.name}
              </Link>
            ) : (
              game.name
            )}
          </h3>
        </div>
        <p className="leading-snug text-muted-foreground">{game.tagline}</p>
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Button variant="link" className="h-11 w-fit px-0 text-muted-foreground" onClick={onShowRules}>
            <Info aria-hidden />
            Så spelar man
          </Button>
          <Button asChild size="lg" className="w-full">
            <Link to={`/skapa?spel=${game.id}`}>
              Skapa lobby
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

// På pekskärmar (utan hover) spelas illustrationens animation en gång när kortet kommer in i bild, och igen när man
// trycker på den. playing är sant en kort stund, och då gäller group-data-[play=true]-klasserna.
function usePlayOnce() {
  const ref = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const play = () => {
    if (!window.matchMedia('(hover: none)').matches) return
    clearTimeout(timer.current)
    // Av och på igen, så att animationen börjar om även om den nyss spelats.
    setPlaying(false)
    requestAnimationFrame(() => setPlaying(true))
    timer.current = setTimeout(() => setPlaying(false), 900)
  }

  useEffect(() => {
    const element = ref.current
    if (!element || !window.matchMedia('(hover: none)').matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setPlaying(true)
        timer.current = setTimeout(() => setPlaying(false), 900)
      },
      { threshold: 0.6 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      clearTimeout(timer.current)
    }
  }, [])

  return { ref, playing, play }
}
