import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { TantKort } from '@/components/tantpanik/TantKort'
import { cardHint, fanIndexAtPoint, fanLayout, handCardWidth, moveCard, TABLE_OVERLAP } from '@/lib/solfjader'
import type { TantCard } from '@/lib/tantpanik'
import { CARDS, cardImage, cardName } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Hur högt kortet under fingret lyfts när man drar längs handen (andel av kortets höjd).
const DRAG_LIFT = 0.32
// Hur högt kortet musen pekar på lyfts (px).
const MOUSE_LIFT = 26
// Hur högt ett nytt kort sticker upp ur handen (px).
const FRESH_LIFT = 22
// Hur högt ett kort som lyser (Nope!) åker upp ur handen (px).
const GLOW_LIFT = 36

// Så långt fingret får röra sig (px) och ändå räknas som ett tryck.
const TAP_SLOP = 8
// Så länge fingret ska ligga stilla på ett kort för att lyfta det och flytta det (ms).
const HOLD_MS = 300

// Vad ett tryck i handen håller på med: inget än, förhandsvisar korten längs handen, eller flyttar ett kort.
type Press = {
  x: number
  y: number
  mode: 'pending' | 'preview' | 'move'
  // Kortet som flyttas, och var på kortet man tog tag (px från kortets vänsterkant).
  id: string | null
  grab: number
  hold: ReturnType<typeof setTimeout> | null
}

// Handen som en solfjäder.
// - Ett tryck på ett kort väljer det (onTap).
// - Mus: kortet man pekar på lyfts en bit och lägger sig framför grannarna. Dra ett kort för att flytta det.
// - Touch: dra fingret längs korten för att se dem större. Håll fingret stilla på ett kort en kort stund (kort
//   vibration) och dra sedan, så flyttas kortet. De andra glider undan.
// Valda kort och kort som lyser (glow, t.ex. Nope! när det går att spela) står lite högre. hiddenId är ett kort som är
// på väg till handen (dragnings-animationen): det har sin plats men syns inte än. Rörelserna stängs av med "minska rörelse".
export function Solfjader({
  cards,
  selected,
  glow,
  hiddenId = null,
  freshId = null,
  onTap,
  onReorder,
  onOverlap,
  dimmed: handDimmed = false,
  grayAll = false,
}: {
  cards: TantCard[]
  selected: readonly string[]
  glow: readonly string[]
  hiddenId?: string | null
  // Kortet jag nyss fick: det sticker upp lite, lyser och har etiketten NY.
  freshId?: string | null
  onTap: (id: string) => void
  // Ett kort har flyttats: den nya ordningen.
  onReorder: (ids: string[]) => void
  // Hur mycket handen ligger över bordets nederkant (px), så att bordet kan lämna plats för den.
  onOverlap?: (px: number) => void
  // Inte min tur: handen är svagt dämpad och tänds upp mjukt när det blir min tur.
  dimmed?: boolean
  // Ett kort väntar på Nope! och jag har inget: alla kort blir gråa, som de som inte går att spela när man har Nope!.
  grayAll?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 360, height: 640 })
  const width = size.width
  const [hovered, setHovered] = useState<number | null>(null)
  const [mode, setMode] = useState<Press['mode'] | null>(null)
  // Kortet som flyttas och var det är just nu (x = kortets vänsterkant, target = platsen det hamnar på).
  const [moving, setMoving] = useState<{ id: string; x: number; target: number } | null>(null)
  // Kortet musen pekar på (bara mus, inte touch). Det lyfts en bit och lägger sig framför grannarna.
  const [mouseOver, setMouseOver] = useState<number | null>(null)
  const press = useRef<Press | null>(null)

  // Bredden och skärmens höjd avgör hur stora korten är och hur mycket de överlappar.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setSize({ width: element.clientWidth, height: window.innerHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const layout = fanLayout(cards.length, width, handCardWidth(width, size.height))
  const { cardWidth, cardHeight } = layout
  // Handen ligger över bordets nederkant. Bordet får veta hur mycket, och får tillbaka platsen när handen försvinner.
  const overlap = Math.round(cardHeight * TABLE_OVERLAP)
  useEffect(() => {
    onOverlap?.(overlap)
  }, [overlap, onOverlap])
  useEffect(() => () => onOverlap?.(0), [onOverlap])

  // Var korten ligger: medan ett kort flyttas står det på sin nya plats i ordningen, och de andra glider undan.
  const ids = cards.map((card) => card.id)
  const shown = moving ? moveCard(ids, moving.id, moving.target) : ids
  const slotOf = (id: string) => layout.slots[shown.indexOf(id)]

  const point = (event: PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    return box ? { x: event.clientX - box.left, y: event.clientY - box.top } : null
  }
  const indexAt = (event: PointerEvent) => {
    const p = point(event)
    return p ? fanIndexAtPoint(p.x, p.y, layout) : -1
  }

  function startMove(id: string, x: number) {
    const from = press.current
    if (!from) return
    from.mode = 'move'
    from.id = id
    const slot = slotOf(id)
    from.grab = slot ? x - slot.x : cardWidth / 2
    setMode('move')
    setHovered(null)
    setMoving({ id, x: x - from.grab, target: ids.indexOf(id) })
    navigator.vibrate?.(30)
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || cards.length === 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const index = indexAt(event)
    const p = point(event)
    press.current = { x: event.clientX, y: event.clientY, mode: 'pending', id: index >= 0 ? cards[index].id : null, grab: 0, hold: null }
    setMode('pending')
    setHovered(index)
    // Touch: håll fingret stilla en kort stund för att lyfta kortet och flytta det.
    if (event.pointerType !== 'mouse' && index >= 0 && p) {
      const id = cards[index].id
      press.current.hold = setTimeout(() => {
        if (press.current?.mode === 'pending') startMove(id, p.x)
      }, HOLD_MS)
    }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const from = press.current
    if (!from) {
      // Träffen räknas mot kortens platser utan lyft, så att ett lyft kort inte fladdrar när musen går snabbt över korten.
      if (event.pointerType === 'mouse') {
        const index = indexAt(event)
        setMouseOver((current) => (current === index ? current : index))
      }
      return
    }
    const p = point(event)
    if (from.mode === 'pending' && Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_SLOP) {
      if (from.hold) clearTimeout(from.hold)
      // Mus: dra ett kort för att flytta det. Touch: ett vanligt drag förhandsvisar korten.
      if (event.pointerType === 'mouse' && from.id && p) {
        const startX = p.x - (event.clientX - from.x)
        startMove(from.id, startX)
      } else {
        from.mode = 'preview'
        setMode('preview')
      }
    }
    if (from.mode === 'move' && from.id && p) {
      const target = fanIndexAtPoint(p.x, p.y, layout)
      const id = from.id
      setMoving({ id, x: p.x - from.grab, target: target >= 0 ? target : ids.indexOf(id) })
      return
    }
    setHovered(indexAt(event))
  }

  function up(event: PointerEvent<HTMLDivElement>) {
    const from = press.current
    const index = indexAt(event)
    if (from?.mode === 'move' && moving) onReorder(moveCard(ids, moving.id, moving.target))
    // Lyser några kort (Nope!) går bara de att trycka på.
    const tapped = from?.mode === 'pending' && index >= 0 && (glow.length === 0 || glow.includes(cards[index].id))
    reset()
    if (tapped) onTap(cards[index].id)
  }

  function reset() {
    if (press.current?.hold) clearTimeout(press.current.hold)
    press.current = null
    setHovered(null)
    setMode(null)
    setMoving(null)
  }

  useEffect(() => () => {
    if (press.current?.hold) clearTimeout(press.current.hold)
  }, [])

  const previewing = mode === 'preview'
  // Med "minska rörelse" lyfts inget kort som lyser, bara färgen ändras.
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const preview = previewing && hovered !== null ? cards[hovered] : null
  const previewX = hovered !== null && layout.slots[hovered] ? layout.slots[hovered].x + cardWidth / 2 : width / 2
  // Det förstorade kortet är större än korten i handen, men får plats på skärmen.
  const previewWidth = Math.round(Math.min(Math.max(192, cardWidth * 1.5), width - 16, size.height * 0.4 * (107 / 147)))

  return (
    <div
      ref={ref}
      className={cn(
        'relative mx-auto w-full max-w-6xl touch-none select-none transition-[filter] duration-400 motion-safe:transition-[filter,translate]',
        // Bara en svag dämpning, så att korten ser normala ut.
        handDimmed && 'brightness-[0.88] saturate-[0.85]',
      )}
      style={{ height: layout.height, marginTop: -overlap }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={() => setMouseOver(null)}
      onPointerCancel={reset}
      onLostPointerCapture={() => press.current && reset()}
    >
      {/* Det förstorade kortet medan man drar längs solfjädern. */}
      {preview && (
        // Bara kortbilden, förstorad med en mjuk skugga, och hjälptexten i en mörk etikett under. Den ligger ovanför det
        // lyfta kortet, så att inget överlappar handen.
        <div
          aria-hidden
          className="pointer-events-none absolute z-50 flex -translate-x-1/2 flex-col items-center gap-2 motion-safe:animate-pop"
          style={{
            left: Math.max(previewWidth / 2 + 4, Math.min(width - previewWidth / 2 - 4, previewX)),
            bottom: `calc(100% + ${Math.round(cardHeight * DRAG_LIFT) + 8}px)`,
            width: Math.max(previewWidth, Math.min(width - 8, 300)),
          }}
        >
          <TantKort
            type={preview.type}
            size="preview"
            sizes={`${previewWidth}px`}
            className="drop-shadow-[0_18px_28px_rgb(0_0_0/0.4)]"
            style={{ width: previewWidth }}
          />
          {cardHint([preview.type]) && (
            <p className="w-fit max-w-full rounded-full bg-foreground/90 px-3 py-1.5 text-center text-sm font-semibold text-background shadow-soft-sm">
              {cardHint([preview.type])}
            </p>
          )}
        </div>
      )}
      {cards.map((card, i) => {
        const slot = slotOf(card.id)
        if (!slot) return null
        const isSelected = selected.includes(card.id)
        const lit = glow.includes(card.id)
        const dragged = moving?.id === card.id
        const dimmed = (glow.length > 0 && !lit) || grayAll
        const isFresh = card.id === freshId && hiddenId !== card.id
        const pointed = mouseOver === i && mode === null
        // Ett lyft kort sticker upp över bordet.
        const lift = dragged
          ? Math.round(cardHeight * 0.18)
          : Math.max(
              Math.round(cardHeight * (hovered === i ? (previewing ? DRAG_LIFT : 0.1) : isSelected ? 0.26 : 0)),
              lit && !reduced ? GLOW_LIFT : 0,
              isFresh ? FRESH_LIFT : 0,
              pointed ? MOUSE_LIFT : 0,
            )
        return (
          <button
            key={card.id}
            type="button"
            data-hand-card={card.id}
            data-rotate={slot.rotate}
            aria-pressed={isSelected}
            aria-label={`${cardName(card.type)}. ${CARDS[card.type].text}`}
            // Musen och fingret hanteras av solfjädern. Klick utan pekare (tangentbordet) väljer kortet här.
            disabled={dimmed}
            onClick={(event) => {
              if (event.detail === 0) onTap(card.id)
            }}
            className={cn(
              'absolute origin-bottom rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50',
              // Korten glider mjukt till sina platser. Kortet som flyttas följer pekaren utan fördröjning.
              !dragged && 'motion-safe:transition-[transform,left,filter] motion-safe:duration-200 motion-safe:ease-out',
              isSelected && 'ring-4 ring-primary',
              // Ett kort som går att spela just nu (Nope!) hoppar upp och lyser.
              // Ett kort som går att spela just nu (Nope!) hoppar upp och lyser orange. De andra blir gråa och tar inga tryck.
              lit && !isSelected && 'shadow-[0_0_24px_6px] shadow-primary/70 ring-4 ring-primary motion-safe:animate-light-pulse',
              dimmed && 'brightness-75 saturate-[0.25]',
              isFresh && !isSelected && !lit && 'shadow-[0_0_22px_6px] shadow-sun ring-4 ring-sun',
              dragged && 'cursor-grabbing drop-shadow-[0_14px_20px_rgb(0_0_0/0.35)]',
              hiddenId === card.id && 'opacity-0',
            )}
            style={{
              left: dragged ? moving.x : slot.x,
              bottom: layout.bottom,
              width: cardWidth,
              height: cardHeight,
              zIndex: dragged ? 60 : hovered === i || pointed ? 40 : shown.indexOf(card.id),
              transform: `translateY(${slot.y - lift}px) rotate(${dragged ? 0 : slot.rotate}deg)${pointed || dragged ? ' scale(1.04)' : ''}`,
            }}
          >
            <FanCard type={card.type} width={cardWidth} />
            {isFresh && (
              <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-sun px-2 py-0.5 font-heading text-xs font-bold text-foreground shadow-soft-sm md:text-sm">
                NY
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Kortet i solfjädern: symbolen i övre vänstra hörnet syns även när korten ligger tätt, som på riktiga kort.
// Har kortet en bild visas den hela, och knappen har kortets namn och text för skärmläsare.
function FanCard({ type, width }: { type: TantCard['type']; width: number }) {
  const card = CARDS[type]
  // Den stora bilden när korten är stora (dator, surfplatta), så att de inte blir suddiga.
  const src = cardImage(type, width * window.devicePixelRatio > 360 ? 960 : 360)
  if (src) return <img src={src} alt="" draggable={false} className="size-full object-contain drop-shadow-sm select-none" />
  return (
    <span className={cn('flex size-full flex-col rounded-lg border border-foreground/15 p-1.5 text-left shadow-soft-sm', card.color)}>
      <span aria-hidden className="leading-none" style={{ fontSize: Math.round(width * 0.24) }}>
        {card.symbol}
      </span>
      <span className="mt-auto font-heading leading-tight font-bold" style={{ fontSize: Math.max(12, Math.round(width * 0.12)) }}>
        {card.name}
      </span>
    </span>
  )
}
