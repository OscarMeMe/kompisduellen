import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronRight, CircleHelp, Menu } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import type { TantViewProps } from '@/components/lobby/types'
import { TableAnimations } from '@/components/tantpanik/TantAnimationer'
import { TantHand } from '@/components/tantpanik/TantHand'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { HistoryDialog, MenuDialog, RulesDialog } from '@/components/tantpanik/TantMenyer'
import { Arrange, NopeWindow, Peek, Place, Waiting } from '@/components/tantpanik/TantSteg'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useThrows } from '@/hooks/useReactions'
import { useThrowWait } from '@/hooks/useThrowWait'
import { THROW_ITEMS } from '@/lib/kast'
import type { GameState } from '@/lib/match'
import type { TantEvent, TantTable } from '@/lib/tantpanik'
import { cn } from '@/lib/utils'

// Hur länge ett besked syns innan det försvinner (ms).
const NOTICE_MS = 2500

// Exploderande Tanter: hela matchen som ett kortbord som tar hela skärmen. Överst vad jag ska göra, sedan motspelarna,
// högarna i mitten, en rad med det senaste och min hand längst ner. Reglerna, menyn och historiken ligger bakom knappar.
// Prispallen efteråt är gemensam för alla spel.
export function TantpanikView({ state, me, isHost, clockOffset, tantView, onMove, onAbort, onLeave }: TantViewProps) {
  const table = state.tantpanik
  const [rules, setRules] = useState(false)
  const [menu, setMenu] = useState(false)
  const [history, setHistory] = useState(false)
  const notice = useFleeting(tantView?.notice ?? null)
  // Bordet skakar när en exploderande tant vänds (ny key startar om skakningen).
  const [shake, setShake] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!shake || !root) return
    // Klassen tas bort och läggs till igen, så att skakningen börjar om utan att något ritas om.
    root.classList.remove('motion-safe:animate-table-shake')
    void root.offsetWidth
    root.classList.add('motion-safe:animate-table-shake')
  }, [shake])
  const [pileRef, pileSize] = usePileSize()
  if (!table) return null
  const inMatch = table.order.includes(me.id)
  const out = table.out.includes(me.id)
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  // Göm tanten och Ändra framtiden tar handens plats, eftersom inget annat kan spelas medan de pågår.
  const sheet =
    table.step === 'place' && table.current === me.id ? (
      <Place deckCount={table.deckCount} onMove={onMove} />
    ) : table.step === 'arrange' && tantView?.arrange ? (
      <Arrange key={tantView.arrange.join()} cards={tantView.arrange} onMove={onMove} />
    ) : null
  const waiting =
    table.step === 'arrange' && !tantView?.arrange
      ? `${name(table.current)} möblerar om högen…`
      : table.step === 'place' && table.current !== me.id
        ? `${name(table.current)} gömmer tanten någonstans i högen…`
        : table.step === 'give' && table.favor && table.favor.from !== me.id
          ? `${name(table.favor.from)} väljer ett kort att ge ${table.favor.to === me.id ? 'dig' : name(table.favor.to)}…`
          : null
  const canDraw = inMatch && !out && table.step === 'turn' && table.current === me.id && !table.error

  return (
    <div
      ref={rootRef}
      data-spel="tantpanik"
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-room pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <StatusBar state={state} table={table} meId={me.id} onRules={() => setRules(true)} onMenu={() => setMenu(true)} />
      <Opponents state={state} table={table} meId={me.id} />

      {/* Bordet i mitten: högarna, och ovanpå dem det som väntar eller pågår. */}
      <section
        aria-label="Bordet"
        // Ett kortbord: filt med träkant, som Imposterjaktens bord.
        className="relative mx-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-[1.75rem] border-[7px] border-wood bg-felt p-2 shadow-[inset_0_2px_14px_rgb(0_0_0/0.15)] ring-2 ring-wood-edge"
      >
        {/* Högarna växer och fyller bordet när det finns plats. */}
        <div ref={pileRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
          <Piles table={table} size={pileSize} canDraw={canDraw} onDraw={() => onMove({ type: 'tDraw' })} />
        </div>
        {/* Se framtiden ligger överst på bordet, ovanpå högarna, så att draghögen behåller sin storlek. */}
        {tantView?.peek && table.step !== 'arrange' && (
          <div className="absolute inset-x-0 top-1.5 z-10 flex justify-center px-1.5">
            <Peek cards={tantView.peek} />
          </div>
        )}
        {notice && (
          <p
            key={notice.n}
            role="status"
            className="pointer-events-none absolute inset-x-3 top-2 z-20 mx-auto w-fit max-w-full rounded-full bg-sun-soft px-4 py-1.5 text-center text-sm font-semibold shadow-soft motion-safe:animate-pop"
          >
            {notice.text}
          </p>
        )}
        {(table.error || waiting || (table.step === 'window' && table.pending)) && (
          <div className="absolute inset-x-2 top-1/2 z-10 -translate-y-1/2">
            {table.error ? (
              <p role="alert" className="rounded-lg bg-card px-3 py-3 text-center font-semibold text-destructive shadow-lift">
                {table.error}
              </p>
            ) : table.step === 'window' && table.pending ? (
              <NopeWindow state={state} table={table} meId={me.id} clockOffset={clockOffset} />
            ) : (
              waiting && <Waiting text={waiting} />
            )}
          </div>
        )}
      </section>

      <LogLine table={table} onOpen={() => setHistory(true)} />

      {/* Min hand, eller steget som tar handens plats. Det dragna kortet åker ner hit (data-tant-hand). */}
      <div data-tant-hand className="relative shrink-0">
        {sheet ? (
          <div className="px-2 pb-2">{sheet}</div>
        ) : inMatch && !out && tantView ? (
          <TantHand
            // Valen börjar om när turen eller steget byts.
            key={`${table.current}-${table.step}-${table.turnsLeft}`}
            state={state}
            table={table}
            meId={me.id}
            hand={tantView.hand}
            giving={table.step === 'give' && table.favor?.from === me.id}
            clockOffset={clockOffset}
            onMove={onMove}
          />
        ) : (
          <p className="mx-2 mb-3 rounded-md bg-card px-3 py-3 text-center text-sm font-semibold shadow-soft-sm">
            {!inMatch ? 'Du är med från nästa match.' : out ? 'Du är ute. Följ resten av matchen.' : 'Din hand kommer strax…'}
          </p>
        )}
      </div>

      <TableAnimations state={state} table={table} meId={me.id} tantView={tantView} onShake={setShake} />
      <RulesDialog open={rules} onOpenChange={setRules} />
      <MenuDialog open={menu} onOpenChange={setMenu} isHost={isHost} onAbort={onAbort} onLeave={onLeave} />
      <HistoryDialog open={history} onOpenChange={setHistory} table={table} />
    </div>
  )
}

// Hur bred draghögen får vara (px): den fyller bordets höjd, men slänghögen ska få plats bredvid (DISCARD_SPREAD).
// På 360 × 640 blir den cirka 120 px.
function usePileSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(112)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      // Plats för texten under högarna och kortlekens tjocklek, och lite luft runt om.
      const byHeight = (element.clientHeight - 36) * 0.76 * (107 / 147)
      const byWidth = (element.clientWidth - 8) / DISCARD_SPREAD
      setSize(Math.round(Math.max(72, Math.min(byHeight, byWidth, 240))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

// Ett besked visas en gång, en kort stund, och aldrig igen (samma nummer visas inte två gånger).
function useFleeting(event: TantEvent | null): TantEvent | null {
  const [shown, setShown] = useState<TantEvent | null>(null)
  const seen = useRef(new Set<number>())
  useEffect(() => {
    if (!event || seen.current.has(event.n)) return
    seen.current.add(event.n)
    setShown(event)
    const timer = setTimeout(() => setShown((current) => (current?.n === event.n ? null : current)), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [event])
  return shown
}

// Raden överst: reglerna, vad JAG ska göra just nu (korallröd när det är något jag ska göra) och menyn.
function StatusBar({
  state,
  table,
  meId,
  onRules,
  onMenu,
}: {
  state: GameState
  table: TantTable
  meId: string
  onRules: () => void
  onMenu: () => void
}) {
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const turns = table.turnsLeft > 1 ? ` · ${table.turnsLeft} turer` : ''
  let text: string
  let mine = false
  if (table.winner) text = `${name(table.winner)} vinner!`
  else if (table.out.includes(meId)) text = 'Du är ute'
  else if (table.step === 'window') text = 'Nope! eller vänta…'
  else if (table.step === 'give') {
    mine = table.favor?.from === meId
    text = mine ? `Ge ett kort till ${name(table.favor!.to)}` : 'Väntar på en tjänst…'
  } else if (table.current === meId) {
    mine = true
    text = table.step === 'place' ? 'Göm tanten!' : table.step === 'arrange' ? 'Ordna korten' : `Din tur!${turns}`
  } else text = `${name(table.current)}s tur${turns}`
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 px-2">
      <button
        type="button"
        aria-label="Så spelas det"
        onClick={onRules}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-soft-sm"
      >
        <CircleHelp aria-hidden className="size-5" />
      </button>
      <p
        role="status"
        className={cn(
          'min-w-0 flex-1 truncate rounded-full px-3 py-1.5 text-center font-heading text-lg font-bold',
          mine ? 'bg-primary-button text-primary-foreground' : 'bg-card shadow-soft-sm',
        )}
      >
        {text}
      </p>
      <button
        type="button"
        aria-label="Meny"
        onClick={onMenu}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-soft-sm"
      >
        <Menu aria-hidden className="size-5" />
      </button>
    </div>
  )
}

// Motspelarna i turordning, från den som kommer efter mig: figur, namn och en liten solfjäder med baksidor. Den som har
// tur lyser. Raden går att svepa när de inte får plats, och den som har tur scrollas fram.
function Opponents({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  const start = Math.max(0, table.order.indexOf(meId))
  const ids = [...table.order.slice(start + 1), ...table.order.slice(0, start)].filter((id) => id !== meId)
  const current = useRef<HTMLLIElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [table.current])
  return (
    <ul aria-label="Motspelarna" className="flex shrink-0 justify-center-safe gap-1 overflow-x-auto px-2 pt-1 pb-2 [scrollbar-width:none]">
      {ids.map((id) => {
        const out = table.out.includes(id)
        const turn = table.current === id && !out && !table.winner
        return (
          <li key={id} ref={turn ? current : undefined} data-seat={id} className="shrink-0">
            <Opponent state={state} id={id} out={out} turn={turn} count={table.handCounts[id] ?? 0} narrow={ids.length > 4} />
          </li>
        )
      })}
    </ul>
  )
}

// narrow: med fler än fyra motspelare blir platserna smalare, så att fem får plats på 360 px.
function Opponent({
  state,
  id,
  out,
  turn,
  count,
  narrow,
}: {
  state: GameState
  id: string
  out: boolean
  turn: boolean
  count: number
  narrow: boolean
}) {
  const [open, setOpen] = useState(false)
  const throws = useThrows()
  const wait = useThrowWait(throws?.lastThrowAt ?? null)
  const name = state.players[id]?.name ?? 'Någon'
  const canThrow = !!throws?.allowed && throws.targets.some((target) => target.id === id)
  const seat = (
    <span
      className={cn(
        'flex flex-col items-center rounded-lg px-1 pt-1 pb-0.5 motion-safe:transition-colors',
        narrow ? 'w-16' : 'w-20',
        turn && 'bg-coral-soft shadow-[0_0_16px_2px] shadow-primary/40 ring-2 ring-primary',
        out && 'opacity-45 grayscale',
      )}
    >
      <LobbyFigur playerId={id} avatar={state.players[id]?.avatar ?? ''} className="text-3xl" />
      <span className="w-full truncate text-center text-xs font-bold">{name}</span>
      {out ? <span className="text-[11px] font-semibold text-muted-foreground">Ute</span> : <MiniFan count={count} />}
    </span>
  )
  const label = `${name}, ${out ? 'ute' : `${count} kort`}${turn ? ', har turen' : ''}`
  if (!canThrow) return <div aria-label={label}>{seat}</div>
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}. Kasta något`}
        className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        {seat}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3" side="bottom">
        <p className="text-center font-heading font-bold">{name}</p>
        <p className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {wait > 0 ? `Du kan kasta igen om ${wait} s` : 'Kasta något'}
        </p>
        <div className="mt-1 flex justify-center gap-1.5">
          {THROW_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={wait > 0}
              aria-label={`Kasta ${item.text} på ${name}`}
              className="flex h-11 w-10 items-center justify-center rounded-md border bg-card text-2xl shadow-soft-sm hover:bg-sun-soft disabled:opacity-40"
              onClick={() => {
                throws?.throwAt(id, item.id)
                setOpen(false)
              }}
            >
              <Emoji emoji={item.emoji} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// En liten solfjäder med baksidor (högst fem) och antalet kort.
function MiniFan({ count }: { count: number }) {
  const shown = Math.min(5, count)
  const mid = (shown - 1) / 2
  return (
    <span aria-hidden className="flex h-6 items-end gap-1">
      <span className="relative h-5 w-9">
        {Array.from({ length: shown }, (_, i) => (
          <TantBaksida
            key={i}
            sizes="16px"
            className="absolute bottom-0 w-3.5 origin-bottom drop-shadow-sm"
            style={{ left: `${10 + (i - mid) * 5}px`, rotate: `${(i - mid) * 12}deg` }}
          />
        ))}
      </span>
      <span className="text-xs font-bold tabular-nums">{count}</span>
    </span>
  )
}

// Slänghögen är mindre än draghögen, ligger snett och överlappar draghögens högra kant (andelar av draghögens bredd).
const DISCARD_SCALE = 0.6
const DISCARD_OVERLAP = 0.35
// Hur många draghögsbredder högarna tar tillsammans när draghögen står i mitten: slänghögen sticker ut åt höger, och
// lika mycket plats lämnas till vänster.
const DISCARD_SPREAD = 1 + 2 * DISCARD_SCALE * (1 - DISCARD_OVERLAP)
// De översta korten i slänghögen ligger åt lite olika håll, som om de slängts dit (grader, översta sist).
const DISCARD_TILT = [-7, 4, 11]

// Draghögen är huvudsaken: stor, i mitten och tjock som en riktig kortlek. Tryck på den för att dra när det är min tur.
// Slänghögen ligger mindre och snett över draghögens hörn, med de senaste korten åt olika håll.
function Piles({ table, size, canDraw, onDraw }: { table: TantTable; size: number; canDraw: boolean; onDraw: () => void }) {
  const sizes = `${size}px`
  const discard = Math.round(size * DISCARD_SCALE)
  const layers = Math.min(6, Math.ceil(table.deckCount / 5))
  const shown = table.discardTop.slice(-3)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size }}>
        <button
          type="button"
          disabled={!canDraw}
          onClick={onDraw}
          aria-label={canDraw ? `Dra ett kort. ${table.deckCount} kort i högen` : `Draghögen, ${table.deckCount} kort`}
          className={cn(
            'relative block w-full rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:cursor-default',
            canDraw && 'ring-4 ring-primary motion-safe:animate-turn-pulse',
          )}
          data-tant-pile
        >
          {/* Kortleken: baksidor förskjutna några pixlar, så att den ser tjock ut. */}
          {Array.from({ length: layers }, (_, i) => (
            <TantBaksida
              key={i}
              sizes={sizes}
              className="absolute inset-0 w-full"
              style={{ transform: `translate(${(layers - i) * 2}px, ${(layers - i) * 2}px)` }}
            />
          ))}
          {table.deckCount > 0 ? (
            <TantBaksida sizes={sizes} className="relative w-full drop-shadow-md" />
          ) : (
            <span className="block aspect-[107/147] w-full rounded-lg border-2 border-dashed border-foreground/30" />
          )}
          <span className="absolute -top-2 -left-2 rounded-full bg-foreground px-2 py-0.5 text-sm font-bold text-background tabular-nums shadow-soft-sm">
            {table.deckCount}
          </span>
        </button>

        {/* Slänghögen tar inga tryck, så att hela draghögen går att trycka på. */}
        <div
          aria-label={`Slänghögen, ${table.discardCount} kort`}
          className="pointer-events-none absolute bottom-[6%] z-10"
          style={{ left: size - discard * DISCARD_OVERLAP, width: discard }}
        >
          {shown.length === 0 ? (
            <span className="block aspect-[107/147] w-full rotate-6 rounded-lg border-2 border-dashed border-foreground/30" />
          ) : (
            <div className="relative aspect-[107/147] w-full">
              {shown.map((type, i) => {
                const latest = i === shown.length - 1
                return (
                  <div
                    key={`${table.discardCount - shown.length + i}-${type}`}
                    aria-hidden={!latest}
                    className={cn('absolute inset-0 drop-shadow-lg', latest && 'motion-safe:animate-pop')}
                    style={{ rotate: `${DISCARD_TILT[i + 3 - shown.length]}deg` }}
                  >
                    <TantKort type={type} size="small" sizes={`${discard}px`} className="w-full" />
                  </div>
                )
              })}
            </div>
          )}
          <span className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-soft-sm">
            Slänghögen {table.discardCount}
          </span>
        </div>
      </div>
      {/* Under kortlekens tjocklek, så att texten inte hamnar bakom den. */}
      <span className={cn('text-xs font-semibold', canDraw && 'font-bold text-primary-button')} style={{ marginTop: layers * 2 + 2 }}>
        {canDraw ? 'Tryck för att dra' : 'Draghögen'}
      </span>
    </div>
  )
}

// Det senaste som hänt, på en rad. Ett tryck visar historiken. Skärmläsare får nya rader upplästa.
function LogLine({ table, onOpen }: { table: TantTable; onOpen: () => void }) {
  const last = table.log.at(-1)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Det senaste: ${last?.text ?? ''}. Visa allt som hänt`}
      className="mx-2 mt-1.5 flex h-9 shrink-0 items-center gap-1 rounded-full bg-card/80 px-3 text-left text-sm shadow-soft-sm"
    >
      <span aria-live="polite" className="min-w-0 flex-1 truncate font-semibold">
        {last?.text}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
