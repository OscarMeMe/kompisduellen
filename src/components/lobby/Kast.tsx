import { useEffect, useId, useState, type ReactNode } from 'react'
import { Emoji } from '@/components/Emoji'
import { useThrows } from '@/hooks/useReactions'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { findThrowItem, hitText, THROW_ITEMS, throwCooldownSeconds, type ThrowItemId } from '@/lib/kast'
import { cn } from '@/lib/utils'

// En spelare i en spelarlista. Går det att kasta på spelaren blir den en knapp som öppnar kastmenyn, annars visas
// den som vanligt. className är chipets utseende i listan.
export function ThrowTarget({
  player,
  className,
  children,
}: {
  player: { id: string; name: string }
  className?: string
  children: ReactNode
}) {
  const throws = useThrows()
  const [open, setOpen] = useState(false)
  if (!throws?.allowed || !throws.targets.includes(player.id)) return <span className={className}>{children}</span>

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Kasta något på ${player.name}`}
          className={cn(
            className,
            'cursor-pointer transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3">
        <ThrowMenu
          name={player.name}
          lastThrowAt={throws.lastThrowAt}
          onThrow={(item) => {
            throws.throwAt(player.id, item)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function ThrowMenu({
  name,
  lastThrowAt,
  onThrow,
}: {
  name: string
  lastThrowAt: number | null
  onThrow: (item: ThrowItemId) => void
}) {
  // Räknar ner spärren medan menyn är öppen.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])
  const wait = throwCooldownSeconds(lastThrowAt, now)

  return (
    <div className="space-y-2">
      <p className="text-center font-heading font-bold">Kasta på {name}</p>
      <div role="group" aria-label={`Kasta på ${name}`} className="grid grid-cols-4 gap-2">
        {THROW_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            className="h-16 w-16 flex-col gap-0.5 px-0 text-xs"
            disabled={wait > 0}
            onClick={() => onThrow(item.id)}
          >
            <Emoji emoji={item.emoji} className="text-3xl" />
            {item.label}
          </Button>
        ))}
      </div>
      <p className="min-h-5 text-center text-sm text-muted-foreground">
        {wait > 0 ? `Du kan kasta igen om ${wait} s` : 'Du kan kasta en gång per 10 sekunder.'}
      </p>
    </div>
  )
}

// Det som splattar mot mig: saken flyger in och splattar i övre delen av skärmen, med "Oscar kastade en tomat på
// dig!". Borta efter 1,5 sekunder. Täcker aldrig svarsdelen, Lås svaret eller kort man ska välja, och tar inga tryck.
// Platsen räknades ut när kastet kom in (measureSplatPlace i splatt.ts).
export function SplatOverlay() {
  const splat = useThrows()?.splat
  const item = splat && findThrowItem(splat.item)
  if (!splat || !item) return null
  const band = splat.place
  const emojiSize = band.size * 0.42

  return (
    <div
      key={splat.key}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center motion-safe:animate-splat-life motion-reduce:animate-splat-fade"
      style={{ top: band.top, height: band.size }}
    >
      <div className="flex h-full flex-col items-center justify-between" style={{ width: band.size }}>
        <div className="relative flex flex-1 items-center justify-center self-stretch">
          {/* Fläcken i sakens färg, och några stänk runt om. */}
          <div className="absolute inset-[12%] motion-safe:animate-splat-blob">
            <div
              className={cn(
                'absolute inset-0 rounded-[46%_54%_42%_58%/52%_44%_56%_48%] border shadow-soft-sm',
                item.splat,
              )}
            />
            {item.yolk && <div className="absolute inset-[34%] rounded-full bg-sun" />}
            <div className={cn('absolute -top-[6%] left-[8%] size-[14%] rounded-full', item.splat)} />
            <div className={cn('absolute right-[2%] -bottom-[4%] size-[11%] rounded-full', item.splat)} />
            <div className={cn('absolute top-[18%] -right-[8%] size-[9%] rounded-full', item.splat)} />
          </div>
          <span className="relative leading-none motion-safe:animate-throw-in" style={{ fontSize: emojiSize }}>
            <Emoji emoji={item.emoji} />
          </span>
        </div>
        <p className="max-w-[90vw] rounded-full border bg-card px-3 py-1 text-center text-sm font-bold whitespace-nowrap shadow-soft sm:text-base">
          {hitText(splat.from, item)}
        </p>
      </div>
    </div>
  )
}

// Mitt val att ta emot kast. Den som stängt av syns inte som mål för de andra.
export function AcceptThrowsChoice() {
  const throws = useThrows()
  if (!throws) return null
  return <AcceptThrowsToggle on={throws.acceptsThrows} onChange={throws.setAcceptsThrows} />
}

// Rubriken och en liten växlare med På och Av sida vid sida, på samma rad när det får plats. Används i väntrummet
// och på profilsidan.
export function AcceptThrowsToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const labelId = useId()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <p id={labelId} className="font-bold">
        Ta emot kast
      </p>
      <div role="group" aria-labelledby={labelId} className="flex rounded-full bg-muted p-1">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={on === value}
            onClick={() => onChange(value)}
            className={cn(
              'h-9 min-w-14 rounded-full px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              on === value ? 'bg-card text-foreground shadow-soft-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value ? 'På' : 'Av'}
          </button>
        ))}
      </div>
    </div>
  )
}
