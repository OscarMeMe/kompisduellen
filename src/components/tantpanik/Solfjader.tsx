import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { TantKort } from '@/components/tantpanik/TantKort'
import { FAN_CARD_WIDTH, fanIndexAtPoint, fanLayout } from '@/lib/solfjader'
import type { TantCard } from '@/lib/tantpanik'
import { CARDS, cardImage, cardName } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Så långt fingret får röra sig (px) och ändå räknas som ett tryck.
const TAP_SLOP = 8

// Handen som en solfjäder. Dra fingret eller musen längs korten: kortet under fingret lyfts och visas större ovanför.
// Släpp så läggs det tillbaka. Ett tryck på ett kort väljer det (onTap). Valda kort och kort som lyser (glow, t.ex.
// Nope! när det går att spela) står lite högre. Rörelserna stängs av med "minska rörelse", men korten lyfts ändå.
export function Solfjader({
  cards,
  selected,
  glow,
  onTap,
}: {
  cards: TantCard[]
  selected: readonly string[]
  glow: readonly string[]
  onTap: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)
  const [hovered, setHovered] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  // Bredden avgör hur mycket korten överlappar.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const layout = fanLayout(cards.length, width)
  const indexAt = (event: PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    return box ? fanIndexAtPoint(event.clientX - box.left, event.clientY - box.top, layout, box.height) : -1
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || cards.length === 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = { x: event.clientX, y: event.clientY, moved: false }
    setHovered(indexAt(event))
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const from = start.current
    if (!from) return
    if (!from.moved && Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_SLOP) {
      from.moved = true
      setDragging(true)
    }
    setHovered(indexAt(event))
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const from = start.current
    const index = indexAt(event)
    reset()
    if (from && !from.moved && index >= 0) onTap(cards[index].id)
  }
  function reset() {
    start.current = null
    setHovered(null)
    setDragging(false)
  }

  const preview = dragging && hovered !== null ? cards[hovered] : null
  const previewX = hovered !== null && layout.slots[hovered] ? layout.slots[hovered].x + FAN_CARD_WIDTH / 2 : width / 2

  return (
    <div
      ref={ref}
      className="relative mx-auto h-[164px] w-full max-w-xl touch-none select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      {/* Det förstorade kortet medan man drar längs solfjädern. */}
      {preview && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-full z-50 mb-2 -translate-x-1/2 motion-safe:animate-pop"
          style={{ left: Math.max(100, Math.min(width - 100, previewX)) }}
        >
          <TantKort type={preview.type} size="preview" />
        </div>
      )}
      {cards.map((card, i) => {
        const slot = layout.slots[i]
        const isSelected = selected.includes(card.id)
        const lit = glow.includes(card.id)
        const lift = hovered === i ? (dragging ? 40 : 16) : isSelected ? 30 : lit ? 12 : 0
        return (
          <button
            key={card.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${cardName(card.type)}. ${CARDS[card.type].text}`}
            // Musen och fingret hanteras av solfjädern. Klick utan pekare (tangentbordet) väljer kortet här.
            onClick={(event) => {
              if (event.detail === 0) onTap(card.id)
            }}
            className={cn(
              'absolute bottom-3.5 h-[137px] w-25 origin-bottom rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out',
              isSelected && 'ring-4 ring-primary',
              lit && !isSelected && 'shadow-[0_0_18px_4px] shadow-sun ring-4 ring-sun',
            )}
            style={{
              left: slot.x,
              zIndex: hovered === i ? 40 : i,
              transform: `translateY(${slot.y - lift}px) rotate(${slot.rotate}deg)`,
            }}
          >
            <FanCard type={card.type} />
          </button>
        )
      })}
    </div>
  )
}

// Kortet i solfjädern: symbolen i övre vänstra hörnet syns även när korten ligger tätt, som på riktiga kort.
// Har kortet en bild visas den hela, och knappen har kortets namn och text för skärmläsare.
function FanCard({ type }: { type: TantCard['type'] }) {
  const card = CARDS[type]
  const src = cardImage(type, 360)
  if (src) return <img src={src} alt="" draggable={false} className="size-full object-contain drop-shadow-sm select-none" />
  return (
    <span className={cn('flex size-full flex-col rounded-lg border border-foreground/15 p-1.5 text-left shadow-soft-sm', card.color)}>
      <span aria-hidden className="text-2xl leading-none">
        {card.symbol}
      </span>
      <span className="mt-auto font-heading text-xs leading-tight font-bold">{card.name}</span>
    </span>
  )
}
