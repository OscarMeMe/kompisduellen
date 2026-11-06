import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Hand, Minus, Plus } from 'lucide-react'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import { useReactions } from '@/hooks/useReactions'
import { loadSoundOn, playCountdownTick } from '@/lib/ljud'
import { tantMusic } from '@/lib/tantmusik'
import type { GameState } from '@/lib/match'
import type { TantMove, TantTable } from '@/lib/tantpanik'
import { NOPE_SECONDS, cardName, type CardType } from '@/lib/tantpanik-kort'
import { fanLayout, handCardWidth } from '@/lib/solfjader'
import { Stamp } from '@/components/Stamp'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { ValPopup } from '@/components/tantpanik/TantVal'
import { cn } from '@/lib/utils'

// Stegen som visas i mitten av bordet, ovanpå högarna: ett spelat kort som väntar på Nope!, korten jag tittat på, Ändra
// framtiden, Göm tanten och väntan på någon annan.


// Vinklar (grader) och förskjutning i sidled (andel av kortets bredd) när flera kort ligger omlott.
const SPREAD_ANGLES: Record<number, number[]> = { 1: [0], 2: [-6, 6], 3: [-8, 0, 8] }
const SPREAD_SHIFT = 0.2
// De sista sekunderna pulserar ramen och siffran, och det tickar.
const NOPE_HURRY_SECONDS = 2

// Ett spelat kort väntar på Nope!: kortet (eller paret, tretalet) stort, med en tjock ram i Nope!-kortets färg runt
// kortet som töms längs kanten medan tiden går. Under kortet "NOPE-CHANS!" och en stor siffra. De sista två sekunderna
// pulserar ramen och siffran, och det tickar (följer ljudknappen). Varje Nope! slås ned som en stämpel, och tiden börjar
// om. Texten längst ner är densamma för alla som inte spelade kortet och inte kan säga Nope!, så att den inte avslöjar
// vem som har kortet. Den som kan säga Nope! får ingen text, bara den stora knappen vid handen (TantHand).
export function NopeWindow({
  state,
  table,
  meId,
  clockOffset,
  canNope,
}: {
  state: GameState
  table: TantTable
  meId: string
  clockOffset: number
  canNope: boolean
}) {
  const pending = table.pending!
  const { secondsLeft, progress } = useCountdown(state.deadline, clockOffset, NOPE_SECONDS)
  const stopped = pending.nopes % 2 === 1
  const hurry = secondsLeft <= NOPE_HURRY_SECONDS && secondsLeft > 0
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  useEffect(() => {
    if (hurry && soundOn) {
      tantMusic.duck(400)
      playCountdownTick(secondsLeft)
    }
    // En gång per sekund, bara de sista sekunderna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const count = pending.cards.length
  const angles = SPREAD_ANGLES[count] ?? SPREAD_ANGLES[3]
  const mid = (count - 1) / 2
  const who = pending.by === meId ? 'Du' : name(pending.by)
  const what =
    pending.kind === 'pair'
      ? `ett par mot ${pending.target === meId ? 'dig' : name(pending.target!)}`
      : pending.kind === 'triple'
        ? `ett tretal och ber ${pending.target === meId ? 'dig' : name(pending.target!)} om ${cardName(pending.request!)}`
        : pending.target
          ? `${cardName(pending.cards[0])} på ${pending.target === meId ? 'dig' : name(pending.target)}`
          : cardName(pending.cards[0])
  const roleText = canNope ? null : pending.by === meId ? 'Vågar någon säga Nope?' : 'Någon kan säga Nope!'

  return (
    // Den som kan säga Nope! har en stor knapp till höger, så innehållet flyttar sig åt vänster.
    <section
      aria-label="Spelat kort"
      className={cn('flex size-full min-h-0 flex-col items-center justify-center gap-1.5 py-1', canNope && 'pr-28 sm:pr-0')}
    >
      <p className="rounded-full bg-card/90 px-3 py-1 text-center text-sm font-semibold shadow-soft-sm md:text-base">
        {who} spelade {what}.
      </p>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center p-3">
        <div
          className={cn('relative aspect-[107/147] max-h-full', pending.nopes > 0 && 'motion-safe:animate-stamp-shake')}
          key={pending.nopes}
          style={{ height: '100%', maxWidth: `calc((100% - 24px) / ${1 + SPREAD_SHIFT * 2 * mid})` }}
        >
          {/* Tiden: en tjock ram runt kortet som töms längs kanten. Den ligger utanför kortet och täcker ingen text. */}
          <svg
            aria-hidden
            className={cn(
              'pointer-events-none absolute -inset-2.5 z-30 size-[calc(100%+1.25rem)] overflow-visible',
              hurry && 'motion-safe:animate-light-pulse',
            )}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <rect x="0" y="0" width="100" height="100" rx="7" ry="5" fill="none" strokeWidth="7" vectorEffect="non-scaling-stroke" className="stroke-foreground/20" />
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              rx="7"
              ry="5"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - progress}
              className={cn(
                stopped ? 'stroke-destructive' : hurry ? 'stroke-destructive' : 'stroke-primary',
                'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-linear',
              )}
            />
          </svg>
          {pending.cards.map((type, i) => (
            <div
              key={i}
              className="absolute inset-0 origin-bottom motion-safe:animate-pop"
              style={{ transform: `translateX(${(i - mid) * SPREAD_SHIFT * 100}%) rotate(${angles[i]}deg)`, zIndex: i }}
            >
              <TantKort
                type={type}
                size="zoom"
                sizes="420px"
                className={cn('size-full drop-shadow-[0_18px_28px_rgb(0_0_0/0.4)]', stopped && 'grayscale-[60%]')}
              />
            </div>
          ))}
          {/* Ett Nope! per stämpel, åt olika håll. Den senaste slås ned. */}
          {Array.from({ length: pending.nopes }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              style={{ transform: `translateY(${(i - (pending.nopes - 1) / 2) * 18}%)` }}
            >
              <Stamp
                className={cn(
                  'bg-card/85 text-4xl md:text-6xl',
                  i % 2 === 1 && 'rotate-[10deg] border-accent-foreground text-accent-foreground',
                  i < pending.nopes - 1 && 'animate-none opacity-60',
                )}
              >
                Nope!
              </Stamp>
            </span>
          ))}
        </div>
      </div>
      {pending.nopes > 0 && (
        <p
          key={pending.nopes}
          role="status"
          className={cn(
            'rounded-full px-4 py-1 text-center font-heading font-bold shadow-soft-sm motion-safe:animate-pop md:text-lg',
            stopped ? 'bg-destructive text-primary-foreground' : 'bg-mint text-accent-foreground',
          )}
        >
          {stopped
            ? `Nope! ${name(pending.lastNopeBy!)} stoppade kortet.`
            : `Nope! ${name(pending.lastNopeBy!)} stoppade stoppet. Kortet gäller igen!`}
        </p>
      )}
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-primary-button px-3 py-1 font-heading text-base font-bold tracking-wide text-primary-foreground shadow-primary md:text-xl">
          <Hand aria-hidden className="size-5 md:size-6" />
          NOPE-CHANS!
        </span>
        <span
          role="timer"
          aria-label={`${secondsLeft} sekunder kvar`}
          key={secondsLeft}
          className={cn(
            'font-heading text-5xl leading-none font-bold tabular-nums drop-shadow md:text-7xl',
            hurry ? 'text-destructive motion-safe:animate-pop' : 'text-background',
          )}
        >
          {secondsLeft}
        </span>
      </div>
      {roleText && (
        <p className="rounded-full bg-foreground/90 px-4 py-1.5 text-center text-sm font-semibold text-background shadow-soft-sm md:text-base">
          {roleText}
        </p>
      )}
    </section>
  )
}

// När Nope!-fönstret stängs: en kort stämpel mitt på skärmen, KÖR! om kortet händer och STOPPAT! om det stoppades.
export function NopeVerdict({ stopped }: { stopped: boolean }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-0 z-[57] flex items-center justify-center">
      <Stamp className={cn('bg-card/95 text-6xl md:text-8xl', !stopped && 'border-accent-foreground text-accent-foreground')}>
        {stopped ? 'Stoppat!' : 'Kör!'}
      </Stamp>
    </div>
  )
}

// Hur länge korten flyger upp från högen och tillbaka (ms).
const FUTURE_FLY_MS = 380
const POSITION_NAMES = ['Överst', '2:a', '3:e']

// Se framtiden och Ändra framtiden: de översta korten stort i mitten av skärmen, bara för mig, med "Överst", "2:a" och
// "3:e". En exploderande tant lyser rött. Korten flyger upp från högen när vyn öppnas och tillbaka när jag är klar.
// Se framtiden ligger kvar tills jag trycker Klar. I Ändra framtiden (arrange) drar jag korten, eller använder pilarna
// under dem, och trycker Lägg tillbaka (onDone med ordningen, index i cards, överst först).
export function FutureView({
  cards,
  arrange,
  onDone,
}: {
  cards: CardType[]
  arrange: boolean
  onDone: (order: number[]) => void
}) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  // in: korten är på väg upp från högen. out: de är på väg tillbaka.
  const [phase, setPhase] = useState<'in' | 'open' | 'out'>(() => (reducedMotion() ? 'open' : 'in'))
  // Högens plats, så att korten kan flyga därifrån och dit.
  const [from] = useState(() => {
    const pile = document.querySelector('[data-tant-pile]')?.getBoundingClientRect()
    return pile ? { x: pile.left + pile.width / 2 - innerWidth / 2, y: pile.top + pile.height / 2 - innerHeight / 2 } : { x: 0, y: innerHeight / 2 }
  })
  const [screen, setScreen] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const rowRef = useRef<HTMLOListElement>(null)
  const dragging = useRef<{ index: number; pointer: number } | null>(null)

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setPhase((p) => (p === 'in' ? 'open' : p))))
    const measure = () => setScreen({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [])

  function done() {
    if (phase === 'out') return
    if (reducedMotion()) {
      onDone(order)
      return
    }
    setPhase('out')
    setTimeout(() => onDone(order), FUTURE_FLY_MS)
  }
  function swap(a: number, b: number) {
    setOrder((list) => {
      const next = [...list]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }

  // Lika stora som ett förstorat kort, men alla får plats bredvid varandra. På en smal skärm ligger de lätt omlott.
  const count = Math.max(1, cards.length)
  const narrow = screen.width < 640
  const overlap = narrow && count > 1 ? 0.18 : 0
  const gap = narrow ? 0 : 16
  const reserved = (arrange ? 190 : 140) + (narrow ? 20 : 60)
  const byHeight = Math.max(80, (screen.height - reserved) * (107 / 147))
  const byWidth = (Math.min(screen.width, 1200) - 24 - gap * (count - 1)) / (count - overlap * (count - 1))
  const cardWidth = Math.round(Math.min(byHeight, byWidth, 420))
  const away = phase !== 'open'

  // Dra ett kort i sidled till en ny plats (Ändra framtiden).
  function targetAt(clientX: number): number {
    const row = rowRef.current?.getBoundingClientRect()
    if (!row) return 0
    const step = row.width / count
    return Math.max(0, Math.min(count - 1, Math.floor((clientX - row.left) / step)))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={arrange ? 'Ändra framtiden' : 'Se framtiden'}
      {...SPLAT_SHIELD}
      className={cn(
        'fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 px-3 pt-[env(safe-area-inset-top)] pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors duration-300',
        away ? 'bg-foreground/0' : 'bg-foreground/75',
      )}
    >
      <h2 className="max-w-3xl text-center font-heading text-2xl leading-tight font-bold text-background drop-shadow md:text-3xl">
        {arrange ? 'Ändra framtiden: dra korten i den ordning du vill' : 'Se framtiden'}
      </h2>
      <p className="-mt-2 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold">Bara du ser detta</p>
      {cards.length === 0 ? (
        <p className="rounded-lg bg-card px-4 py-3 font-semibold">Högen är tom.</p>
      ) : (
        <ol ref={rowRef} className="flex items-end justify-center" style={{ gap }}>
          {order.map((index, position) => {
            const type = cards[index]
            const bomb = type === 'tant'
            return (
              <li
                key={index}
                className="flex flex-col items-center gap-1.5"
                style={{ marginLeft: position > 0 && overlap > 0 ? -cardWidth * overlap : 0, zIndex: position }}
              >
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-bold shadow-soft-sm md:text-base',
                    position === 0 ? 'bg-primary-button text-primary-foreground' : 'bg-card',
                  )}
                >
                  {POSITION_NAMES[position] ?? `${position + 1}:e`}
                </span>
                <div
                  className={cn(
                    'rounded-lg motion-safe:transition-transform motion-safe:ease-out',
                    arrange && 'cursor-grab touch-none active:cursor-grabbing',
                    bomb && 'shadow-[0_0_36px_10px] shadow-destructive/80 ring-4 ring-destructive',
                  )}
                  style={{
                    width: cardWidth,
                    transitionDuration: `${FUTURE_FLY_MS}ms`,
                    transitionDelay: phase === 'in' ? '0ms' : `${position * 50}ms`,
                    transform: away
                      ? `translate(${from.x - (position - (count - 1) / 2) * cardWidth}px, ${from.y}px) scale(0.3)`
                      : undefined,
                  }}
                  onPointerDown={(event) => {
                    if (!arrange) return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    dragging.current = { index: position, pointer: event.pointerId }
                  }}
                  onPointerMove={(event) => {
                    const drag = dragging.current
                    if (!drag || drag.pointer !== event.pointerId) return
                    const target = targetAt(event.clientX)
                    if (target !== drag.index) {
                      swap(drag.index, target)
                      drag.index = target
                    }
                  }}
                  onPointerUp={() => (dragging.current = null)}
                  onPointerCancel={() => (dragging.current = null)}
                >
                  <TantKort
                    type={type}
                    size="zoom"
                    sizes={`${cardWidth}px`}
                    className="pointer-events-none w-full drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]"
                  />
                </div>
                {bomb && (
                  <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft-sm md:text-sm">
                    Exploderande tant!
                  </span>
                )}
                {arrange && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label={`Flytta ${cardName(type)} närmare toppen`}
                      disabled={position === 0}
                      onClick={() => swap(position, position - 1)}
                    >
                      <ArrowLeft aria-hidden />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-lg"
                      aria-label={`Flytta ${cardName(type)} längre från toppen`}
                      disabled={position === order.length - 1}
                      onClick={() => swap(position, position + 1)}
                    >
                      <ArrowRight aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
      <Button size="lg" className="w-full max-w-sm" onClick={done} disabled={phase === 'out'}>
        {arrange ? 'Lägg tillbaka' : 'Klar'}
      </Button>
    </div>
  )
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Göm tanten: hur många kort som ska ligga ovanför den. 0 = överst, högens storlek = underst. Ingen annan ser valet.
// En ren popup: rubrik och förklaring överst, högen som en rad stora baksidor med tanten stor där den hamnar (dra den
// längs raden, eller tryck i raden), och knapparna samlade längst ner.
export function Place({ deckCount, onMove }: { deckCount: number; onMove: (move: TantMove) => void }) {
  const [position, setPosition] = useState(() => Math.floor(deckCount / 2))
  const label = position === 0 ? 'Överst' : position === deckCount ? 'Underst' : `under ${position} kort`
  // Smala skärmar: högen från sidan, så att hela högen syns utan att skrolla i sidled.
  const [narrow] = useState(() => window.innerWidth < 600)
  return (
    <ValPopup
      panel
      title="Desarmera räddade dig! Göm tanten i högen"
      actions={
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <Button variant="outline" onClick={() => setPosition(0)}>
              Överst
            </Button>
            <Button variant="outline" onClick={() => setPosition(Math.floor(deckCount / 2))}>
              Mitten
            </Button>
            <Button variant="outline" onClick={() => setPosition(deckCount)}>
              Underst
            </Button>
            <Button variant="outline" onClick={() => setPosition(Math.floor(Math.random() * (deckCount + 1)))}>
              Slumpa
            </Button>
          </div>
          <Button size="lg" className="w-full" onClick={() => onMove({ type: 'tPlace', position })}>
            Göm tanten: {label}
          </Button>
        </>
      }
    >
      {narrow ? (
        <>
          <p className="text-center text-sm text-muted-foreground">Dra den röda fliken, eller tryck i högen. Ingen annan ser var.</p>
          <SidePile deckCount={deckCount} position={position} onPosition={setPosition} />
        </>
      ) : (
        <>
          <p className="text-center text-sm text-muted-foreground md:text-base">
            Dra tanten längs högen, eller tryck där du vill ha den. Ingen annan ser var.
          </p>
          <SpreadPile deckCount={deckCount} position={position} onPosition={setPosition} />
          <p className="text-center font-heading text-xl font-bold tabular-nums md:text-2xl" aria-live="polite">
            {positionText(position, deckCount)}
          </p>
        </>
      )}
    </ValPopup>
  )
}

function positionText(position: number, deckCount: number): string {
  if (position === 0) return 'Överst. Den dras först!'
  if (position === deckCount) return 'Underst i högen'
  return `${position} kort ovanför`
}

// Göm tanten på en smal skärm: högen från sidan som en lodrät kortlek, där varje kort är en tunn kant, så att hela
// högen syns på en gång. Tanten är en röd flik som sticker ut mellan korten. Dra fliken upp och ned (eller tryck i
// högen), så snäpper den mellan korten. Bredvid står hur många kort som ligger ovanför, med − och +.
function SidePile({ deckCount, position, onPosition }: { deckCount: number; position: number; onPosition: (position: number) => void }) {
  const stackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [screenHeight] = useState(() => window.innerHeight)
  // Så hög som får plats ovanför knapparna på en telefon.
  const height = Math.round(Math.max(150, Math.min(340, screenHeight - 400)))
  const gap = 30
  const step = deckCount > 0 ? (height - gap) / deckCount : 0
  const cardY = (i: number) => i * step + (i >= position ? gap : 0)
  const tabY = position * step

  function pick(clientY: number) {
    const box = stackRef.current?.getBoundingClientRect()
    if (!box || deckCount === 0) return
    const y = clientY - box.top - gap / 2
    onPosition(Math.max(0, Math.min(deckCount, Math.round(y / Math.max(step, 0.001)))))
  }

  return (
    <div className="flex w-full items-center justify-center gap-15">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold text-muted-foreground">Överst (dras först)</span>
        <div
          ref={stackRef}
          role="slider"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Var tanten göms i högen"
          aria-valuemin={0}
          aria-valuemax={deckCount}
          aria-valuenow={position}
          aria-valuetext={`${position} kort ovanför tanten`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') onPosition(Math.max(0, position - 1))
            if (event.key === 'ArrowDown') onPosition(Math.min(deckCount, position + 1))
          }}
          onPointerDown={(event) => {
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            pick(event.clientY)
          }}
          onPointerMove={(event) => dragging.current && pick(event.clientY)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="relative w-28 touch-none rounded-md bg-felt outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/50"
          style={{ height }}
        >
          {/* Korten från sidan: tunna kanter, överst först. */}
          {Array.from({ length: deckCount }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-x-2 rounded-[2px] bg-foreground/80 shadow-[0_1px_0_var(--color-background)] motion-safe:transition-[top] motion-safe:duration-150"
              style={{ top: cardY(i), height: Math.max(2, step * 0.7) }}
            />
          ))}
          {/* Tanten: en röd flik som sticker ut från högen, i luckan där den ska ligga. */}
          <span
            aria-hidden
            className="absolute -right-12 left-0 z-10 flex items-center gap-1 rounded-r-full bg-destructive pl-2 shadow-lift motion-safe:transition-[top] motion-safe:duration-150"
            style={{ top: tabY + 2, height: gap - 4 }}
          >
            <span className="h-[3px] flex-1 rounded-full bg-primary-foreground/80" />
            <TantKort type="tant" size="small" sizes="24px" className="w-5 shrink-0" />
            <span className="pr-2 text-xs font-bold text-primary-foreground">Tant</span>
          </span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">Underst</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="w-32 text-center font-heading text-2xl leading-tight font-bold tabular-nums" aria-live="polite">
          {positionText(position, deckCount)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Ett kort högre upp"
            disabled={position === 0}
            onClick={() => onPosition(Math.max(0, position - 1))}
          >
            <Minus aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Ett kort längre ned"
            disabled={position === deckCount}
            onClick={() => onPosition(Math.min(deckCount, position + 1))}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Högen som en rad baksidor, överst till vänster, med tanten stor i luckan där den ska ligga. Raden skrollar i sidled
// när högen är stor, och följer med tanten. Dra tanten (eller tryck i raden) för att flytta den.
function SpreadPile({ deckCount, position, onPosition }: { deckCount: number; position: number; onPosition: (position: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const tantRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [screen] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  // Lika stora som korten i handen, men så att raden och knapparna får plats i höjd.
  const card = Math.round(Math.min(handCardWidth(screen.width, screen.height), (screen.height - 360) * (107 / 147) * 0.85))
  const cardWidth = Math.max(56, card)
  const tantWidth = Math.round(cardWidth * 1.2)
  const cardHeight = Math.round(cardWidth * (147 / 107))
  const tantHeight = Math.round(tantWidth * (147 / 107))
  const step = Math.round(cardWidth * 0.42)
  const gap = tantWidth + 12
  const pad = 12
  const width = pad * 2 + (deckCount > 0 ? cardWidth + step * (deckCount - 1) : 0) + gap
  // Kort i (räknat från toppen) ligger till vänster om tanten om i < position.
  const cardX = (i: number) => pad + i * step + (i >= position ? gap : 0)
  const tantX = pad + position * step + (position > 0 ? cardWidth - step : 0) + (gap - tantWidth) / 2

  // Raden följer med tanten.
  useEffect(() => {
    tantRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [position])

  function pick(clientX: number) {
    const box = scrollRef.current?.getBoundingClientRect()
    if (!box || deckCount === 0) return
    const x = clientX - box.left + (scrollRef.current?.scrollLeft ?? 0) - pad - gap / 2
    onPosition(Math.max(0, Math.min(deckCount, Math.round(x / step))))
  }

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        role="slider"
        tabIndex={0}
        aria-label="Var tanten göms i högen"
        aria-valuemin={0}
        aria-valuemax={deckCount}
        aria-valuenow={position}
        aria-valuetext={`${position} kort ovanför tanten`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onPosition(Math.max(0, position - 1))
          if (event.key === 'ArrowRight') onPosition(Math.min(deckCount, position + 1))
        }}
        onPointerDown={(event) => {
          // Bara tanten dras. Ett tryck någon annanstans i raden flyttar den dit.
          dragging.current = !!tantRef.current?.contains(event.target as Node)
          if (dragging.current) event.currentTarget.setPointerCapture(event.pointerId)
          else pick(event.clientX)
        }}
        onPointerMove={(event) => dragging.current && pick(event.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="overflow-x-auto overflow-y-hidden rounded-lg bg-felt outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        <div className="relative" style={{ width: Math.max(width, 1), height: tantHeight + 24 }}>
          {Array.from({ length: deckCount }, (_, i) => (
            <TantBaksida
              key={i}
              sizes={`${cardWidth}px`}
              className="absolute drop-shadow-md motion-safe:transition-[left] motion-safe:duration-150"
              style={{ left: cardX(i), top: 12 + (tantHeight - cardHeight) / 2, width: cardWidth }}
            />
          ))}
          <div
            ref={tantRef}
            className="absolute z-10 cursor-grab touch-none drop-shadow-[0_0_14px_rgb(220_40_40/0.6)] active:cursor-grabbing motion-safe:transition-[left] motion-safe:duration-150"
            style={{ left: tantX, top: 12, width: tantWidth }}
          >
            <TantKort type="tant" size="zoom" sizes={`${tantWidth}px`} className="pointer-events-none w-full" />
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-between px-1 text-xs font-semibold text-muted-foreground md:text-sm">
        <span>Överst (dras först)</span>
        <span>Underst</span>
      </div>
    </div>
  )
}

// Par: välj ett av motspelarens kort. De ligger med baksidan upp som en solfjäder, i en ordning som värden blandat om
// just nu, så att ingen kan veta vilket kort som ligger var. Tryck på ett kort och sedan på knappen.
export function PickCard({
  fromName,
  count,
  title,
  onMove,
}: {
  fromName: string
  count: number
  // En egen rubrik, t.ex. när Tantsnaran slagit igen.
  title?: string
  onMove: (move: TantMove) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [chosen, setChosen] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  // Större än korten i handen, men alla får plats på skärmen.
  const big = Math.min(Math.round(handCardWidth(width, window.innerHeight) * 1.3), Math.round((window.innerHeight - 260) * (107 / 147)), 240)
  const layout = fanLayout(count, width, Math.max(72, big))
  return (
    <ValPopup
      title={title ?? `Välj ett av ${fromName}s kort`}
      actions={
        <Button size="lg" className="w-full" disabled={chosen === null} onClick={() => chosen !== null && onMove({ type: 'tPick', index: chosen })}>
          {chosen === null ? 'Tryck på ett kort' : 'Ta det här kortet'}
        </Button>
      }
    >
      <div ref={ref} className="relative w-full shrink-0" style={{ height: layout.height + 24 }}>
        {layout.slots.map((slot, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={chosen === i}
            aria-label={`Kort ${i + 1} av ${count}`}
            onClick={() => setChosen(i)}
            className={cn(
              'absolute origin-bottom rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-150',
              chosen === i && 'ring-4 ring-primary',
            )}
            style={{
              left: slot.x,
              bottom: layout.bottom,
              width: layout.cardWidth,
              height: layout.cardHeight,
              zIndex: i,
              transform: `translateY(${slot.y - (chosen === i ? 24 : 0)}px) rotate(${slot.rotate}deg)`,
            }}
          >
            <TantBaksida sizes={`${layout.cardWidth}px`} className="size-full drop-shadow-md" />
          </button>
        ))}
      </div>
    </ValPopup>
  )
}
