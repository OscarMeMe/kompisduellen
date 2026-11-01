import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Crosshair, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Stamp } from '@/components/Stamp'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReactions, useThrows } from '@/hooks/useReactions'
import { arrowBetween, seatLayout, smallSeats, type Seat } from '@/lib/bord'
import { CLUE_ROUNDS, currentTurn, tallyVotes, type Clue, type ImposterMove, type ImposterTable } from '@/lib/imposterjakten'
import { THROW_COOLDOWN_MS, THROW_ITEMS, throwCooldownSeconds } from '@/lib/kast'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Imposterjakten vid bordet: spelarna sitter på stolar i en ring runt ett träbord i ett dämpat rum, sett ovanifrån, i turordning. Jag sitter
// längst ner. Vid varje plats står spelarens ord som små pratbubblor (varv 1 överst). I mitten står vad som händer
// just nu. Under diskussionen syns pilarna från Peka ut, och vid avslöjandet ritas rösterna som pilar en i taget innan
// impostern stämplas. Själva bordet är dolt för skärmläsare. De får samma information i en lista under.

type BordProps = {
  state: GameState
  table: ImposterTable
  meId: string
  online: OnlinePlayer[]
  // Vem som skriver på sitt ord just nu (bara den som har tur).
  typing: string | null
  // Det som står i mitten av bordet.
  center: ReactNode
  onMove: (move: ImposterMove) => void
  // Omröstningen: tryck på en spelare för att välja den. null när man inte kan rösta.
  vote?: { choice: string | null; candidates: string[]; onChoose: (id: string) => void } | null
}

// Tid mellan rösterna när de ritas, och pausen innan stämpeln.
const VOTE_STEP_MS = 250
const STAMP_PAUSE_MS = 450

export function Bord({ state, table, meId, online, typing, center, onMove, vote = null }: BordProps) {
  const seats = seatLayout(table.order, meId)
  const small = smallSeats(seats.length)
  const byId = Object.fromEntries(seats.map((seat) => [seat.id, seat]))
  const present = new Set(online.map((player) => player.id))
  const turn = table.step === 'ledtradar' ? currentTurn(table) : null
  const outcome = table.step === 'facit' ? table.outcome : null
  // Rösterna som visas: efter lika röster de från den första omröstningen, och vid avslöjandet allas röster.
  const shownVotes = table.tied && table.step === 'diskussion' ? table.tieVotes : (table.step === 'gissning' || outcome ? table.votes : null)
  const voteArrows = Object.entries(shownVotes ?? {}).filter(([from, to]) => byId[from] && byId[to])
  const counts = shownVotes ? tallyVotes(shownVotes).counts : {}
  const pointers = table.step === 'diskussion' ? Object.entries(table.pointers).filter(([from, to]) => byId[from] && byId[to]) : []
  const highlighted = table.tied && table.step === 'diskussion' ? table.tied : table.caught ? [table.caught] : []
  const revealing = shownVotes !== null && shownVotes !== undefined
  const stampDelay = voteArrows.length * VOTE_STEP_MS + STAMP_PAUSE_MS
  const inset = small ? 9 : 11

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg bg-room px-3 pt-4 pb-1 shadow-soft">
      <div className="relative mx-auto mt-3 mb-8 aspect-square w-full max-w-[min(100%,46svh)] short:mt-1 short:mb-6 short:max-w-[min(100%,45svh)]">
        {/* Träskivan med sin kant. Det som händer står på en ljus skylt mitt på bordet, så att texten går att läsa. */}
        <div aria-hidden className={cn('absolute rounded-full border-[6px] border-wood-edge bg-wood shadow-soft', small ? 'inset-[20%]' : 'inset-[17%]')} />
        <div
          aria-hidden
          className={cn(
            'absolute flex flex-col items-center justify-center rounded-full bg-card px-3 text-center shadow-soft-sm transition-colors',
            small ? 'inset-[29%]' : 'inset-[26%]',
            revealing && 'bg-muted',
          )}
        >
          {center}
        </div>

        {/* Stolarna, bakom spelarna. Rutan vrids mot bordet och flyttas utåt. */}
        {seats.map((seat) => (
          <div
            key={seat.id}
            aria-hidden
            className={cn('absolute rounded-md bg-chair shadow-soft-sm', small ? 'h-2.5 w-8' : 'h-3 w-11')}
            style={{
              left: `${seat.x}%`,
              top: `${seat.y}%`,
              transform: `translate(-50%, -50%) rotate(${seat.angle + 90}deg) translateY(${small ? -16 : -21}px)`,
            }}
          />
        ))}

        <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            <marker id="pil-peka" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className="fill-primary" />
            </marker>
            <marker id="pil-rost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className="fill-foreground" />
            </marker>
          </defs>
          {pointers.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              {...arrowBetween(byId[from], byId[to], inset)}
              pathLength={1}
              strokeDasharray="1"
              markerEnd="url(#pil-peka)"
              className="stroke-primary/70 motion-safe:animate-arrow-draw"
              strokeWidth={0.6}
            />
          ))}
          {voteArrows.map(([from, to], i) => (
            <line
              key={`${from}-${to}-${table.step}`}
              {...arrowBetween(byId[from], byId[to], inset)}
              pathLength={1}
              strokeDasharray="1"
              markerEnd="url(#pil-rost)"
              className="stroke-foreground/70 motion-safe:animate-arrow-draw motion-safe:[animation-delay:var(--d)]"
              style={{ '--d': `${i * VOTE_STEP_MS}ms` } as CSSProperties}
              strokeWidth={0.9}
            />
          ))}
        </svg>

        {/* Pratbubblorna med orden, inåt mot bordet från varje plats. */}
        {seats.map((seat) => (
          <Bubbles key={seat.id} seat={seat} clues={table.clues.filter((clue) => clue.player === seat.id)} small={small} />
        ))}

        {/* Platserna, som egna knappar så att de går att trycka på. */}
        {seats.map((seat) => (
          <SeatSpot
            key={seat.id}
            seat={seat}
            state={state}
            table={table}
            meId={meId}
            small={small}
            away={!present.has(seat.id)}
            turn={turn === seat.id}
            typing={typing === seat.id}
            dim={highlighted.length > 0 && !highlighted.includes(seat.id)}
            lit={highlighted.includes(seat.id)}
            votes={revealing ? (counts[seat.id] ?? 0) : null}
            voteDelay={revealing ? voteArrows.length * VOTE_STEP_MS : 0}
            stamp={outcome?.imposter === seat.id ? stampDelay : null}
            onMove={onMove}
            vote={vote}
          />
        ))}
      </div>
      </div>

      <TableForScreenReaders state={state} table={table} meId={meId} turn={turn} typing={typing} shownVotes={shownVotes ?? null} />
    </div>
  )
}

function Bubbles({ seat, clues, small }: { seat: Seat; clues: Clue[]; small: boolean }) {
  if (clues.length === 0) return null
  // Bubblorna står en bit in mot mitten från platsen.
  const toward = small ? 0.66 : 0.62
  const x = 50 + (seat.x - 50) * toward
  const y = 50 + (seat.y - 50) * toward
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {clues.slice(0, CLUE_ROUNDS).map((clue, i) => (
        <span
          key={i}
          className={cn(
            'max-w-20 truncate rounded-full border px-2 py-0.5 font-heading leading-tight font-bold shadow-soft-sm motion-safe:animate-pop',
            small ? 'max-w-14 px-1.5 text-[9px] sm:max-w-20 sm:text-[11px]' : 'text-xs',
            clue.word ? 'bg-sun-soft' : clue.kind === 'pass' ? 'bg-muted text-muted-foreground' : 'bg-mint-soft',
          )}
        >
          {clue.word ?? (clue.kind === 'pass' ? 'pass' : '✓ sa sitt')}
        </span>
      ))}
    </div>
  )
}

type SeatProps = {
  seat: Seat
  state: GameState
  table: ImposterTable
  meId: string
  small: boolean
  away: boolean
  turn: boolean
  typing: boolean
  dim: boolean
  lit: boolean
  votes: number | null
  voteDelay: number
  // Fördröjningen innan IMPOSTER-stämpeln, eller null.
  stamp: number | null
  onMove: (move: ImposterMove) => void
  vote: BordProps['vote']
}

function SeatSpot({ seat, state, table, meId, small, away, turn, typing, dim, lit, votes, voteDelay, stamp, onMove, vote }: SeatProps) {
  const player = state.players[seat.id]
  const name = player?.name ?? 'Någon'
  const mine = seat.id === meId
  const chosen = vote?.choice === seat.id
  const reactions = useReactions()
  const reaction = reactions?.floating.filter((item) => item.from === seat.id).at(-1)

  const look = (
    <>
      <span
        // Ny ring för varje tur, så att pulsen spelas en gång när turen byts.
        key={turn ? `tur-${table.turn}` : 'vilar'}
        className={cn(
          'relative flex items-center justify-center rounded-full border-2 bg-card shadow-soft-sm transition',
          small ? 'size-10' : 'size-12 sm:size-14',
          turn && 'border-primary ring-4 ring-primary motion-safe:animate-turn-pulse',
          (chosen || lit) && 'border-primary ring-4 ring-sun',
          mine && !turn && 'border-primary/50',
          away && 'opacity-40',
        )}
      >
        <Emoji emoji={player?.avatar ?? '🙂'} className={small ? 'text-xl' : 'text-2xl sm:text-3xl'} />
        {votes !== null && votes > 0 && (
          <span
            className="absolute -top-1.5 -right-2 rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background tabular-nums motion-safe:animate-pop motion-safe:[animation-delay:var(--d)]"
            style={{ '--d': `${voteDelay}ms` } as CSSProperties}
          >
            {votes}
          </span>
        )}
      </span>
      <span className={cn('relative max-w-16 truncate rounded-full bg-room/85 px-1 font-semibold', small ? 'text-[11px]' : 'text-xs sm:text-sm', mine && 'text-primary')}>
        {mine ? 'Du' : name}
      </span>
      {turn && (
        <span className="relative rounded-full bg-card px-1.5 text-[11px] font-semibold text-primary">{typing ? 'skriver…' : mine ? 'din tur' : table.aloud ? 'säger sitt ord' : 'funderar…'}</span>
      )}
      {away && <span className="text-[11px] text-muted-foreground">borta</span>}
      {stamp !== null && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/3 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ '--d': `${stamp}ms` } as CSSProperties}
        >
          <Stamp className="bg-card/85 px-1.5 py-0 text-sm motion-safe:[animation-delay:var(--d)]">Imposter</Stamp>
        </span>
      )}
      {reaction && (
        <span
          key={reaction.key}
          className="pointer-events-none absolute -top-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-sm whitespace-nowrap shadow-soft motion-safe:animate-reaction motion-reduce:animate-reaction-fade"
        >
          <Emoji emoji={reaction.emoji} className="text-xl leading-none" />
          {reaction.target !== undefined && <span className="max-w-20 truncate text-xs font-semibold">→ {reaction.target}</span>}
        </span>
      )}
    </>
  )

  const position = cn(
    'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
    dim && 'opacity-50',
  )
  const style = { left: `${seat.x}%`, top: `${seat.y}%` }
  const label = `${name}${mine ? ' (du)' : ''}`

  // Omröstningen: tryck på en spelare för att välja den.
  if (vote && vote.candidates.includes(seat.id)) {
    return (
      <button type="button" className={position} style={style} aria-pressed={chosen} aria-label={`Rösta på ${label}`} onClick={() => vote.onChoose(seat.id)}>
        {look}
      </button>
    )
  }
  if (mine) {
    return (
      <div className={position} style={style} aria-label={label}>
        {look}
      </div>
    )
  }
  return (
    <SeatMenu seatId={seat.id} name={name} table={table} meId={meId} onMove={onMove} className={position} style={style}>
      {look}
    </SeatMenu>
  )
}

// Tryck på en spelare: kasta något på den, och under diskussionen Peka ut (eller ta bort sin pil).
function SeatMenu({
  seatId,
  name,
  table,
  meId,
  onMove,
  className,
  style,
  children,
}: {
  seatId: string
  name: string
  table: ImposterTable
  meId: string
  onMove: (move: ImposterMove) => void
  className: string
  style: CSSProperties
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const throws = useThrows()
  const wait = useThrowWait(throws?.lastThrowAt ?? null)
  const canThrow = !!throws?.allowed && throws.targets.some((target) => target.id === seatId)
  const canPoint = table.step === 'diskussion' && table.order.includes(meId)
  const pointing = table.pointers[meId] === seatId
  if (!canThrow && !canPoint) {
    return (
      <div className={className} style={style} aria-label={name}>
        {children}
      </div>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={className} style={style} aria-label={`${name}: kasta något${canPoint ? ' eller peka ut' : ''}`}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3" side="top">
        <p className="text-center font-heading font-bold">{name}</p>
        {canPoint && (
          <div className="space-y-1">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-card px-3 font-semibold shadow-soft-sm hover:bg-coral-soft"
              onClick={() => {
                onMove({ type: 'point', target: pointing ? null : seatId })
                setOpen(false)
              }}
            >
              {pointing ? <X className="size-4" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
              {pointing ? 'Ta bort min pil' : 'Peka ut'}
            </button>
            <p className="text-center text-xs text-muted-foreground">Peka ut är inte din röst.</p>
          </div>
        )}
        {canThrow && (
          <div className="space-y-1">
            <p className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
              {wait > 0 ? `Du kan kasta igen om ${wait} s` : 'Kasta något'}
            </p>
            <div className="flex justify-center gap-1.5">
              {THROW_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={wait > 0}
                  aria-label={`Kasta ${item.text} på ${name}`}
                  className="flex h-11 w-10 items-center justify-center rounded-md border bg-card text-2xl shadow-soft-sm hover:bg-sun-soft disabled:opacity-40"
                  onClick={() => {
                    throws.throwAt(seatId, item.id)
                    setOpen(false)
                  }}
                >
                  <Emoji emoji={item.emoji} />
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Sekunder kvar av spärren efter ett kast.
function useThrowWait(lastThrowAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (lastThrowAt === null) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() - lastThrowAt >= THROW_COOLDOWN_MS) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [lastThrowAt])
  return throwCooldownSeconds(lastThrowAt, now)
}

// Samma information som bordet, som en lista för skärmläsare.
function TableForScreenReaders({
  state,
  table,
  meId,
  turn,
  typing,
  shownVotes,
}: {
  state: GameState
  table: ImposterTable
  meId: string
  turn: string | null
  typing: string | null
  shownVotes: Record<string, string> | null
}) {
  const nameOf = (id: string) => (id === meId ? 'du' : (state.players[id]?.name ?? 'någon'))
  return (
    <ol className="sr-only" aria-label="Spelarna runt bordet i turordning">
      {table.order.map((id) => {
        const clues = table.clues.filter((clue) => clue.player === id)
        const words = clues.map((clue) => clue.word ?? (clue.kind === 'pass' ? 'pass' : 'sa sitt ord'))
        const parts = [
          state.players[id]?.name ?? 'Någon',
          id === meId ? '(du)' : '',
          turn === id ? (typing === id ? 'har tur och skriver' : 'har tur') : '',
          words.length > 0 ? `Ord: ${words.join(', ')}.` : '',
          table.step === 'diskussion' && table.pointers[id] ? `Pekar ut ${nameOf(table.pointers[id])}.` : '',
          shownVotes?.[id] ? `Röstade på ${nameOf(shownVotes[id])}.` : '',
          table.outcome?.imposter === id ? 'Var impostern.' : '',
        ]
        return <li key={id}>{parts.filter(Boolean).join(' ')}</li>
      })}
    </ol>
  )
}
