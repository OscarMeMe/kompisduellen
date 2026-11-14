import { useState, type CSSProperties, type ReactNode } from 'react'
import { Crosshair, Pointer, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { MoodFigur } from '@/components/figurer/MoodFigur'
import { seatMood } from '@/lib/figurer'
import { Stamp } from '@/components/Stamp'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReactions, useThrows } from '@/hooks/useReactions'
import { useThrowWait } from '@/hooks/useThrowWait'
import { clueLabels, clueLine, curvedArrow, noWordsAtSeatsOnMobile, pointingHand, seatLayout, smallSeats, type Seat } from '@/lib/bord'
import { canAccuse, currentTurn, tallyVotes, type Clue, type ImposterMove, type ImposterTable } from '@/lib/imposterjakten'
import { THROW_ITEMS } from '@/lib/kast'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Imposterjakten vid bordet (stilen Nattspanarna): spelarna sitter på stolar i en ring runt ett runt bord under en lampa,
// sett ovanifrån, i turordning. Jag sitter längst ner, med en större figur. Lampan hänger utanför bild: det varma skenet
// ligger över bordet, ljuset faller på den som har tur, och i facit släcks det och tänds på impostern. Spelarens ord står
// som lappar under namnet (på mobil bara det senaste, de äldre finns i listan Allas ord), så att texten mitt på bordet
// aldrig skyms. Under diskussionen syns händerna från Peka ut. När rösterna avslöjas ritas de som pilar en i taget, som
// tonas bort, och kvar vid varje spelare står små figurer för dem som röstade på den, med antalet. Bordet fyller den
// plats det får. Det är dolt för skärmläsare, som får samma information i en lista.

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
// Så många små figurer visas vid den som fick rösterna. Antalet står alltid bredvid.
const MAX_VOTER_FIGURES = 5

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
  // De som lyfts fram medan de andra dämpas: den anklagade, de lika placerade och impostern som gissar. I facit dämpas
  // ingen, så att rösterna vid varje spelare syns. Där pekar ljuset och stämpeln ut impostern.
  const highlighted = table.accusation ? [table.accusation.accused] : table.tied && table.step === 'diskussion' ? table.tied : table.caught && table.step === 'gissning' ? [table.caught] : []
  const revealing = shownVotes !== null && shownVotes !== undefined
  const votesDrawnMs = voteArrows.length * VOTE_STEP_MS
  // Avslöjandet: ljuset släcks, tänds på impostern, och sedan kommer stämpeln. Inte när omgången avbröts.
  const revealImposter = outcome && outcome.kind !== 'avbruten' ? outcome.imposter : null
  const stampDelay = votesDrawnMs + STAMP_PAUSE_MS + (revealImposter ? LIGHTS_OUT_MS : 0)
  const inset = small ? 10 : 13
  // Ljuset faller på den som har tur, och vid avslöjandet på impostern.
  const lit = revealImposter ? byId[revealImposter] : turn ? byId[turn] : undefined

  return (
    <div className="relative h-full min-h-0">
      {/* Lampans sken över bordet. Själva lampan hänger utanför bild. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 bottom-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_44%,color-mix(in_oklch,var(--natt-lampa)_26%,transparent),color-mix(in_oklch,var(--natt-lampa)_9%,transparent)_52%,transparent_74%)]"
      />
      {/* Ljuset släcks kort. Impostern och ljuskäglan ligger ovanpå. */}
      {revealImposter && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[#04090d] opacity-0 motion-safe:animate-lights-out motion-safe:[animation-delay:var(--d)]"
          style={{ '--d': `${votesDrawnMs}ms` } as CSSProperties}
        />
      )}
      {/* Platsernas ruta: ringen fyller platsen som finns, men är aldrig mycket bredare eller högre än den andra ledden, så
          att spelarna sitter tätt runt bordet i alla fönster. Luft överst för reaktioner och rösterna ovanför figurerna,
          och nederst för namnen och lapparna. Platserna ligger i procent av rutan, så de följer med när den ändras. */}
      <div className={cn('absolute inset-x-3 [container-type:size] sm:inset-x-1', small ? 'top-9 bottom-16 sm:top-12 sm:bottom-12' : 'top-10 bottom-16 sm:top-12 sm:bottom-14')}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 [container-type:inline-size]"
        style={{ width: 'min(100cqw, 46rem, 150cqh)', height: 'min(100cqh, 100cqw, 36rem)' }}
      >
        {/* Bordet: en ljus skiva med träkant, under lampans sken. Det som händer står mitt på det, och inget annat ligger där. */}
        <div
          aria-hidden
          data-yta="papper"
          className={cn(
            'absolute flex flex-col items-center justify-center overflow-hidden rounded-[50%] border-wood-edge bg-[radial-gradient(ellipse_at_50%_36%,#fff3d2_0%,#f1dcae_48%,#d9bd86_100%)] px-[9%] text-center text-foreground shadow-[0_0_0_3px_var(--chair),0_14px_30px_rgb(0_0_0/0.5)] [container-type:inline-size]',
            small ? 'inset-x-[26%] inset-y-[27%] border-4 sm:border-[6px]' : 'inset-x-[23%] inset-y-[25%] border-[5px] sm:border-[7px]',
          )}
        >
          {center}
        </div>

        <TurnLight target={lit} small={small} spotDelay={revealImposter ? votesDrawnMs + SPOT_AFTER_MS : null} />

        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            <marker id="pil-rost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className="fill-primary" />
            </marker>
          </defs>
          {pointers.map(([from, to]) => (
            <path
              key={`${from}-${to}`}
              d={curvedArrow(byId[from], byId[to], inset)}
              fill="none"
              strokeDasharray="1.2 1.6"
              className="stroke-destructive/70"
              strokeWidth={0.5}
            />
          ))}
          {/* Rösterna ritas som pilar en i taget och tonas sedan bort. Kvar står figurerna vid den som fick rösterna.
              Med "minska rörelse" visas inga pilar, bara figurerna. */}
          {voteArrows.map(([from, to], i) => (
            <path
              key={`${from}-${to}-${table.step}`}
              d={curvedArrow(byId[from], byId[to], inset)}
              fill="none"
              pathLength={1}
              strokeDasharray="1"
              markerEnd="url(#pil-rost)"
              className="stroke-primary opacity-0 motion-safe:animate-arrow-flash motion-safe:[animation-delay:var(--d)]"
              style={{ '--d': `${i * VOTE_STEP_MS}ms` } as CSSProperties}
              strokeWidth={0.8}
            />
          ))}
        </svg>

        {/* Peka ut: en hand vid den som pekar, riktad mot den som pekas ut. Den prickiga linjen visar hela vägen. */}
        {pointers.map(([from, to]) => {
          const hand = pointingHand(byId[from], byId[to], small ? 12 : 15)
          return (
            <span
              key={`${from}-${to}`}
              aria-hidden
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-pop"
              style={{ left: `${hand.x}%`, top: `${hand.y}%` }}
            >
              <Pointer
                className={cn('rounded-full bg-[var(--natt-kram)] fill-[var(--natt-lampa)] p-0.5 text-[var(--natt)] shadow-soft-sm', small ? 'size-6' : 'size-8')}
                strokeWidth={2.2}
                style={{ rotate: `${hand.degrees}deg` }}
              />
            </span>
          )
        })}

        {/* Orden som lappar under namnet på varje plats. */}
        {seats.flatMap((seat) =>
          // Nederst står lapparna till höger om figuren på bred skärm, så att platsen sitter nära bordet. På mobil står den
          // enda lappen under namnet, där den inte krockar med grannens.
          (seat.y > 85 ? (['beside', 'under'] as const) : ([seat.y < 15 ? 'beside' : 'under'] as const)).map((place) => (
          <SeatWords
            key={`${seat.id}-${place}`}
            seat={seat}
            place={place}
            only={seat.y > 85 ? (place === 'beside' ? 'max-sm:hidden' : 'sm:hidden') : ''}
            clues={table.clues.filter((clue) => clue.player === seat.id)}
            small={small}
            mine={seat.id === meId}
            outward={seats.length === 5}
            // Med 9 och 10 spelare sitter de för tätt på mobil för lappar vid platserna. Orden står i listan Allas ord.
            // I facit på mobil är bordet litet, så där visas inga lappar med många spelare eller på låga telefoner.
            hide={cn(noWordsAtSeatsOnMobile(seats.length) && 'max-sm:hidden', outcome && (small ? 'max-sm:hidden' : 'max-sm:tiny:hidden'))}
          />
          )),
        )}

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
            voters={revealing ? voteArrows.map(([from, to], i) => ({ from, to, delay: (i + 1) * VOTE_STEP_MS })).filter((one) => one.to === seat.id) : null}
            votes={revealing ? (counts[seat.id] ?? 0) : 0}
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

// Ljuset på den som har tur. Det glider över när turen byts och pulserar svagt så länge turen varar. Med "minska
// rörelse" hoppar det direkt och står still.
function TurnLight({ target, small, spotDelay }: { target: { x: number; y: number } | undefined; small: boolean; spotDelay: number | null }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--natt-lampa)_80%,transparent)_18%,color-mix(in_oklch,var(--natt-lampa)_28%,transparent)_48%,transparent_70%)] motion-safe:transition-[left,top,opacity] motion-safe:duration-500',
        // Vid avslöjandet en tydligare fläck på impostern.
        spotDelay !== null ? 'size-32 sm:size-48' : small ? 'size-28 sm:size-44' : 'size-40 sm:size-60',
        !target && 'opacity-0',
        target && spotDelay === null && 'motion-safe:animate-light-pulse',
        spotDelay !== null && 'z-[25] motion-safe:animate-spot-in motion-safe:[animation-delay:var(--d)]',
      )}
      style={{ left: `${target?.x ?? 50}%`, top: `${target?.y ?? 50}%`, '--d': `${spotDelay ?? 0}ms` } as CSSProperties}
    />
  )
}

// Figurens storlek på en plats: --fig är den största storleken och --cap ett tak i procent av ringens bredd (cqw), så att
// figurerna krymper med ringen när den får lite plats (t.ex. facit med många spelare på en liten telefon). Min egen är
// större, och med många spelare är alla mindre. --n är namnets höjd. Lapparna använder samma mått (--f, halva figuren),
// så att de börjar där namnet slutar.
function seatVars(small: boolean, mine: boolean): string {
  if (small) return mine ? '[--fig:3.2rem] [--cap:14cqw] [--n:1.25rem] sm:[--fig:4.6rem] sm:[--n:1.5rem]' : '[--fig:2.5rem] [--cap:11cqw] [--n:1.2rem] sm:[--fig:3.8rem] sm:[--n:1.5rem]'
  return mine
    ? '[--fig:4.5rem] [--cap:19cqw] [--n:1.4rem] sm:[--fig:6rem] sm:[--n:1.75rem] sm:short:[--fig:5rem]'
    : '[--fig:3.5rem] [--cap:15cqw] [--n:1.4rem] sm:[--fig:5.2rem] sm:[--n:1.75rem] sm:short:[--fig:4.2rem]'
}

// Spelarens ord som lappar centrerade under namnet, ett per rad och aldrig brutna. Det senaste är gult och tydligast. På
// mobil visas bara det senaste, och på dator högst tre (med många spelare bara det senaste). Alla ord finns i listan Allas
// ord. Längst upp finns ingen plats under namnet, för där står bordet, så där står lapparna bredvid figuren.
function SeatWords({ seat, clues, small, mine, outward, hide, place, only }: { seat: Seat; clues: Clue[]; small: boolean; mine: boolean; outward: boolean; hide: string; place: 'beside' | 'under'; only: string }) {
  const labels = clueLabels(clues)
  const shown = small ? labels.slice(-1) : labels
  if (shown.length === 0) return null
  // Bredvid figuren i stället för under namnet (överst i ringen, där bordet ligger under namnet, och nederst på bred skärm).
  const atTop = place === 'beside'
  // Centrerat under figuren. Vid sidorna flyttas lapparna inåt bara om ett långt ord annars skulle hamna utanför rutan
  // (cqw = procent av platsernas ruta).
  // Med 5 spelare står de övre platserna rakt ovanför bordet, så där går lapparna utåt från figuren i stället.
  const out = outward && seat.y < 35
  const shift = seat.x < 50 ? `max(${out ? '-100%' : '-50%'}, calc(${-seat.x}cqw))` : `min(${out ? '0%' : '-50%'}, calc(${100 - seat.x}cqw - 100%))`
  const style: CSSProperties = atTop
    ? { left: `calc(${seat.x}% + var(--f) + 0.25rem)`, top: `calc(${seat.y}% - var(--f))` }
    : { left: `${seat.x}%`, top: `calc(${seat.y}% + var(--f) + var(--n))`, translate: shift }
  return (
    <div aria-hidden data-ord className={cn('pointer-events-none absolute z-10 flex w-max flex-col gap-0.5', hide, only, seatVars(small, mine), '[--f:calc(min(var(--fig),var(--cap))/2)]', atTop ? 'items-start' : 'items-center')} style={style}>
      {shown.map((label, i) => {
        const latest = i === shown.length - 1
        return (
          <span
            key={`${label}-${i}`}
            className={cn(
              'max-w-28 truncate rounded-[5px] border px-2 py-px font-heading leading-snug whitespace-nowrap text-[var(--natt)] shadow-[0_2px_0_rgb(0_0_0/0.35)] motion-safe:animate-fade sm:max-w-44',
              latest
                ? 'border-[var(--natt)] bg-[var(--natt-lampa)] text-base font-bold sm:text-lg'
                : 'border-[color-mix(in_oklch,var(--natt)_45%,transparent)] bg-[#fffaf0] text-sm font-semibold opacity-90 max-sm:hidden sm:text-base',
              i % 2 === 0 ? '-rotate-1' : 'rotate-1',
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

// Allas ord som en lista: i svarsdelens kolumn på dator och bakom knappen Allas ord på mobil, där lapparna vid platserna
// bara visar det senaste ordet.
export function AllaOrd({ state, table, meId, className }: { state: GameState; table: ImposterTable; meId: string; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm sm:text-base', className)}>
      {table.order.map((id) => {
        const clues = table.clues.filter((clue) => clue.player === id)
        return (
          <div key={id} className="contents">
            <dt className="max-w-28 truncate font-bold">{id === meId ? 'Du' : (state.players[id]?.name ?? 'Någon')}</dt>
            <dd className={cn('min-w-0 break-words', clues.length === 0 && 'text-muted-foreground')}>{clues.length > 0 ? clueLine(clues) : 'inget än'}</dd>
          </div>
        )
      })}
    </dl>
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
  // De som röstade på spelaren, i den ordning rösterna avslöjas (delay i ms). null när inga röster visas.
  voters: { from: string; delay: number }[] | null
  votes: number
  // Fördröjningen innan IMPOSTER-stämpeln, eller null.
  stamp: number | null
  onMove: (move: ImposterMove) => void
  vote: BordProps['vote']
}

function SeatSpot({ seat, state, table, meId, small, away, turn, dim, lit, voters, votes, stamp, onMove, vote }: SeatProps) {
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
          'relative flex size-[1em] items-center justify-center rounded-full transition',
          turn && 'motion-safe:animate-turn-pulse',
          (chosen || lit) && 'ring-4 ring-destructive',
          away && 'opacity-40',
        )}
      >
        {/* Minen följer omgången (seatMood): misstänksam under diskussionen, svettig när man är anklagad och smälter när
            man är utröstad. Den byts bara när det redan är offentligt. */}
        <MoodFigur avatar={player?.avatar ?? '🙂'} mood={seatMood(table, seat.id)} className="drop-shadow-[0_3px_4px_rgb(0_0_0/0.5)]" />
        {/* De som röstade på spelaren: en liten figur per röst, en i taget, och antalet. */}
        {voters && voters.length > 0 && (
          <span
            className={cn(
              'absolute z-10 flex items-center gap-0.5 rounded-full border border-[var(--natt)] bg-[var(--natt-kram)] py-0.5 pr-1.5 pl-1 text-[var(--natt)] shadow-soft-sm',
              // Nära kanterna börjar raden vid figurens kant och går inåt, så att den aldrig sticker ut ur bild.
              // Överst i ringen finns ingen plats ovanför figuren, och lapparna står till höger, så där står rösterna till
              // vänster om figuren.
              seat.y < 12
                ? 'top-1/4 right-[calc(100%+0.2rem)]'
                : cn('bottom-[calc(100%-0.35rem)]', seat.x < 22 ? 'left-0' : seat.x > 78 ? 'right-0' : 'left-1/2 -translate-x-1/2'),
            )}
            aria-label={`${votes} ${votes === 1 ? 'röst' : 'röster'}`}
          >
            {/* Högst fem figurer. Är de fler står bara antalet för resten. */}
            {voters.slice(0, MAX_VOTER_FIGURES).map((voter) => (
              <span
                key={voter.from}
                className="flex text-lg leading-none motion-safe:animate-pop motion-safe:[animation-delay:var(--d)] sm:text-2xl"
                style={{ '--d': `${voter.delay}ms` } as CSSProperties}
              >
                <Emoji emoji={state.players[voter.from]?.avatar ?? '🙂'} />
              </span>
            ))}
            <span className="pl-0.5 font-heading text-sm font-bold tabular-nums sm:text-base">{votes}</span>
          </span>
        )}
        {/* Stämpeln ligger snett nedanför figuren, så att figuren syns: vid figurens nedre hörn, inåt mot bordet. Överst
            och nederst står lapparna till höger om figuren, så där går stämpeln åt vänster. */}
        {stamp !== null && (
          <span
            aria-hidden
            className={cn('pointer-events-none absolute top-[34%] z-10 flex w-max', seat.x < 45 && seat.y > 15 && seat.y < 85 ? 'left-[72%]' : 'right-[72%]')}
            style={{ '--d': `${stamp}ms` } as CSSProperties}
          >
            <Stamp className="border-[3px] bg-[color-mix(in_oklch,var(--natt)_85%,transparent)] px-1.5 py-0 text-xs tracking-wide motion-safe:[animation-delay:var(--d)] sm:border-4 sm:text-lg">Imposter</Stamp>
          </span>
        )}
      </span>
      <span
        className={cn(
          'relative max-w-24 truncate rounded-full border px-2 text-xs leading-snug font-bold sm:max-w-32 sm:text-sm',
          turn
            ? 'border-[var(--natt-lampa)] bg-[var(--natt-lampa)] text-[var(--natt)]'
            : mine
              ? 'border-[var(--natt-kram)] bg-[var(--natt-kram)] text-[var(--natt)]'
              : 'border-[color-mix(in_oklch,var(--natt-dim)_45%,transparent)] bg-[color-mix(in_oklch,var(--natt)_88%,transparent)] text-[var(--natt-kram)]',
        )}
      >
        {mine ? 'Du' : name}
      </span>
      {away && <span className="text-[11px] text-muted-foreground">borta</span>}
      {reaction && (
        <span
          key={reaction.key}
          className="pointer-events-none absolute -top-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--natt)] bg-[var(--natt-kram)] px-2 py-0.5 text-sm whitespace-nowrap text-[var(--natt)] shadow-soft motion-safe:animate-reaction motion-reduce:animate-reaction-fade"
        >
          <Emoji emoji={reaction.emoji} className="text-xl leading-none" />
          {reaction.target !== undefined && <span className="max-w-20 truncate text-xs font-semibold">→ {reaction.target}</span>}
        </span>
      )}
    </>
  )

  const position = cn(
    // Figuren står mitt på platsen (den är 1em hög, så halva höjden dras av), och namnet under den.
    'absolute -mt-[0.5em] flex -translate-x-1/2 flex-col items-center rounded-lg leading-none outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
    seatVars(small, mine),
    'text-[length:min(var(--fig),var(--cap))]',
    dim && 'opacity-45',
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
  const nameOf = (id: string) => (id === meId ? 'dig' : (state.players[id]?.name ?? 'någon'))
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
