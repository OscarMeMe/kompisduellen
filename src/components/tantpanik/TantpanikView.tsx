import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { Wide } from '@/components/lobby/LobbyLayout'
import type { TantViewProps } from '@/components/lobby/types'
import { TantHand } from '@/components/tantpanik/TantHand'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import type { GameState } from '@/lib/match'
import type { TantMove, TantTable } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES, NOPE_SECONDS, cardName, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Exploderande Tanter: hela matchen i en vy. Överst vad jag ska göra just nu, sedan bordet (spelarna, högen och slänghögen),
// det som väntar på Nä du!, steget som pågår, min hand och vad som hänt. Prispallen efteråt är gemensam för alla spel.
export function TantpanikView({ state, me, clockOffset, tantView, onMove }: TantViewProps) {
  const table = state.tantpanik
  if (!table) return null
  const inMatch = table.order.includes(me.id)
  const out = table.out.includes(me.id)
  const name = (id: string) => state.players[id]?.name ?? 'Någon'

  return (
    <Wide>
      <Instruction state={state} table={table} meId={me.id} />
      {tantView?.notice && (
        <p
          key={tantView.notice.n}
          role="status"
          className="rounded-md bg-sun-soft px-3 py-2 text-center text-sm font-semibold motion-safe:animate-pop"
        >
          {tantView.notice.text}
        </p>
      )}
      {table.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-3 text-center font-semibold text-destructive">
          {table.error}
        </p>
      )}

      <Players state={state} table={table} meId={me.id} />
      <Piles table={table} />

      {table.step === 'window' && table.pending && <NopeWindow state={state} table={table} meId={me.id} clockOffset={clockOffset} />}
      {tantView?.peek && table.step !== 'arrange' && <Peek cards={tantView.peek} />}
      {table.step === 'arrange' &&
        (tantView?.arrange ? (
          <Arrange key={tantView.arrange.join()} cards={tantView.arrange} onMove={onMove} />
        ) : (
          <Waiting text={`${name(table.current)} möblerar om högen…`} />
        ))}
      {table.step === 'place' &&
        (table.current === me.id ? (
          <Place deckCount={table.deckCount} onMove={onMove} />
        ) : (
          <Waiting text={`${name(table.current)} gömmer tanten någonstans i högen…`} />
        ))}
      {table.step === 'give' && table.favor && table.favor.from !== me.id && (
        <Waiting text={`${name(table.favor.from)} väljer ett kort att ge ${table.favor.to === me.id ? 'dig' : name(table.favor.to)}…`} />
      )}

      {inMatch && !out && tantView && (
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
      )}
      {!inMatch && <p className="rounded-md bg-muted px-3 py-3 text-center text-sm font-semibold">Du är med från nästa match.</p>}

      <Log table={table} />
      <CardList />
      {/* Plats för handen, som ligger fast längst ner på skärmen. */}
      {inMatch && !out && <div aria-hidden className="h-56 shrink-0" />}
    </Wide>
  )
}

// Den stora raden överst: vad jag ska göra just nu, och korallröd när det är något jag ska göra.
function Instruction({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const turns = table.turnsLeft > 1 ? ` (${table.turnsLeft} turer kvar)` : ''
  let text: string
  let mine = false
  if (table.out.includes(meId)) text = 'Du är ute. Följ resten av matchen.'
  else if (table.step === 'window') text = 'Ett kort spelades. Stoppa det med Nä du! eller vänta.'
  else if (table.step === 'give') {
    mine = table.favor?.from === meId
    text = mine ? `Ge ett kort till ${name(table.favor!.to)}.` : 'Väntar på en tjänst…'
  } else if (table.current === meId) {
    mine = true
    text =
      table.step === 'place' ? 'Göm tanten i högen!' : table.step === 'arrange' ? 'Lägg korten i den ordning du vill.' : `Din tur!${turns}`
  } else text = `${name(table.current)} har turen${turns}`
  return (
    <p
      role="status"
      className={cn(
        'rounded-lg px-4 py-3 text-center font-heading text-xl font-bold',
        mine ? 'bg-primary-button text-primary-foreground' : 'bg-card shadow-soft-sm',
      )}
    >
      {text}
    </p>
  )
}

// Spelarna i turordning: figur, namn och antal kort. Den som har tur är markerad, och de som är ute är nedtonade.
function Players({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  return (
    <ul aria-label="Spelarna" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {table.order.map((id) => {
        const out = table.out.includes(id)
        const current = table.current === id && !out
        return (
          <li
            key={id}
            className={cn(
              'flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-soft-sm',
              current && 'border-primary ring-2 ring-primary',
              out && 'opacity-50',
            )}
          >
            <LobbyFigur playerId={id} avatar={state.players[id]?.avatar ?? ''} className="text-3xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {state.players[id]?.name}
                {id === meId && ' (du)'}
              </span>
              <span className="block text-xs text-muted-foreground">
                {out ? 'Ute' : `${table.handCounts[id] ?? 0} kort${current && table.turnsLeft > 1 ? ` · ${table.turnsLeft} turer` : ''}`}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// Draghögen med antal kort, och slänghögens översta kort.
function Piles({ table }: { table: TantTable }) {
  const top = table.discardTop.at(-1)
  return (
    <div className="flex items-center justify-center gap-6 rounded-lg bg-muted/60 py-4">
      <div className="flex flex-col items-center gap-1">
        <TantBaksida>{table.deckCount}</TantBaksida>
        <span className="text-sm font-semibold">Draghögen</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        {top ? <TantKort type={top} small /> : <div className="h-24 w-18 rounded-lg border-2 border-dashed border-border" />}
        <span className="text-sm font-semibold">Slänghögen ({table.discardCount})</span>
      </div>
    </div>
  )
}

// Ett spelat kort väntar: nedräkningen och hur kedjan av Nä du! står. Den som har ett Nä du! får en egen stor knapp
// vid handen (TantHand), så att det här ser likadant ut för alla och inte avslöjar vem som har ett.
function NopeWindow({ state, table, meId, clockOffset }: { state: GameState; table: TantTable; meId: string; clockOffset: number }) {
  const pending = table.pending!
  const { secondsLeft, progress } = useCountdown(state.deadline, clockOffset, NOPE_SECONDS)
  const stopped = pending.nopes % 2 === 1
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const what =
    pending.kind === 'pair'
      ? `ett par mot ${name(pending.target!)}`
      : pending.kind === 'triple'
        ? `ett tretal och ber ${name(pending.target!)} om ${cardName(pending.request!)}`
        : pending.target
          ? `${cardName(pending.cards[0])} på ${name(pending.target)}`
          : cardName(pending.cards[0])
  return (
    <section aria-label="Spelat kort" className="space-y-3 rounded-lg border-2 border-primary bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-8">
          {pending.cards.map((type, i) => (
            <TantKort key={i} type={type} small />
          ))}
        </div>
        <p className="font-semibold">
          {pending.by === meId ? 'Du' : name(pending.by)} spelade {what}.
        </p>
      </div>
      <p
        role="status"
        className={cn(
          'rounded-md px-3 py-2 text-center font-heading font-bold',
          stopped ? 'bg-destructive/10 text-destructive' : 'bg-mint-soft',
        )}
      >
        {pending.nopes === 0
          ? 'Händer om ingen säger Nä du!'
          : stopped
            ? `Stoppat av ${name(pending.lastNopeBy!)}!`
            : `${name(pending.lastNopeBy!)} stoppade stoppet. Kortet gäller igen!`}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-muted-foreground">{secondsLeft} s kvar</p>
    </section>
  )
}

// Tjuvkika: de översta korten, bara för mig. Överst först.
function Peek({ cards }: { cards: CardType[] }) {
  return (
    <section aria-label="Överst i högen" className="space-y-2 rounded-lg border bg-lilac/40 p-3">
      <p className="font-semibold">Överst i högen (bara du ser det):</p>
      {cards.length === 0 ? (
        <p className="text-sm">Högen är tom.</p>
      ) : (
        <ol className="flex gap-2">
          {cards.map((type, i) => (
            <li key={i} className="flex flex-col items-center gap-1 text-xs font-semibold">
              <TantKort type={type} small />
              {i === 0 ? 'Överst' : `${i + 1}`}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// Möblera om: flytta korten upp och ned med knappar och tryck Klar. Överst först.
function Arrange({ cards, onMove }: { cards: CardType[]; onMove: (move: TantMove) => void }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  function swap(a: number, b: number) {
    setOrder((list) => {
      const next = [...list]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }
  return (
    <section aria-label="Möblera om" className="space-y-3 rounded-lg border-2 border-primary bg-card p-4 shadow-soft">
      <p className="font-semibold">Ordna de översta korten. Det översta dras först.</p>
      <ol className="space-y-2">
        {order.map((index, position) => (
          <li key={index} className="flex items-center gap-3">
            <span className="w-14 text-sm font-semibold">{position === 0 ? 'Överst' : `${position + 1}`}</span>
            <TantKort type={cards[index]} small />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Flytta upp"
                disabled={position === 0}
                onClick={() => swap(position, position - 1)}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Flytta ned"
                disabled={position === order.length - 1}
                onClick={() => swap(position, position + 1)}
              >
                <ArrowDown aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button size="lg" className="w-full" onClick={() => onMove({ type: 'tArrange', order })}>
        Klar
      </Button>
    </section>
  )
}

// Göm tanten: hur många kort som ska ligga ovanför den. 0 = överst, högens storlek = underst. Ingen annan ser valet.
function Place({ deckCount, onMove }: { deckCount: number; onMove: (move: TantMove) => void }) {
  const [position, setPosition] = useState(() => Math.floor(deckCount / 2))
  const label = position === 0 ? 'Överst' : position === deckCount ? 'Underst' : `under ${position} kort`
  return (
    <section aria-label="Göm tanten" className="space-y-3 rounded-lg border-2 border-primary bg-card p-4 shadow-soft">
      <p className="font-semibold">Fikapausen räddade dig! Var vill du gömma tanten? Ingen annan ser vad du väljer.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setPosition(0)}>
          Överst
        </Button>
        <Button variant="outline" onClick={() => setPosition(Math.floor(deckCount / 2))}>
          I mitten
        </Button>
        <Button variant="outline" onClick={() => setPosition(deckCount)}>
          Underst
        </Button>
        <Button variant="outline" onClick={() => setPosition(Math.floor(Math.random() * (deckCount + 1)))}>
          Slumpa
        </Button>
      </div>
      {deckCount > 0 && (
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Kort ovanför tanten: {position}</span>
          <input
            type="range"
            min={0}
            max={deckCount}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="h-11 w-full accent-primary"
          />
        </label>
      )}
      <Button size="lg" className="w-full" onClick={() => onMove({ type: 'tPlace', position })}>
        Göm tanten: {label}
      </Button>
    </section>
  )
}

function Waiting({ text }: { text: string }) {
  return <p className="rounded-md bg-coral-soft px-3 py-3 text-center font-semibold">{text}</p>
}

// Det senaste som hänt, nyast överst. Skärmläsare får nya rader upplästa.
function Log({ table }: { table: TantTable }) {
  return (
    <section aria-label="Det senaste" className="space-y-2 rounded-lg border bg-card p-4 shadow-soft-sm">
      <h2 className="text-lg">Det senaste</h2>
      <ol aria-live="polite" className="space-y-1 text-sm">
        {[...table.log]
          .reverse()
          .slice(0, 6)
          .map((event, i) => (
            <li key={event.n} className={cn(i === 0 ? 'font-semibold' : 'text-muted-foreground')}>
              {event.text}
            </li>
          ))}
      </ol>
    </section>
  )
}

// Alla kort och vad de gör, hopfällt.
function CardList() {
  return (
    <details className="rounded-lg border bg-card px-4 text-sm shadow-soft-sm">
      <summary className="-mx-4 cursor-pointer px-4 py-3 font-semibold">Korten och reglerna</summary>
      <ul className="space-y-2 pb-3">
        {CARD_TYPES.map((type) => (
          <li key={type} className="flex gap-2">
            <span aria-hidden className="w-6 shrink-0 text-center">
              {CARDS[type].symbol}
            </span>
            <span>
              <span className="font-bold">{CARDS[type].name}:</span> {CARDS[type].text}
            </span>
          </li>
        ))}
        <li className="pt-1 text-muted-foreground">
          Två kort med samma namn tar ett slumpat kort från någon. Tre lika låter dig be om ett visst kort. En Vild tant kan ersätta en tant
          i paret eller tretalet. Sist kvar vinner.
        </li>
      </ul>
    </details>
  )
}
