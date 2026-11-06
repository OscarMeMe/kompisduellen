import { useEffect, useRef, useState } from 'react'
import { ChevronRight, CircleHelp, Menu } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import type { TantViewProps } from '@/components/lobby/types'
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
      data-spel="tantpanik"
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-room pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <StatusBar state={state} table={table} meId={me.id} onRules={() => setRules(true)} onMenu={() => setMenu(true)} />
      <Opponents state={state} table={table} meId={me.id} />

      {/* Bordet i mitten: högarna, och ovanpå dem det som väntar eller pågår. */}
      <section
        aria-label="Bordet"
        className="relative mx-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg bg-spel-yta/70 p-2 shadow-[inset_0_2px_12px_rgb(0_0_0/0.12)]"
      >
        {tantView?.peek && table.step !== 'arrange' && <Peek cards={tantView.peek} />}
        <Piles table={table} canDraw={canDraw} onDraw={() => onMove({ type: 'tDraw' })} />
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

      {/* Min hand, eller steget som tar handens plats. */}
      <div className="relative shrink-0">
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

      <RulesDialog open={rules} onOpenChange={setRules} />
      <MenuDialog open={menu} onOpenChange={setMenu} isHost={isHost} onAbort={onAbort} onLeave={onLeave} />
      <HistoryDialog open={history} onOpenChange={setHistory} table={table} />
    </div>
  )
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
          <li key={id} ref={turn ? current : undefined} className="shrink-0">
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

// Draghögen som en riktig kortlek (tjockare ju fler kort) och slänghögen med det översta kortet. Tryck på högen för att
// dra när det är min tur.
function Piles({ table, canDraw, onDraw }: { table: TantTable; canDraw: boolean; onDraw: () => void }) {
  const top = table.discardTop.at(-1)
  const layers = Math.min(6, Math.ceil(table.deckCount / 5))
  return (
    <div className="flex items-end justify-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={!canDraw}
          onClick={onDraw}
          aria-label={canDraw ? `Dra ett kort. ${table.deckCount} kort i högen` : `Draghögen, ${table.deckCount} kort`}
          className={cn(
            'relative w-28 [@media(min-height:760px)]:w-36 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:cursor-default',
            canDraw && 'ring-4 ring-primary motion-safe:animate-turn-pulse',
          )}
          style={{ marginTop: layers * 2, marginLeft: layers * 2 }}
        >
          {/* Kortleken: baksidor förskjutna några pixlar, så att den ser tjock ut. */}
          {Array.from({ length: layers }, (_, i) => (
            <TantBaksida
              key={i}
              sizes="144px"
              className="absolute inset-0 w-28 [@media(min-height:760px)]:w-36"
              style={{ transform: `translate(${-(layers - i) * 2}px, ${-(layers - i) * 2}px)` }}
            />
          ))}
          {table.deckCount > 0 ? (
            <TantBaksida sizes="144px" className="relative w-28 [@media(min-height:760px)]:w-36 drop-shadow-md" />
          ) : (
            <span className="block aspect-[107/147] w-28 [@media(min-height:760px)]:w-36 rounded-lg border-2 border-dashed border-foreground/30" />
          )}
          <span className="absolute -right-2 -bottom-2 rounded-full bg-foreground px-2 py-0.5 text-sm font-bold text-background tabular-nums shadow-soft-sm">
            {table.deckCount}
          </span>
        </button>
        <span className={cn('text-xs font-semibold', canDraw && 'font-bold text-primary-button')}>
          {canDraw ? 'Tryck för att dra' : 'Draghögen'}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        {top ? (
          <TantKort
            key={`${table.discardCount}-${top}`}
            type={top}
            size="small"
            className="w-28 [@media(min-height:760px)]:w-36 motion-safe:animate-pop"
          />
        ) : (
          <span className="block aspect-[107/147] w-28 [@media(min-height:760px)]:w-36 rounded-lg border-2 border-dashed border-foreground/30" />
        )}
        <span className="text-xs font-semibold">Slänghögen ({table.discardCount})</span>
      </div>
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
