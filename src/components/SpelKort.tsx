import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info } from 'lucide-react'
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
    // En prislapp med ett frågetecken, som vickar till.
    <svg
      viewBox="0 0 164 84"
      className="h-18 w-auto -rotate-6 drop-shadow-sm motion-safe:group-hover:animate-wiggle motion-safe:group-data-[play=true]:animate-wiggle"
    >
      <path
        d="M46 6 H150 a8 8 0 0 1 8 8 V70 a8 8 0 0 1 -8 8 H46 a8 8 0 0 1 -5.7 -2.3 L8 48 a8 8 0 0 1 0 -11.6 L40.3 8.3 A8 8 0 0 1 46 6 Z"
        className="fill-card stroke-border"
        strokeWidth="2"
      />
      <circle cx="36" cy="42" r="6" className="fill-sun-soft stroke-border" strokeWidth="2" />
      <text x="100" y="60" textAnchor="middle" fontSize="50" className="fill-primary font-heading font-bold">
        ?
      </text>
    </svg>
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
    // En mörk scen med en rad figurer. Ljuskäglan står på den med masken, som vickar till.
    <svg viewBox="0 0 220 84" className="h-22 w-auto">
      <rect width="220" height="84" rx="14" className="fill-foreground" />
      <path d="M126 0 H150 L184 84 H92 Z" className="fill-sun" opacity="0.45" />
      {[
        [34, 'fill-sky'],
        [80, 'fill-mint'],
        [188, 'fill-lilac'],
      ].map(([x, color]) => (
        <g key={x} className={String(color)} opacity="0.75">
          <circle cx={Number(x)} cy="42" r="13" />
          <path d={`M${Number(x) - 19} 84 a19 22 0 0 1 38 0 Z`} />
        </g>
      ))}
      <g className="origin-[138px_60px] motion-safe:group-hover:animate-wiggle motion-safe:group-data-[play=true]:animate-wiggle">
        <circle cx="138" cy="42" r="14" className="fill-primary" />
        <path d="M117 84 a21 24 0 0 1 42 0 Z" className="fill-primary" />
        <path
          d="M122 38 Q130 33 138 38 Q146 33 154 38 Q155 48 146 48 Q140 48 138 44 Q136 48 130 48 Q121 48 122 38 Z"
          className="fill-foreground"
        />
        <circle cx="131" cy="41" r="2.4" className="fill-card" />
        <circle cx="145" cy="41" r="2.4" className="fill-card" />
      </g>
    </svg>
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
