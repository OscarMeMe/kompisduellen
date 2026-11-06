import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playersLabel, type GameInfo } from '@/lib/games'
import { createLobbyHref, type TillfalleId } from '@/lib/tillfallen'
import { gamePageFor } from '@/lib/spelsidor'
import { cn } from '@/lib/utils'

// Små förhandsvisningar med egen karaktär för varje spel. De är bara dekoration (göms för skärmläsare), och texten i dem
// är påhittad för att visa idén, inte riktiga rundor eller spelare.
// De får liv en gång när kortet kommer i bild, och på pekskärmar igen när man trycker på det (group-data-[play=true]),
// och när man håller musen över kortet (group-hover). Mellan gångerna står de still. Allt med motion-safe:, så att det
// stängs av med "minska rörelse".
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
  tantpanik: (
    // Handen som en solfjäder till vänster och draghögen i mitten. Ett kort dras från högen, vänds och visar sig vara
    // en exploderande tant (svart kort, arg tant i röd kavaj som pekar på dig), och det smäller bakom henne. Spelas en gång när kortet syns och igen vid hover. Utan rörelse
    // ligger tanten redan uppvänd bredvid högen med smällen bakom sig.
    <svg viewBox="0 0 220 92" className="h-22 w-auto overflow-visible">
      {/* Min hand. Korten fläktar ut lite och lägger sig igen, ett i taget. */}
      <g>
        <g transform="rotate(-30 41 96)">
          <g
            className="origin-[41px_96px] motion-safe:group-hover:animate-fan-spread motion-safe:group-data-[play=true]:animate-fan-spread"
            style={{ '--fan': '-14deg', animationDelay: '0ms' } as CSSProperties}
          >
            <rect x="27" y="36" width="28" height="40" rx="4" className="fill-mint stroke-foreground/25" strokeWidth="1.5" />
            <circle cx="33" cy="42" r="2.6" className="fill-card" />
          </g>
        </g>
        <g transform="rotate(-15 41 96)">
          <g
            className="origin-[41px_96px] motion-safe:group-hover:animate-fan-spread motion-safe:group-data-[play=true]:animate-fan-spread"
            style={{ '--fan': '-7deg', animationDelay: '60ms' } as CSSProperties}
          >
            <rect x="27" y="36" width="28" height="40" rx="4" className="fill-sky stroke-foreground/25" strokeWidth="1.5" />
            <circle cx="33" cy="42" r="2.6" className="fill-card" />
          </g>
        </g>
        <g transform="rotate(0 41 96)">
          <g
            className="origin-[41px_96px] motion-safe:group-hover:animate-fan-spread motion-safe:group-data-[play=true]:animate-fan-spread"
            style={{ '--fan': '0deg', animationDelay: '120ms' } as CSSProperties}
          >
            <rect x="27" y="36" width="28" height="40" rx="4" className="fill-lilac stroke-foreground/25" strokeWidth="1.5" />
            <circle cx="33" cy="42" r="2.6" className="fill-card" />
          </g>
        </g>
        <g transform="rotate(15 41 96)">
          <g
            className="origin-[41px_96px] motion-safe:group-hover:animate-fan-spread motion-safe:group-data-[play=true]:animate-fan-spread"
            style={{ '--fan': '7deg', animationDelay: '180ms' } as CSSProperties}
          >
            <rect x="27" y="36" width="28" height="40" rx="4" className="fill-sun stroke-foreground/25" strokeWidth="1.5" />
            <circle cx="33" cy="42" r="2.6" className="fill-card" />
          </g>
        </g>
        <g transform="rotate(30 41 96)">
          <g
            className="origin-[41px_96px] motion-safe:group-hover:animate-fan-spread motion-safe:group-data-[play=true]:animate-fan-spread"
            style={{ '--fan': '14deg', animationDelay: '240ms' } as CSSProperties}
          >
            <rect x="27" y="36" width="28" height="40" rx="4" className="fill-coral-soft stroke-foreground/25" strokeWidth="1.5" />
            <circle cx="33" cy="42" r="2.6" className="fill-card" />
          </g>
        </g>
      </g>
      {/* Draghögen. */}
      <rect x="88" y="58" width="40" height="50" rx="5" transform="rotate(-6 108 80)" className="fill-foreground stroke-card" strokeWidth="2" />
      <rect x="92" y="56" width="40" height="50" rx="5" transform="rotate(4 112 78)" className="fill-foreground stroke-card" strokeWidth="2" />
      <rect x="90" y="54" width="40" height="50" rx="5" className="fill-foreground stroke-card" strokeWidth="2" />
      <text x="110" y="80" textAnchor="middle" fontSize="15" className="fill-card font-heading font-bold">
        ?
      </text>
      {/* Smällen bakom tanten. */}
      <g className="origin-center [transform-box:fill-box] motion-safe:group-hover:animate-tant-boom motion-safe:group-data-[play=true]:animate-tant-boom">
        <polygon points="168.0,-14.0 176.2,8.2 195.0,-6.1 189.9,17.0 213.5,15.2 196.7,31.9 217.5,43.1 194.4,48.0 205.8,68.7 183.7,60.4 182.1,84.0 168.0,65.0 153.9,84.0 152.3,60.4 130.2,68.7 141.6,48.0 118.5,43.1 139.3,31.9 122.5,15.2 146.1,17.0 141.0,-6.1 159.8,8.2" className="fill-sun" />
        <polygon points="168.0,2.0 174.5,18.1 189.9,10.0 184.5,26.5 201.5,30.1 186.7,39.3 197.4,53.0 180.2,50.6 179.6,67.9 168.0,55.0 156.4,67.9 155.8,50.6 138.6,53.0 149.3,39.3 134.5,30.1 151.5,26.5 146.1,10.0 161.5,18.1" className="fill-primary" />
      </g>
      {/* Kortet som dras: från högen upp till höger, där det vänds och visar tanten. */}
      <g transform="rotate(8 168 40)">
        <g className="origin-[168px_40px] motion-safe:group-hover:animate-tant-draw motion-safe:group-data-[play=true]:animate-tant-draw">
          {/* Den exploderande tanten, som på kortbilden: svart kort, blont hår med en grå slinga, svarta glasögon,
              pärlörhängen, röd kavaj och svart tröja. Arg blick och ett finger som pekar rakt på dig. */}
          <rect x="145" y="9" width="46" height="62" rx="6" className="fill-foreground stroke-card" strokeWidth="2" />
          <g transform="translate(68 0)">
            <circle cx="100" cy="15" r="4.5" className="fill-sun" />
            <ellipse cx="100" cy="26" rx="13" ry="9" className="fill-sun" />
            <path d="M93 19 Q97 22 96 28" fill="none" strokeWidth="2.4" strokeLinecap="round" className="stroke-muted-foreground" />
            <circle cx="100" cy="32" r="10" className="fill-coral-soft" />
            <circle cx="89.6" cy="35.5" r="1.7" className="fill-card stroke-foreground/30" strokeWidth="0.6" />
            <circle cx="110.4" cy="35.5" r="1.7" className="fill-card stroke-foreground/30" strokeWidth="0.6" />
            <path d="M91.5 26.5 L98 29.5 M108.5 26.5 L102 29.5" strokeWidth="2" strokeLinecap="round" className="stroke-foreground" />
            <circle cx="95.5" cy="32" r="3" fill="none" strokeWidth="2.2" className="stroke-foreground" />
            <circle cx="104.5" cy="32" r="3" fill="none" strokeWidth="2.2" className="stroke-foreground" />
            <path d="M98.5 32 H101.5" strokeWidth="1.6" className="stroke-foreground" />
            <path d="M95.5 39.5 Q100 36.5 104.5 39.5" fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-foreground" />
            <path d="M81 71 Q81 47 100 44 Q119 47 119 71 Z" className="fill-destructive" />
            <path d="M95 44.5 L100 53 L105 44.5 Z" className="fill-foreground" />
            {/* Armen kommer fram mot dig, och fingret pekar rakt ut ur kortet. */}
            <path d="M113 50 Q118 58 108 62" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-destructive" />
            <circle cx="105" cy="62" r="5" className="fill-coral-soft stroke-foreground/30" strokeWidth="1" />
            <circle cx="102" cy="64.5" r="3.2" className="fill-coral-soft stroke-foreground/40" strokeWidth="1" />
            <path d="M95 62 L92 61 M95.5 66 L92.5 67.5 M98 69 L96.5 71.5" strokeWidth="1.3" strokeLinecap="round" className="stroke-sun" />
          </g>
          {/* Baksidan, som syns tills kortet vänts. */}
          <g className="opacity-0 motion-safe:group-hover:animate-tant-cover motion-safe:group-data-[play=true]:animate-tant-cover">
            <rect x="145" y="9" width="46" height="62" rx="6" className="fill-foreground stroke-card" strokeWidth="2" />
            <text x="168" y="46" textAnchor="middle" fontSize="16" className="fill-card font-heading font-bold">
              ?
            </text>
          </g>
        </g>
      </g>
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
  // Kortets plats i listan, så att korten tonas in ett i taget.
  index?: number
  onShowRules: () => void
}

// Ett spelkort på startsidan: förhandsvisning, namn, spelarantal och känsla, kort beskrivning och två tydliga knappar.
// Kortet är inte en enda stor klickyta, så att reglerna och Skapa lobby inte konkurrerar.
export function SpelKort({ game, highlight = false, index = 0, note, tillfalle = 'alla', onShowRules }: SpelKortProps) {
  const { ref, playing, play } = usePlayOnce()
  const reveal = useRevealOnScroll(ref, highlight)
  // Ny key vid varje tryck, så att bildens rörelse börjar om, även när musen redan är över kortet.
  const [plays, setPlays] = useState(0)
  const page = gamePageFor(game.id)
  return (
    <article
      ref={ref}
      data-play={playing}
      data-spel={game.id}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && reveal.state === 'shown') reveal.done()
      }}
      style={reveal.state === 'shown' ? { animationDelay: `${index * 90}ms` } : undefined}
      className={cn(
        // Lyfter och lutar lite med större skugga när musen är över kortet (hover gäller bara enheter med mus), åt olika
        // håll varannan gång, och trycks ned lite när man trycker på det.
        'group flex h-full flex-col overflow-hidden rounded-lg bg-spel-yta text-spel-text shadow-soft transition-[translate,rotate,scale,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-lift motion-safe:hover:-translate-y-1 motion-safe:hover:-rotate-1 motion-safe:even:hover:rotate-1 motion-safe:active:scale-[0.98] motion-safe:active:duration-100',
        reveal.state === 'waiting' && 'opacity-0',
        reveal.state === 'shown' && 'motion-safe:animate-card-in',
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
          <Button asChild size="lg" className="w-full bg-spel-knapp text-spel-knapp-text shadow-none hover:bg-spel-knapp-hover hover:text-spel-knapp-hover-text">
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

// Så länge räknas animationen som igång. Spotlighten i Imposterjakten är längst.
const PLAY_MS = 2000

// Illustrationens animation spelas en gång när kortet kommer in i bild, och på pekskärmar (utan hover) igen när man
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
    if (!element) return
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

type RevealState = 'visible' | 'waiting' | 'shown'

// Korten tonas in underifrån när de kommer i bild, ett i taget (index i SpelKort). I förrenderingen och med "minska
// rörelse" syns de direkt. Kort som redan syns när sidan öppnas tonas också in, men bara en gång. Ett kort som hamnat
// ovanför skärmen (man scrollade förbi snabbt eller sidan öppnades längre ned) syns direkt utan rörelse, så att inget
// kort blir kvar osynligt. show = visa kortet direkt (när korten lyser upp efter Välj spel).
function useRevealOnScroll(ref: RefObject<HTMLElement | null>, show: boolean) {
  const [state, setState] = useState<RevealState>('visible')

  // Före första ritningen i webbläsaren, så att kortet inte hinner synas och sedan försvinna.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Bara i webbläsaren och före första ritningen: förrenderingen ska visa korten.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    setState('waiting')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const above = entry.boundingClientRect.bottom <= 0
        setState((current) => (current !== 'waiting' ? current : above ? 'visible' : 'shown'))
      },
      // Ytan ovanför skärmen räknas också, så att ett kort som hoppar från under skärmen till ovanför den (ett snabbt
      // svep eller en länk längre ned) också ger ett besked. rootMargin gäller bara med en uttalad root (även i en iframe).
      { root: element.ownerDocument, threshold: 0.15, rootMargin: '100000px 0px 0px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  // Ändras under ritningen i stället för i en effekt, så att kortet syns direkt.
  if (show && state !== 'visible') setState('visible')

  return { state, done: () => setState('visible') }
}
