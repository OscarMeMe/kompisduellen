import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { playCupClink } from '@/lib/ljud'
import type { GameState } from '@/lib/match'
import type { TantTable } from '@/lib/tantpanik'
import { tantMusic } from '@/lib/tantmusik'
import { cn } from '@/lib/utils'

// Hur länge koppen glider mellan två platser (ms). Samma tid som duration-500 nedan.
export const CUP_SLIDE_MS = 500

// Turmarkören i Exploderande Tanter: en liten tecknad kaffekopp på platsen för den som har tur. Den glider till nästa
// plats när turen byts, så att alla alltid ser var den är. Platserna är motspelarna överst och min egen plats vid handen
// (data-seat och data-cup-seat med spelarens id). Vid attack har koppen en liten siffra med turerna kvar. När den landar hos mig klirrar det
// och telefonen vibrerar kort. Med "minska rörelse" hoppar den direkt.
export function TurnCup({ table, meId, soundOn }: { table: TantTable; meId: string; soundOn: boolean }) {
  const holder = table.winner || table.out.includes(table.current) ? null : table.current
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null)
  // Första platsen sätts utan att glida dit.
  const [placed, setPlaced] = useState(false)
  const previous = useRef(holder)

  useLayoutEffect(() => {
    if (!holder) return
    const measure = () => {
      const id = CSS.escape(holder)
      const seat = document.querySelector(`[data-cup-seat="${id}"]`) ?? document.querySelector(`[data-seat="${id}"]`)
      if (!seat) return
      const box = seat.getBoundingClientRect()
      // Koppen står under motspelarens plats (på bordet), och i fickan längst till höger i min plats, så att den aldrig
      // krockar med handen eller högarna. Alltid helt inne på skärmen.
      const beside = seat.getAttribute('data-cup-side') === 'right'
      const x = Math.min(window.innerWidth - 18, Math.max(18, beside ? box.right - 20 : box.left + box.width / 2))
      const y = Math.min(window.innerHeight - 18, Math.max(18, beside ? box.top + box.height / 2 : box.bottom + 10))
      setPlace((old) => (old && Math.abs(old.x - x) < 0.5 && Math.abs(old.y - y) < 0.5 ? old : { x, y }))
    }
    measure()
    // Platsen kan växa (den som har tur förstoras) och motspelarraden kan rullas: mät igen när det lagt sig.
    const later = setTimeout(measure, 350)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // Min plats glider upp med handen, och den som har tur förstoras: mät igen när en övergång är klar.
    document.addEventListener('transitionend', measure, true)
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    return () => {
      clearTimeout(later)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('transitionend', measure, true)
      observer.disconnect()
    }
  }, [holder, table.out.length, table.order.length])

  useEffect(() => {
    if (!place || placed) return
    const frame = requestAnimationFrame(() => setPlaced(true))
    return () => cancelAnimationFrame(frame)
  }, [place, placed])

  // Koppen landar hos mig: klirr och en kort vibration när den glidit klart.
  useEffect(() => {
    const before = previous.current
    previous.current = holder
    if (!holder || holder === before || holder !== meId) return
    const timer = setTimeout(() => {
      navigator.vibrate?.(40)
      if (soundOn) {
        tantMusic.duck()
        playCupClink()
      }
    }, CUP_SLIDE_MS)
    return () => clearTimeout(timer)
  }, [holder, meId, soundOn])

  if (!holder || !place) return null
  const turns = table.turnsLeft
  return (
    <div
      aria-hidden
      data-turn-cup={holder}
      className={cn(
        'pointer-events-none fixed z-[47] -translate-x-1/2 -translate-y-1/2',
        placed && 'motion-safe:transition-[left,top] motion-safe:duration-500 motion-safe:ease-in-out',
      )}
      style={{ left: place.x, top: place.y }}
    >
      <span className="relative block">
        <Kaffekopp className="size-9 drop-shadow-[0_3px_4px_rgb(0_0_0/0.3)] max-[420px]:size-8 md:size-11" />
        {turns > 1 && (
          <span className="absolute -top-1.5 -right-2 flex size-5 items-center justify-center rounded-full bg-primary-button text-[11px] font-bold text-primary-foreground tabular-nums shadow-soft-sm ring-2 ring-tant-kram">
            {turns}
          </span>
        )}
      </span>
    </div>
  )
}

// En tecknad kaffekopp på ett fat, i kafferepets vinrött och krämvitt, med kaffe i och små prickar.
export function Kaffekopp({ className }: { className?: string }) {
  const ink = 'var(--color-tant-vin)'
  return (
    <svg viewBox="0 0 64 64" className={className}>
      {/* Fatet */}
      <ellipse cx="31" cy="51" rx="26" ry="7.5" fill="var(--color-tant-kram)" stroke={ink} strokeWidth="3" />
      <ellipse cx="31" cy="50" rx="15" ry="3.5" fill="color-mix(in oklch, var(--color-tant-vin) 18%, transparent)" />
      {/* Handtaget */}
      <path d="M45 25c9-2 13 4 10 10s-9 7-13 6" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M45 25c9-2 13 4 10 10s-9 7-13 6" fill="none" stroke="var(--color-tant-kram)" strokeWidth="1.6" strokeLinecap="round" />
      {/* Koppen */}
      <path d="M12 20h38l-3.5 21c-1 5.5-5 8.5-10.5 8.5h-10c-5.5 0-9.5-3-10.5-8.5z" fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      {/* Prickar */}
      <g fill="var(--color-tant-kram)">
        <circle cx="20" cy="29" r="2.2" />
        <circle cx="31" cy="34" r="2.2" />
        <circle cx="42" cy="29" r="2.2" />
        <circle cx="25" cy="41" r="1.8" />
        <circle cx="37" cy="41" r="1.8" />
      </g>
      {/* Kanten och kaffet */}
      <ellipse cx="31" cy="20" rx="19" ry="5" fill="var(--color-tant-kram)" stroke={ink} strokeWidth="3" />
      <ellipse cx="31" cy="20.6" rx="14.5" ry="3" fill="oklch(0.42 0.07 50)" />
      <ellipse cx="26" cy="19.8" rx="4" ry="1" fill="oklch(0.62 0.06 60)" />
    </svg>
  )
}

// Min plats längst ner till vänster om handen, i samma stil som motspelarnas platser överst. Koppen landar här när det är
// min tur.
// raised: handen är lyft (min tur), och platsen följer med upp.
export function MySeat({ state, meId, turn, raised, className }: { state: GameState; meId: string; turn: boolean; raised: boolean; className?: string }) {
  return (
    // data-cup-seat och inte data-seat: kort som flyger till mig ska landa i handen, inte här.
    <div
      data-cup-seat={meId}
      data-cup-side="right"
      aria-label={turn ? 'Du, din tur' : 'Du'}
      className={cn('motion-safe:transition-[translate] motion-safe:duration-400', raised && 'max-sm:-translate-y-5', className)}
    >
      <span
        className={cn(
          // Fickan till höger (pr-10) är koppens plats.
          'flex items-center gap-1.5 rounded-full bg-card/85 py-0.5 pr-10 pl-0.5 shadow-soft-sm backdrop-blur-sm motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300 max-[420px]:gap-1 md:pr-12',
          turn && 'bg-coral-soft ring-3 ring-primary',
        )}
      >
        <LobbyFigur playerId={meId} avatar={state.players[meId]?.avatar ?? ''} lively={false} className="text-3xl max-[420px]:text-2xl md:text-4xl" />
        <span className="text-xs font-bold md:text-sm">Du</span>
      </span>
    </div>
  )
}
