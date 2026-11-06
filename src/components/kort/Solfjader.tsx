import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { AnswerCard } from '@/components/kort/PlayingCard'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { cn } from '@/lib/utils'

// Handen med svarskort. På dator (lg) en solfjäder längst ner: korten överlappar lite, lutar utåt och ligger i en
// båge. Kortet under musen (eller med fokus från tangentbordet) lyfts, rätas upp och förstoras så att hela texten
// går att läsa, och grannarna glider undan. På mobilen och mellanstora skärmar samma rad att bläddra i som förut.
// Med musen går ett kort också att dra upp mot frågekortet (dropTarget). Utan onSelect går korten bara att titta på.

export type FanCard = { key: string; text: string; blank?: boolean; footer?: string }

type SolfjaderProps = {
  label: string
  cards: FanCard[]
  // Valt kort. På dator står en tom kontur kvar på dess plats ("I luckan"), eftersom kortet ligger i frågan.
  selected?: string | null
  // el = kortet som valdes, så att det kan flyga upp till luckan.
  onSelect?: (key: string, el: HTMLElement) => void
  // Siffrorna 1–9 väljer kort.
  shortcuts?: boolean
  // Dit ett kort kan dras för att väljas, t.ex. frågekortet. onDropReady säger om kortet släpps där just nu.
  dropTarget?: RefObject<HTMLElement | null>
  onDropReady?: (ready: boolean) => void
  className?: string
}

// Hur korten ligger i solfjädern. a = kortet som är lyft, eller null.
// Så långt uppåt (px) ett kort ska dras för att väljas, även utanför frågekortet.
const DRAG_UP_PX = 120

type Drag = { i: number; x0: number; y0: number; dx: number; dy: number; moved: boolean }

function fanTransform(i: number, n: number, a: number | null): string {
  if (i === a) return 'translateY(-2.25rem) scale(1.12)'
  const d = i - (n - 1) / 2
  const spread = n > 1 ? Math.min(4, 22 / (n - 1)) : 0
  const rot = d * spread
  const y = d * d * 0.12
  // Grannarna till det lyfta kortet glider undan, så att det syns helt.
  const x = a === null ? 0 : Math.sign(i - a) * (Math.abs(i - a) === 1 ? 1.75 : 0.75)
  return `translateX(${x}rem) translateY(${y}rem) rotate(${rot}deg)`
}

export function Solfjader({
  label,
  cards,
  selected = null,
  onSelect,
  shortcuts = false,
  dropTarget,
  onDropReady,
  className,
}: SolfjaderProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  // Kortet som har tabbstoppet. Pilarna flyttar det.
  const selectedIndex = cards.findIndex((c) => c.key === selected)
  const [tabIndex, setTabIndex] = useState(Math.max(0, selectedIndex))
  const refs = useRef<(HTMLElement | null)[]>([])
  // Kortet som dras just nu. dragRef har det senaste läget utan att vänta på en ny rendering.
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  // Efter ett drag kommer ett klick som inte ska räknas.
  const skipClick = useRef(false)
  const n = cards.length
  const active = drag?.moved ? drag.i : (hovered ?? focused)
  const tabStop = Math.min(tabIndex, n - 1)

  // Siffrorna 1–9 väljer kort, utom när man skriver i ett fält.
  useEffect(() => {
    if (!shortcuts || !onSelect) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const i = Number(event.key) - 1
      if (!Number.isInteger(i) || i < 0 || i >= cards.length) return
      const el = refs.current[i]
      if (!el) return
      event.preventDefault()
      setTabIndex(i)
      onSelect!(cards[i].key, el)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts, onSelect, cards])

  // Släpps kortet här: över frågekortet eller tillräckligt långt upp.
  function dropReady(event: PointerEvent, d: Drag): boolean {
    const box = dropTarget?.current?.getBoundingClientRect()
    const over =
      !!box &&
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    return over || d.dy < -DRAG_UP_PX
  }

  function startDrag(event: PointerEvent<HTMLLIElement>, i: number) {
    // Bara med mus eller penna på dator. På mobilen scrollar raden som förut.
    if (!onSelect || event.pointerType === 'touch' || event.button !== 0) return
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    dragRef.current = { i, x0: event.clientX, y0: event.clientY, dx: 0, dy: 0, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLLIElement>) {
    const d = dragRef.current
    if (!d) return
    const dx = event.clientX - d.x0
    const dy = event.clientY - d.y0
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    const next = { ...d, dx, dy, moved: true }
    dragRef.current = next
    setDrag(next)
    onDropReady?.(dropReady(event, next))
  }

  function endDrag(event: PointerEvent<HTMLLIElement>, cancelled = false) {
    const d = dragRef.current
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!d?.moved) return
    skipClick.current = true
    // Kommer inget klick efter draget ska nästa klick ändå räknas.
    setTimeout(() => (skipClick.current = false), 0)
    onDropReady?.(false)
    const el = refs.current[d.i]
    // Kortet flyger från där det släpptes, så det väljs innan det glider tillbaka.
    if (!cancelled && el && dropReady(event, d)) onSelect?.(cards[d.i].key, el)
    setDrag(null)
  }

  function moveFocus(event: KeyboardEvent) {
    if (n === 0) return
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (tabStop + 1) % n
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (tabStop - 1 + n) % n
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? n - 1
              : null
    if (next === null) return
    event.preventDefault()
    setTabIndex(next)
    refs.current[next]?.focus()
  }

  return (
    <ul
      {...SPLAT_SHIELD}
      aria-label={label}
      onKeyDown={onSelect ? moveFocus : undefined}
      onMouseLeave={() => setHovered(null)}
      className={cn(
        '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4',
        'lg:flex lg:justify-center lg:gap-0 lg:px-8 lg:pt-8 lg:pb-1 lg:short:pt-6',
        className,
      )}
    >
      {cards.map((card, i) => {
        const isSelected = card.key === selected
        const dragging = drag?.moved && drag.i === i
        const fan = dragging ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)` : fanTransform(i, n, active)
        const style = { '--fan': fan, zIndex: dragging ? 40 : i === active ? 30 : undefined } as CSSProperties
        return (
          <li
            key={card.key}
            style={style}
            onMouseEnter={() => setHovered(i)}
            onPointerDown={(event) => startDrag(event, i)}
            onPointerMove={moveDrag}
            onPointerUp={(event) => endDrag(event)}
            onPointerCancel={(event) => endDrag(event, true)}
            className={cn(
              'relative w-40 shrink-0 snap-start sm:w-auto',
              'lg:-mx-5 lg:h-48 lg:w-36 lg:origin-bottom lg:transition-transform lg:duration-200 lg:ease-out lg:select-none lg:[transform:var(--fan)] lg:short:h-40 lg:short:w-32 motion-reduce:transition-none',
              dragging && 'lg:cursor-grabbing lg:transition-none',
            )}
          >
            <AnswerCard
              ref={(el: HTMLButtonElement | null) => {
                refs.current[i] = el
              }}
              blank={card.blank}
              selected={isSelected}
              onSelect={
                onSelect
                  ? (event) => {
                      if (skipClick.current) {
                        skipClick.current = false
                        return
                      }
                      onSelect(card.key, event.currentTarget)
                    }
                  : undefined
              }
              tabIndex={onSelect ? (i === tabStop ? 0 : -1) : undefined}
              onFocus={(event) => {
                setTabIndex(i)
                if (event.currentTarget.matches(':focus-visible')) setFocused(i)
              }}
              onBlur={() => setFocused(null)}
              footer={card.footer}
              aria-keyshortcuts={shortcuts && i < 9 ? String(i + 1) : undefined}
              className={cn(
                'lg:min-h-0 lg:gap-2 lg:p-3 lg:text-base lg:shadow-lift lg:hover:translate-y-0 lg:short:text-sm',
                // På dator ligger det valda kortet i frågan, så här blir det en tom kontur.
                isSelected &&
                  'lg:translate-y-0 lg:border-dashed lg:border-background/60 lg:bg-background/10 lg:shadow-none lg:ring-0 lg:[&>span]:invisible',
              )}
            >
              {card.text}
            </AnswerCard>
            {isSelected && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden items-center justify-center font-heading text-sm font-bold text-background/80 lg:flex"
              >
                I luckan
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
