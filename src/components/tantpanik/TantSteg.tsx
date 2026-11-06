import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import type { GameState } from '@/lib/match'
import type { TantMove, TantTable } from '@/lib/tantpanik'
import { NOPE_SECONDS, cardName, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Stegen som visas i mitten av bordet, ovanpå högarna: ett spelat kort som väntar på Nope!, korten jag tittat på, Ändra
// framtiden, Göm tanten och väntan på någon annan.

const PANEL = 'rounded-lg border bg-card p-3 shadow-lift'

// Ett spelat kort väntar: nedräkningen och hur kedjan av Nope! står. Den som har ett Nope! får en egen stor knapp vid
// handen (TantHand), så att det här ser likadant ut för alla och inte avslöjar vem som har ett.
export function NopeWindow({ state, table, meId, clockOffset }: { state: GameState; table: TantTable; meId: string; clockOffset: number }) {
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
    <section aria-label="Spelat kort" className={cn(PANEL, 'space-y-2 border-2 border-primary motion-safe:animate-pop')}>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-10">
          {pending.cards.map((type, i) => (
            <TantKort key={i} type={type} size="small" />
          ))}
        </div>
        <p className="font-semibold">
          {pending.by === meId ? 'Du' : name(pending.by)} spelade {what}.
        </p>
      </div>
      <p
        role="status"
        className={cn(
          'rounded-md px-3 py-1.5 text-center font-heading font-bold',
          stopped ? 'bg-destructive/10 text-destructive' : 'bg-mint-soft',
        )}
      >
        {pending.nopes === 0
          ? 'Händer om ingen säger Nope!'
          : stopped
            ? `Stoppat av ${name(pending.lastNopeBy!)}!`
            : `${name(pending.lastNopeBy!)} stoppade stoppet. Kortet gäller igen!`}
      </p>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">{secondsLeft} s</span>
      </div>
    </section>
  )
}

// Se framtiden: de översta korten, bara för mig. Överst först.
export function Peek({ cards }: { cards: CardType[] }) {
  return (
    <section aria-label="Överst i högen" className={cn(PANEL, 'space-y-2 bg-lilac/40')}>
      <p className="text-sm font-semibold">Överst i högen (bara du ser det):</p>
      {cards.length === 0 ? (
        <p className="text-sm">Högen är tom.</p>
      ) : (
        <ol className="flex justify-center gap-2">
          {cards.map((type, i) => (
            <li key={i} className="flex flex-col items-center gap-1 text-xs font-semibold">
              <TantKort type={type} size="small" />
              {i === 0 ? 'Överst' : `${i + 1}`}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// Ändra framtiden: flytta korten upp och ned med knappar och tryck Klar. Överst först.
export function Arrange({ cards, onMove }: { cards: CardType[]; onMove: (move: TantMove) => void }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  function swap(a: number, b: number) {
    setOrder((list) => {
      const next = [...list]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }
  return (
    <section aria-label="Ändra framtiden" className={cn(PANEL, 'space-y-2 border-2 border-primary')}>
      <p className="text-sm font-semibold">Ordna de översta korten. Det översta dras först.</p>
      <ol className="flex justify-center gap-3">
        {order.map((index, position) => (
          <li key={index} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold">{position === 0 ? 'Överst' : `${position + 1}`}</span>
            <TantKort type={cards[index]} size="small" />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Flytta närmare toppen"
                disabled={position === 0}
                onClick={() => swap(position, position - 1)}
              >
                <ArrowLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Flytta längre från toppen"
                disabled={position === order.length - 1}
                onClick={() => swap(position, position + 1)}
              >
                <ArrowRight aria-hidden />
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
export function Place({ deckCount, onMove }: { deckCount: number; onMove: (move: TantMove) => void }) {
  const [position, setPosition] = useState(() => Math.floor(deckCount / 2))
  const label = position === 0 ? 'Överst' : position === deckCount ? 'Underst' : `under ${position} kort`
  return (
    <section aria-label="Göm tanten" className={cn(PANEL, 'space-y-2 border-2 border-primary')}>
      <p className="text-sm font-semibold">Desarmera räddade dig! Var vill du gömma tanten? Ingen annan ser vad du väljer.</p>
      <div className="grid grid-cols-4 gap-1.5">
        <Button variant="outline" onClick={() => setPosition(0)}>
          Överst
        </Button>
        <Button variant="outline" onClick={() => setPosition(Math.floor(deckCount / 2))}>
          Mitten
        </Button>
        <Button variant="outline" onClick={() => setPosition(deckCount)}>
          Underst
        </Button>
        <Button variant="outline" onClick={() => setPosition(Math.floor(Math.random() * (deckCount + 1)))}>
          Slumpa
        </Button>
      </div>
      {deckCount > 0 && (
        <label className="block">
          <span className="text-xs font-semibold">Kort ovanför tanten: {position}</span>
          <input
            type="range"
            min={0}
            max={deckCount}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="h-9 w-full accent-primary"
          />
        </label>
      )}
      <Button size="lg" className="w-full" onClick={() => onMove({ type: 'tPlace', position })}>
        Göm tanten: {label}
      </Button>
    </section>
  )
}

export function Waiting({ text }: { text: string }) {
  return <p className={cn(PANEL, 'bg-coral-soft text-center font-semibold')}>{text}</p>
}
