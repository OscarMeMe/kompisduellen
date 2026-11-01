import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playersLabel, type GameInfo } from '@/lib/games'
import { createLobbyHref, type TillfalleId } from '@/lib/tillfallen'
import { gamePageFor } from '@/lib/spelsidor'
import { cn } from '@/lib/utils'

// Små förhandsvisningar med egen karaktär för varje spel. De är bara dekoration (göms för skärmläsare), och texten i dem
// är påhittad för att visa idén, inte riktiga rundor eller spelare.
// De får liv när man håller musen över kortet (group-hover), och på pekskärmar en gång när kortet syns eller när man
// trycker på det (group-data-[play=true]). Allt med motion-safe:, så att det stängs av med "minska rörelse".
const PREVIEWS: Record<string, ReactNode> = {
  'gissa-priset': (
    // En prislapp som hänger i ett snöre. Den svänger till medan påhittade priser rullar förbi som på en spelautomat, och
    // landar på frågetecknet igen. Tryck på bilden så börjar det om. Priserna är påhittade, så att inga svar avslöjas.
    <svg viewBox="-8 -10 172 94" className="h-20 w-auto overflow-visible">
      <g className="origin-[10px_-6px] -rotate-3 motion-safe:group-hover:animate-tag-swing motion-safe:group-data-[play=true]:animate-tag-swing">
        <path d="M10 -6 C14 12 22 28 36 42" fill="none" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M46 6 H150 a8 8 0 0 1 8 8 V70 a8 8 0 0 1 -8 8 H46 a8 8 0 0 1 -5.7 -2.3 L8 48 a8 8 0 0 1 0 -11.6 L40.3 8.3 A8 8 0 0 1 46 6 Z"
          className="fill-card stroke-border"
          strokeWidth="2"
        />
        <circle cx="36" cy="42" r="6" className="fill-sun-soft stroke-border" strokeWidth="2" />
        <clipPath id="prislapp-fonster">
          <rect x="48" y="8" width="108" height="68" />
        </clipPath>
        <g clipPath="url(#prislapp-fonster)">
          <g className="motion-safe:group-hover:animate-tag-roll motion-safe:group-data-[play=true]:animate-tag-roll">
            <text x="100" y="60" textAnchor="middle" fontSize="50" className="fill-primary font-heading font-bold">
              ?
            </text>
            {['38 kr', '460 kr', '7 kr', '925 kr'].map((price, i) => (
              <text key={price} x="100" y={106 + i * 60} textAnchor="middle" fontSize="26" className="fill-foreground font-heading font-bold">
                {price}
              </text>
            ))}
            <text x="100" y="360" textAnchor="middle" fontSize="50" className="fill-primary font-heading font-bold">
              ?
            </text>
          </g>
        </g>
      </g>
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
    // Korten vecklar ut sig, och de två svarskorten vänds upp från baksidan ett i taget (animate-flip, som i spelet).
    <div className="flex items-center [&>div]:transition-[rotate,translate] [&>div]:duration-300 [&>div]:ease-out">
      <div className="-mr-3 -rotate-6 rounded-md bg-foreground px-4 py-3 whitespace-nowrap text-background shadow-soft-sm motion-safe:group-hover:-translate-x-2 motion-safe:group-hover:-rotate-12 motion-safe:group-data-[play=true]:-translate-x-2 motion-safe:group-data-[play=true]:-rotate-12">
        <p className="font-heading text-sm leading-tight font-bold">Jag älskar</p>
        <p className="font-heading text-sm font-bold">____</p>
      </div>
      <div className="rotate-6 flex flex-col items-start gap-1 motion-safe:group-hover:translate-x-2 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-12 motion-safe:group-data-[play=true]:translate-x-2 motion-safe:group-data-[play=true]:-translate-y-1 motion-safe:group-data-[play=true]:rotate-12">
        <FlippingAnswer text="Farsans strumpor" delay={150} />
        <FlippingAnswer text="Hundbajspåsar" delay={400} />
      </div>
    </div>
  ),
  imposterjakten: (
    // En mörk scen med en rad figurer. Spotlighten söker över spelarna och stannar på impostern, som då blir röd med
    // glasögon och vickar till. Utan rörelse står ljuset på impostern direkt.
    <svg viewBox="0 0 220 84" className="h-22 w-auto">
      <rect width="220" height="84" rx="14" className="fill-foreground" />
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
      <g className="origin-[138px_60px] motion-safe:group-hover:animate-wiggle motion-safe:group-data-[play=true]:animate-wiggle" style={{ animationDelay: '1.5s' }}>
        <circle cx="138" cy="42" r="14" className="fill-destructive" />
        <path d="M117 84 a21 24 0 0 1 42 0 Z" className="fill-destructive" />
        <rect x="124" y="36" width="13" height="10" rx="3.5" className="fill-foreground" />
        <rect x="139" y="36" width="13" height="10" rx="3.5" className="fill-foreground" />
        <rect x="136" y="39" width="4" height="2" className="fill-foreground" />
        <circle cx="128" cy="39" r="1.3" className="fill-card" />
        <circle cx="143" cy="39" r="1.3" className="fill-card" />
      </g>
      {/* Täcker impostern medan ljuset söker, så att den ser ut som de andra tills ljuset stannar. */}
      <g className="fill-sky-soft opacity-0 motion-safe:group-hover:animate-spot-hide motion-safe:group-data-[play=true]:animate-spot-hide">
        <circle cx="138" cy="42" r="15" />
        <path d="M116 84 a22 25 0 0 1 44 0 Z" />
      </g>
      <path
        d="M126 0 H150 L184 84 H92 Z"
        className="fill-sun opacity-45 motion-safe:group-hover:animate-spot-sweep motion-safe:group-data-[play=true]:animate-spot-sweep"
      />
    </svg>
  ),
}

// Ett svarskort på Kortkaos spelkort. Det ligger med baksidan upp tills delay (ms) har gått.
function FlippingAnswer({ text, delay }: { text: string; delay: number }) {
  return (
    <div className="perspective-[600px]">
      <div
        className="relative transform-3d motion-safe:group-hover:animate-flip motion-safe:group-data-[play=true]:animate-flip"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="rounded-md border bg-card px-3 py-1.5 whitespace-nowrap shadow-soft-sm backface-hidden">
          <p className="font-heading text-xs leading-tight font-bold">{text}</p>
        </div>
        <div className="absolute inset-0 flex rotate-y-180 items-center justify-center rounded-md border-2 border-background/40 bg-foreground shadow-soft-sm backface-hidden">
          <span className="font-heading text-sm font-bold text-background/70">?</span>
        </div>
      </div>
    </div>
  )
}

type SpelKortProps = {
  // Varför spelet passar det valda tillfället, och tillfället som följer med till lobbyn.
  note?: string
  tillfalle?: TillfalleId
  game: GameInfo
  // Kortet lyser upp en kort stund när besökaren tryckt på Välj spel.
  highlight?: boolean
  onShowRules: () => void
}

// Ett spelkort på startsidan: förhandsvisning, namn, spelarantal och känsla, kort beskrivning och två tydliga knappar.
// Kortet är inte en enda stor klickyta, så att reglerna och Skapa lobby inte konkurrerar.
export function SpelKort({ game, highlight = false, note, tillfalle = 'alla', onShowRules }: SpelKortProps) {
  const { ref, playing, play } = usePlayOnce()
  // Ny key vid varje tryck, så att bildens rörelse börjar om, även när musen redan är över kortet.
  const [plays, setPlays] = useState(0)
  const page = gamePageFor(game.id)
  return (
    <article
      ref={ref}
      data-play={playing}
      data-spel={game.id}
      className={cn(
        // Lyfter lite med större skugga när musen är över kortet (hover gäller bara enheter med mus).
        'group flex h-full flex-col overflow-hidden rounded-lg bg-spel-yta text-spel-text shadow-soft transition-[translate,box-shadow] duration-300 ease-out hover:shadow-lift motion-safe:hover:-translate-y-1',
        highlight && 'motion-safe:animate-pop ring-4 ring-primary/40',
      )}
    >
      <div
        className="relative flex h-28 items-center justify-center"
        onClick={() => {
          setPlays((n) => n + 1)
          play()
        }}
      >
        {/* Med fyra kort i bredd är korten smalare, så bilderna krymper lite för att inte nå kanten. */}
        <div key={plays} aria-hidden className="flex w-full origin-bottom items-center justify-center pt-6 xl:scale-85">
          {PREVIEWS[game.id]}
        </div>
        {game.feel && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-card px-3 py-0.5 text-sm font-bold text-foreground shadow-soft-sm">{game.feel}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold opacity-80">
            {[playersLabel(game), page?.time].filter(Boolean).join(' · ')}
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
        <p className="leading-snug opacity-90">{game.tagline}</p>
        {note && <p className="text-sm font-bold">{note}</p>}
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Button variant="link" className="h-11 w-fit px-0 text-spel-text" onClick={onShowRules}>
            <Info aria-hidden />
            Så spelar man
          </Button>
          <Button asChild size="lg" className="w-full bg-spel-knapp text-spel-knapp-text shadow-none hover:bg-spel-knapp/90">
            <Link to={createLobbyHref(game.id, tillfalle)}>
              Skapa lobby
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

// Så länge räknas animationen som igång på pekskärmar. Spotlighten i Imposterjakten är längst.
const PLAY_MS = 2000

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
    timer.current = setTimeout(() => setPlaying(false), PLAY_MS)
  }

  useEffect(() => {
    const element = ref.current
    if (!element || !window.matchMedia('(hover: none)').matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setPlaying(true)
        timer.current = setTimeout(() => setPlaying(false), PLAY_MS)
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
