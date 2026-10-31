import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Emoji } from '@/components/Emoji'
import { useThrows, type Throws } from '@/hooks/useReactions'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  findThrowItem,
  hitText,
  THROW_COOLDOWN_MS,
  THROW_ITEMS,
  throwCooldownSeconds,
  thrownText,
  type ThrowItem,
} from '@/lib/kast'
import { cn } from '@/lib/utils'

// Kastraden: tomat, paj, ägg och toapapper. Tryck på en sak och välj vem den ska träffa. Är det bara en annan i
// lobbyn går kastet direkt. Efter ett kast är knapparna avstängda tills spärren gått ut. Visas inte när värden stängt
// av kasten, när man är ensam eller när ingen annan tar emot kast.
export function ThrowBar({ className }: { className?: string }) {
  const throws = useThrows()
  const lastThrowAt = throws?.lastThrowAt ?? null
  // Räknar ner spärren efter ett kast.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (lastThrowAt === null) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() - lastThrowAt >= THROW_COOLDOWN_MS) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [lastThrowAt])
  if (!throws?.allowed || throws.targets.length === 0) return null
  const wait = throwCooldownSeconds(lastThrowAt, now)

  return (
    <div role="group" aria-label="Kasta något" className={cn('flex flex-col items-center gap-1.5', className)}>
      <p className="text-sm font-semibold text-muted-foreground tabular-nums" aria-live="polite">
        {wait > 0 ? `Du kan kasta igen om ${wait} s` : 'Kasta något'}
      </p>
      <div className="flex gap-1.5 sm:gap-2">
        {THROW_ITEMS.map((item) => (
          <ThrowButton key={item.id} item={item} throws={throws} disabled={wait > 0} />
        ))}
      </div>
    </div>
  )
}

function ThrowButton({ item, throws, disabled }: { item: ThrowItem; throws: Throws; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const only = throws.targets.length === 1 ? throws.targets[0] : null
  const look = 'h-12 w-11 text-2xl sm:w-14'
  const icon = <Emoji emoji={item.emoji} />

  if (only) {
    return (
      <Button
        variant="outline"
        className={look}
        disabled={disabled}
        aria-label={`Kasta ${item.text} på ${only.name}`}
        onClick={() => throws.throwAt(only.id, item.id)}
      >
        {icon}
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={look} disabled={disabled} aria-label={`Kasta ${item.text}`}>
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3">
        <p className="text-center font-heading font-bold">Kasta {item.text} på…</p>
        <div className="grid grid-cols-2 gap-2">
          {throws.targets.map((target) => (
            <Button
              key={target.id}
              variant="outline"
              className="h-12 min-w-0 justify-start gap-2 px-3"
              onClick={() => {
                throws.throwAt(target.id, item.id)
                setOpen(false)
              }}
            >
              <Emoji emoji={target.avatar} className="text-xl" />
              <span className="truncate">{target.name}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Bekräftelsen för den som kastade: saken gör en volt och "Du kastade en tomat på Lisa!" står kvar en stund.
export function ThrownConfirm() {
  const thrown = useThrows()?.thrown
  const item = thrown && findThrowItem(thrown.item)
  if (!thrown || !item) return null
  return (
    <div
      key={thrown.key}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-30 flex justify-center px-4 motion-safe:animate-thrown-life motion-reduce:animate-thrown-life"
    >
      <p className="flex max-w-full items-center gap-3 rounded-full border bg-card py-2 pr-5 pl-3 font-heading text-base font-bold shadow-soft motion-safe:animate-pop sm:text-lg">
        <span className="inline-block text-4xl leading-none motion-safe:animate-toss">
          <Emoji emoji={item.emoji} />
        </span>
        <span className="min-w-0">{thrownText(item, thrown.to)}</span>
      </p>
    </div>
  )
}

// Det som träffar mig: saken flyger in och träffar på sitt eget sätt i övre delen av skärmen, med "Oscar kastade en
// tomat på dig!" ovanför, som poppar fram vid träffen. Borta efter 2 sekunder och tar inga tryck. Platsen och storleken räknades ut när kastet kom
// in (measureSplatPlace i splatt.ts): stor i lobbyn, och i spelet aldrig över svarsdelen eller korten.
// Med "minska rörelse" står allt still i sitt slutläge och tonas bort.
export function SplatOverlay() {
  const splat = useThrows()?.splat
  const item = splat && findThrowItem(splat.item)
  if (!splat || !item) return null
  const { top, size } = splat.place
  // Raden med texten överst, och scenen för träffen under på resten av platsen.
  const big = size >= 400
  const stage = Math.round(size - (big ? 48 : 36))

  return (
    <div
      key={splat.key}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center motion-safe:animate-splat-life motion-reduce:animate-splat-fade"
      style={{ top, height: size }}
    >
      <p
        className={cn(
          'relative z-10 max-w-[90vw] rounded-full border bg-card px-4 py-1 text-center font-bold whitespace-nowrap shadow-soft motion-safe:animate-hit-label',
          big ? 'text-lg' : 'text-sm sm:text-base',
        )}
      >
        {hitText(splat.from, item)}
      </p>
      {/* Hela scenen får en kort stöt när saken slår i, och en ring slår ut från träffpunkten. */}
      <div className="relative mt-auto motion-safe:animate-impact-shake">
        <span
          className="absolute top-1/2 left-1/2 rounded-full border-4 border-foreground/15 opacity-0 motion-safe:animate-impact-ring"
          style={{ width: stage * 0.6, height: stage * 0.6 }}
        />
        {item.id === 'tomat' && <TomatoHit size={stage} />}
        {item.id === 'paj' && <PieHit size={stage} />}
        {item.id === 'agg' && <EggHit size={stage} />}
        {item.id === 'toapapper' && <PaperHit size={stage} />}
      </div>
    </div>
  )
}

// En liten bit som flyger iväg från mitten (stänk, skalbitar). x och y = var den hamnar, i bråkdelar av scenen.
type Piece = { x: number; y: number; size: number; turn?: number }

// CSS-variablerna som rörelserna i index.css läser: --x och --y (vart biten flyger), --r (hur mycket den snurrar)
// och --slide (hur långt något glider neråt).
function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties
}

// Saken som flyger in och plattas till när den slår i skärmen.
function Flying({ emoji, size }: { emoji: string; size: number }) {
  return (
    <span className="absolute top-1/2 left-1/2 -translate-1/2 leading-none" style={{ fontSize: size }}>
      <span className="inline-block motion-safe:animate-throw-smash">
        <Emoji emoji={emoji} />
      </span>
    </span>
  )
}

// Tomaten plattas till och sprutar ut i en röd fläck med stänk och några kärnor. Två droppar rinner en bit.
function TomatoHit({ size }: { size: number }) {
  const drops: Piece[] = [
    { x: -0.42, y: -0.3, size: 0.07 },
    { x: 0.4, y: -0.34, size: 0.05 },
    { x: 0.46, y: 0.1, size: 0.06 },
    { x: -0.46, y: 0.14, size: 0.05 },
    { x: 0.08, y: -0.46, size: 0.045 },
    { x: -0.14, y: 0.42, size: 0.05 },
    { x: 0.3, y: 0.38, size: 0.04 },
    { x: -0.3, y: -0.44, size: 0.035 },
  ]
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full origin-center motion-safe:animate-splat-blob">
        <path
          className="fill-destructive"
          d="M50 22C62 18 70 30 78 28C88 26 86 40 80 46C90 52 86 64 76 64C78 76 66 82 58 76C52 86 40 84 38 74C28 80 18 72 24 62C12 58 14 44 26 42C20 30 34 22 42 28C44 22 47 22 50 22Z"
        />
        <ellipse className="fill-sun-soft" cx="44" cy="46" rx="2.4" ry="1.4" transform="rotate(-20 44 46)" />
        <ellipse className="fill-sun-soft" cx="57" cy="53" rx="2.4" ry="1.4" transform="rotate(25 57 53)" />
        <ellipse className="fill-sun-soft" cx="48" cy="61" rx="2.4" ry="1.4" transform="rotate(-5 48 61)" />
        <ellipse className="fill-sun-soft" cx="61" cy="41" rx="2.4" ry="1.4" transform="rotate(40 61 41)" />
        {/* Glansen gör fläcken blöt. */}
        <ellipse className="fill-card opacity-40" cx="40" cy="36" rx="7" ry="3.5" transform="rotate(-25 40 36)" />
      </svg>
      {[20, 65, 115, 160, 205, 250, 295, 340].map((angle, i) => (
        <span
          key={`strale-${angle}`}
          className="absolute top-1/2 left-1/2 rounded-full bg-destructive motion-safe:animate-streak"
          style={{
            width: size * 0.025,
            height: size * (i % 2 ? 0.1 : 0.14),
            ...vars({ '--a': `${angle}deg`, '--d': `${size * (i % 2 ? 0.36 : 0.44)}px` }),
            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(${-size * (i % 2 ? 0.36 : 0.44)}px)`,
          }}
        />
      ))}
      {drops.map((drop, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full bg-destructive motion-safe:animate-splash-drop"
          style={{
            width: drop.size * size,
            height: drop.size * size,
            ...vars({ '--x': `${drop.x * size}px`, '--y': `${drop.y * size}px` }),
            transform: `translate(calc(-50% + ${drop.x * size}px), calc(-50% + ${drop.y * size}px))`,
          }}
        />
      ))}
      <Drips
        color="bg-destructive"
        drips={[
          { left: 39, top: 70, length: 20 },
          { left: 57, top: 68, length: 14, delay: 0.85 },
        ]}
      />
      <Flying emoji="🍅" size={size * 0.42} />
    </div>
  )
}

// Pajen smäller mot skärmen och trycks platt. Skalet går sönder i bitar som faller, och fyllningen glider neråt.
function PieHit({ size }: { size: number }) {
  const crumbs: Piece[] = [
    { x: -0.36, y: 0.5, size: 0.26, turn: -130 },
    { x: 0.34, y: 0.55, size: 0.24, turn: 140 },
    { x: -0.12, y: 0.66, size: 0.2, turn: 70 },
    { x: 0.16, y: 0.46, size: 0.22, turn: -80 },
  ]
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Sliding size={size}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full origin-center motion-safe:animate-splat-blob">
          <path
            className="fill-card stroke-border"
            strokeWidth="1.2"
            d="M48 18C58 14 66 24 74 22C84 22 84 34 80 40C90 46 88 58 80 62C82 72 72 78 64 74C58 84 44 84 40 76C30 82 18 74 22 64C12 58 14 44 24 40C20 30 30 20 38 24C40 19 44 18 48 18Z"
          />
          <path className="fill-sun" d="M36 38C44 30 60 30 66 38C74 44 72 56 64 62C56 68 42 68 36 60C28 54 28 44 36 38Z" />
          <path className="fill-sun-soft" d="M44 42C50 38 58 40 60 46C60 52 54 55 48 54C42 52 40 46 44 42Z" />
          <path className="fill-crown" d="M22 46l6-5 4 6-7 3z M74 34l6 3-3 6-5-3z M70 66l6-1 0 6-6 0z M34 70l5 2-2 5-5-2z M50 20l5 1-1 5-5-1z" />
        </svg>
        <Drips
          color="bg-sun"
          drips={[
            { left: 38, top: 64, length: 18 },
            { left: 50, top: 66, length: 26, delay: 0.8 },
            { left: 62, top: 63, length: 14, delay: 0.95 },
          ]}
        />
      </Sliding>
      {crumbs.map((crumb, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 bg-crown opacity-0 [clip-path:polygon(0_20%,60%_0,100%_45%,70%_100%,15%_80%)] motion-safe:animate-crumb-fall"
          style={{
            width: crumb.size * size,
            height: crumb.size * size * 0.7,
            ...vars({ '--x': `${crumb.x * size}px`, '--y': `${crumb.y * size}px`, '--r': `${crumb.turn}deg` }),
          }}
        />
      ))}
      <Flying emoji="🥧" size={size * 0.45} />
    </div>
  )
}

// Ägget knäcks: skalhalvorna ramlar ner och gulan och vitan rinner neråt.
function EggHit({ size }: { size: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Sliding size={size}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full origin-center motion-safe:animate-splat-blob">
          <path
            className="fill-card stroke-border"
            strokeWidth="1.5"
            d="M50 26C64 22 78 32 76 46C80 58 70 70 56 68C46 76 30 70 28 58C18 50 26 34 38 32C42 28 46 27 50 26Z"
          />
          {/* Gulan dallrar till när den landar. */}
          <g className="origin-center [transform-box:fill-box] motion-safe:animate-jiggle">
            <circle className="fill-sun" cx="50" cy="48" r="13" />
            <circle className="fill-sun-soft" cx="45" cy="43" r="3.5" />
          </g>
        </svg>
        <Drips color="bg-sun" drips={[{ left: 48, top: 60, length: 24 }]} />
        <Drips color="border bg-card" drips={[{ left: 33, top: 64, length: 16, delay: 0.85 }]} />
      </Sliding>
      {[
        { x: -0.28, y: 0.55, turn: -55, flip: false },
        { x: 0.28, y: 0.55, turn: 55, flip: true },
      ].map((half, i) => (
        <svg
          key={i}
          viewBox="0 0 50 64"
          className="absolute top-1/2 left-1/2 opacity-0 motion-safe:animate-crumb-fall"
          style={{
            width: size * 0.26,
            height: size * 0.33,
            ...vars({ '--x': `${half.x * size}px`, '--y': `${half.y * size}px`, '--r': `${half.turn}deg` }),
          }}
        >
          <path
            className="fill-card stroke-border"
            strokeWidth="2"
            transform={half.flip ? 'translate(50 0) scale(-1 1)' : undefined}
            d="M46 4C24 4 4 26 4 42C4 54 16 62 30 62L36 54L30 46L40 38L33 28L42 20L36 12Z"
          />
        </svg>
      ))}
      <Flying emoji="🥚" size={size * 0.4} />
    </div>
  )
}

// Toapappret studsar in och rullas ut i en lång remsa över skärmen. Sedan faller rullen undan.
function PaperHit({ size }: { size: number }) {
  // Bredare än de andra, men aldrig bredare än skärmen.
  const width = `min(${Math.round(size * 1.5)}px, 94vw)`
  const height = Math.round(size * 0.8)
  return (
    <div className="relative shrink-0" style={{ width, height }}>
      <svg
        viewBox="0 0 150 80"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full motion-safe:animate-paper-sag"
        style={vars({ '--slide': `${height * 0.08}px` })}
      >
        {[
          { d: 'M4 30C25 5 45 55 70 28S115 5 146 34', delay: '0.1s' },
          { d: 'M70 28C74 45 62 58 70 76', delay: '0.5s' },
        ].map((strand) => (
          <g key={strand.d}>
            {/* En kant i border-färgen under, och själva pappret ovanpå. */}
            {[
              { color: 'stroke-border', width: 9 },
              { color: 'stroke-card', width: 7 },
            ].map((line) => (
              <path
                key={line.color}
                d={strand.d}
                className={cn('fill-none motion-safe:animate-ribbon-draw', line.color)}
                strokeWidth={line.width}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                style={{ animationDelay: strand.delay }}
              />
            ))}
          </g>
        ))}
      </svg>
      <span
        className="absolute top-[2%] right-0 leading-none motion-safe:animate-paper-roll"
        style={{ fontSize: size * 0.32, ...vars({ '--from': `calc(${width} * -0.85)` }) }}
      >
        <Emoji emoji="🧻" />
      </span>
    </div>
  )
}

// Droppar som rinner ner från fläcken: smala, långa och rundade nertill. left, top och length i procent av scenen.
function Drips({ color, drips }: { color: string; drips: { left: number; top: number; length: number; delay?: number }[] }) {
  return drips.map((drip, i) => (
    <span
      key={i}
      className={cn('absolute w-[3.5%] origin-top rounded-b-full motion-safe:animate-drip', color)}
      style={{
        left: `${drip.left}%`,
        top: `${drip.top}%`,
        height: `${drip.length}%`,
        animationDelay: drip.delay ? `${drip.delay}s` : undefined,
      }}
    />
  ))
}

// Det som glider neråt efter träffen (pajens fyllning, ägget) och sträcks ut lite när det rinner. Stannar inom scenen.
function Sliding({ size, children }: { size: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 origin-top motion-safe:animate-slide-down" style={vars({ '--slide': `${size * 0.16}px` })}>
      {children}
    </div>
  )
}

// Mitt val att ta emot kast. Den som stängt av syns inte som mål för de andra.
export function AcceptThrowsChoice() {
  const throws = useThrows()
  if (!throws) return null
  return <AcceptThrowsToggle on={throws.acceptsThrows} onChange={throws.setAcceptsThrows} />
}

// Rubriken och en liten växlare med På och Av sida vid sida, på samma rad när det får plats. Används i väntrummet
// och på profilsidan.
export function AcceptThrowsToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const labelId = useId()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <p id={labelId} className="font-bold">
        Ta emot kast
      </p>
      <div role="group" aria-labelledby={labelId} className="flex rounded-full bg-muted p-1">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={on === value}
            onClick={() => onChange(value)}
            className={cn(
              'h-9 min-w-14 rounded-full px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              on === value ? 'bg-card text-foreground shadow-soft-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value ? 'På' : 'Av'}
          </button>
        ))}
      </div>
    </div>
  )
}
