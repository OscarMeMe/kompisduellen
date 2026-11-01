import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Crosshair, Pointer, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Stamp } from '@/components/Stamp'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReactions, useThrows } from '@/hooks/useReactions'
import { clueLine, curvedArrow, pointingHand, seatLayout, smallSeats, type Seat } from '@/lib/bord'
import { canAccuse, currentTurn, tallyVotes, type Clue, type ImposterMove, type ImposterTable } from '@/lib/imposterjakten'
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
// Efter rösterna: så länge efter att rummet börjat mörkna tänds ljuset på impostern.
const SPOT_AFTER_MS = 450
// Så mycket senare kommer stämpeln än utan släckningen.
const LIGHTS_OUT_MS = 500

export function Bord({ state, table, meId, online, typing, center, onMove, vote = null }: BordProps) {
  const seats = seatLayout(table.order, meId)
  const small = smallSeats(seats.length)
  const byId = Object.fromEntries(seats.map((seat) => [seat.id, seat]))
  const present = new Set(online.map((player) => player.id))
  const turn = table.step === 'ledtradar' && !table.accusation ? currentTurn(table) : null
  const outcome = table.step === 'facit' ? table.outcome : null
  // Rösterna som visas: efter lika röster de från den första omröstningen, och vid avslöjandet allas röster.
  const shownVotes = table.tied && table.step === 'diskussion' ? table.tieVotes : (table.step === 'gissning' || outcome ? table.votes : null)
  const voteArrows = Object.entries(shownVotes ?? {}).filter(([from, to]) => byId[from] && byId[to])
  const counts = shownVotes ? tallyVotes(shownVotes).counts : {}
  const pointers = table.step === 'diskussion' ? Object.entries(table.pointers).filter(([from, to]) => byId[from] && byId[to]) : []
  const highlighted = table.accusation ? [table.accusation.accused] : table.tied && table.step === 'diskussion' ? table.tied : table.caught ? [table.caught] : []
  const revealing = shownVotes !== null && shownVotes !== undefined
  const votesDrawnMs = voteArrows.length * VOTE_STEP_MS
  // Avslöjandet: lampan släcks, spotlight på impostern, sedan stämpeln. Inte när omgången avbröts.
  const revealImposter = outcome && outcome.kind !== 'avbruten' ? outcome.imposter : null
  const stampDelay = votesDrawnMs + STAMP_PAUSE_MS + (revealImposter ? LIGHTS_OUT_MS : 0)
  const inset = small ? 10 : 12
  // Ljuset faller på den som har tur, och vid avslöjandet på impostern.
  const lit = revealImposter ? byId[revealImposter] : turn ? byId[turn] : undefined

  return (
    <div className="space-y-2">
      <div className="relative -mx-2 rounded-lg bg-room px-2 pt-13 pb-19 shadow-soft sm:mx-0 sm:px-3">
      {/* Rummet mörknar kort. Impostern och ljuskäglan ligger ovanpå. */}
      {revealImposter && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-lg bg-foreground opacity-0 motion-safe:animate-lights-out motion-safe:[animation-delay:var(--d)]"
          style={{ '--d': `${votesDrawnMs}ms` } as CSSProperties}
        />
      )}
      {/* Bordet fyller rummet men får plats på skärmen tillsammans med svarsdelen. Många spelare får lite mer höjd på mobil. */}
      <div className={cn('relative mx-auto w-full max-w-[min(100%,calc(100svh-20rem))] sm:max-w-[min(100%,calc(100svh-22rem))]', small ? 'aspect-[3/4] sm:aspect-square' : 'aspect-square')}>
        {/* Träskivan med sin kant. Det som händer står på en ljus skylt mitt på bordet, så att texten går att läsa. */}
        <div aria-hidden className={cn('absolute rounded-full border-[6px] border-wood-edge bg-wood shadow-soft', small ? 'inset-[24%]' : 'inset-[23%]')} />
        <div
          aria-hidden
          className={cn(
            'absolute flex flex-col items-center justify-center rounded-full bg-card px-3 text-center shadow-soft-sm transition-colors',
            small ? 'inset-[31%]' : 'inset-[30%]',
            revealing && 'bg-muted',
          )}
        >
          {center}
        </div>

        <TurnLight target={lit} small={small} spotDelay={revealImposter ? votesDrawnMs + SPOT_AFTER_MS : null} />

        {/* Stolarna: en rund sits under varje figur. */}
        {seats.map((seat) => (
          <div
            key={seat.id}
            aria-hidden
            className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-chair/30', small ? 'size-13 sm:size-17' : 'size-17 sm:size-21')}
            style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
          />
        ))}

        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            <marker id="pil-rost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className="fill-foreground" />
            </marker>
          </defs>
          {pointers.map(([from, to]) => (
            <path
              key={`${from}-${to}`}
              d={curvedArrow(byId[from], byId[to], inset)}
              fill="none"
              strokeDasharray="1.2 1.6"
              className="stroke-primary/50"
              strokeWidth={0.5}
            />
          ))}
          {voteArrows.map(([from, to], i) => (
            <path
              key={`${from}-${to}-${table.step}`}
              d={curvedArrow(byId[from], byId[to], inset)}
              fill="none"
              pathLength={1}
              strokeDasharray="1"
              markerEnd="url(#pil-rost)"
              className="stroke-foreground/70 motion-safe:animate-arrow-draw motion-safe:[animation-delay:var(--d)]"
              style={{ '--d': `${i * VOTE_STEP_MS}ms` } as CSSProperties}
              strokeWidth={0.9}
            />
          ))}
        </svg>

        {/* Peka ut: en hand vid den som pekar, riktad mot den som pekas ut. Den prickiga linjen visar hela vägen. */}
        {pointers.map(([from, to]) => {
          const hand = pointingHand(byId[from], byId[to], small ? 12 : 14)
          return (
            <span
              key={`${from}-${to}`}
              aria-hidden
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-pop"
              style={{ left: `${hand.x}%`, top: `${hand.y}%` }}
            >
              <Pointer
                className={cn('rounded-full bg-card fill-sun p-0.5 text-primary shadow-soft-sm', small ? 'size-6' : 'size-8')}
                strokeWidth={2.2}
                style={{ rotate: `${hand.degrees}deg` }}
              />
            </span>
          )
        })}

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

      {small && <AllClues state={state} table={table} />}

      <TableForScreenReaders state={state} table={table} meId={meId} turn={turn} typing={typing} shownVotes={shownVotes ?? null} />
    </div>
  )
}

// En mjuk ljusfläck på den som har tur. Den glider över när turen byts. Med "minska rörelse" hoppar den direkt.
function TurnLight({ target, small, spotDelay }: { target: { x: number; y: number } | undefined; small: boolean; spotDelay: number | null }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--sun)_85%,transparent)_20%,transparent_70%)] motion-safe:transition-[left,top,opacity] motion-safe:duration-500',
        // Vid avslöjandet en mindre, tydligare fläck på impostern.
        spotDelay !== null ? 'w-[26%]' : small ? 'w-[38%]' : 'w-[48%]',
        !target && 'opacity-0',
        spotDelay !== null && 'z-[25] motion-safe:animate-spot-in motion-safe:[animation-delay:var(--d)]',
      )}
      style={{ left: `${target?.x ?? 50}%`, top: `${target?.y ?? 50}%`, '--d': `${spotDelay ?? 0}ms` } as CSSProperties}
    />
  )
}

// Allt spelaren sagt i en enda bubbla, utanför bordet: ovanför figuren på övre halvan och under namnet på nedre. Vid
// sidorna av bordet är det trångt, så där blir bubblan smalare. Med många spelare finns bara plats för det senaste
// ordet, och då står allas ord i en lista under bordet (AllClues). Bubblan flyttas då lite utåt från grannen.
function Bubbles({ seat, clues, small }: { seat: Seat; clues: Clue[]; small: boolean }) {
  if (clues.length === 0) return null
  const above = seat.y < 50
  const atSide = Math.abs(seat.x - 50) > 25
  const nudge = small ? Math.sign(seat.x - 50) * 5 : 0
  const left = Math.min(atSide ? 88 : 72, Math.max(atSide ? 12 : 28, seat.x + nudge))
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-2xl border bg-sun-soft text-center font-heading leading-tight font-bold shadow-soft-sm motion-safe:animate-fade',
        // --f = halva figuren och --n = namnet, så att bubblan börjar där de slutar.
        small
          ? 'max-w-[4.5rem] truncate px-1.5 py-0.5 text-xs [--f:1.375rem] [--n:1.1rem] sm:max-w-28 sm:text-sm sm:[--f:1.75rem] sm:[--n:1.4rem]'
          : 'px-2 py-0.5 text-sm [--f:1.75rem] [--n:1.4rem] sm:text-base sm:[--f:2rem] sm:[--n:1.75rem]',
        !small && (atSide ? 'max-w-[5.25rem] sm:max-w-28' : 'max-w-36'),
      )}
      style={{
        left: `${left}%`,
        top: above ? undefined : `calc(${seat.y}% + var(--f) + var(--n))`,
        bottom: above ? `calc(${100 - seat.y}% + var(--f) + 0.25rem)` : undefined,
      }}
    >
      {clueLine(small ? clues.slice(-1) : clues)}
    </div>
  )
}

// Allas ord under bordet, för många spelare där bubblorna bara rymmer det senaste ordet.
function AllClues({ state, table }: { state: GameState; table: ImposterTable }) {
  const rows = table.order.filter((id) => table.clues.some((clue) => clue.player === id))
  if (rows.length === 0) return null
  return (
    <ul aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-card/80 px-3 py-2 text-sm sm:text-base">
      {rows.map((id) => (
        <li key={id} className="min-w-0">
          <span className="font-bold">{state.players[id]?.name ?? 'Någon'}:</span> {clueLine(table.clues.filter((clue) => clue.player === id))}
        </li>
      ))}
    </ul>
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
  dim: boolean
  lit: boolean
  votes: number | null
  voteDelay: number
  // Fördröjningen innan IMPOSTER-stämpeln, eller null.
  stamp: number | null
  onMove: (move: ImposterMove) => void
  vote: BordProps['vote']
}

function SeatSpot({ seat, state, table, meId, small, away, turn, dim, lit, votes, voteDelay, stamp, onMove, vote }: SeatProps) {
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
          small ? 'size-11 sm:size-14' : 'size-14 sm:size-16',
          turn && 'border-primary ring-4 ring-primary motion-safe:animate-turn-pulse',
          (chosen || lit) && 'border-primary ring-4 ring-sun',
          mine && !turn && 'border-primary/50',
          away && 'opacity-40',
        )}
      >
        <Emoji emoji={player?.avatar ?? '🙂'} className={small ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} />
        {votes !== null && votes > 0 && (
          <span
            className="absolute -top-1.5 -right-2 rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background tabular-nums motion-safe:animate-pop motion-safe:[animation-delay:var(--d)]"
            style={{ '--d': `${voteDelay}ms` } as CSSProperties}
          >
            {votes}
          </span>
        )}
        {/* Stämpeln ligger på figuren, aldrig på namnet eller utanför bordet. */}
        {stamp !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            style={{ '--d': `${stamp}ms` } as CSSProperties}
          >
            <Stamp className="border-2 bg-card/90 px-1 py-0 text-[9px] tracking-normal motion-safe:[animation-delay:var(--d)] sm:text-[11px]">Imposter</Stamp>
          </span>
        )}
      </span>
      <span className={cn('relative max-w-20 truncate rounded-full bg-room/85 px-1 font-bold sm:max-w-28', small ? 'text-[13px] leading-tight sm:text-sm' : 'text-sm sm:text-base', mine && 'text-primary-button')}>
        {mine ? 'Du' : name}
      </span>
      {away && <span className="text-[11px] text-muted-foreground">borta</span>}
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
    // Figuren står mitt på platsen, och namnet under den.
    'absolute flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
    small ? '-mt-[1.375rem] sm:-mt-7' : '-mt-7 sm:-mt-8',
    dim && 'opacity-50',
    stamp !== null && 'z-30',
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
  const canPoint = table.step === 'diskussion' && table.order.includes(meId) && !table.accusation
  const canAccuseHere = canAccuse(table, meId)
  const pointing = table.pointers[meId] === seatId
  if (!canThrow && !canPoint && !canAccuseHere) {
    return (
      <div className={className} style={style} aria-label={name}>
        {children}
      </div>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={className} style={style} aria-label={`${name}: ${canAccuseHere ? 'anklaga, ' : ''}${canPoint ? 'peka ut, ' : ''}kasta något`}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3" side="top">
        <p className="text-center font-heading font-bold">{name}</p>
        {canAccuseHere && (
          <button
            type="button"
            className="mt-1 mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-button px-3 font-heading font-bold text-primary-foreground shadow-soft-sm"
            onClick={() => {
              onMove({ type: 'accuse', target: seatId })
              setOpen(false)
            }}
          >
            Anklaga!
          </button>
        )}
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
