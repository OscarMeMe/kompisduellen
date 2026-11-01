import { Info } from 'lucide-react'
import { useState, type PointerEvent } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

// Fotograf och licens, länkad till bildens sida när den finns.
export function CreditText({ item }: { item: PriceItem }) {
  if (!item.imageCredit) return null
  return item.imageSource ? (
    <a href={item.imageSource} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
      {item.imageCredit}
    </a>
  ) : (
    <>{item.imageCredit}</>
  )
}

// En liten ⓘ-knapp i bildens hörn. Krediten visas när man trycker på knappen eller håller musen över den. Licensen kräver
// att namnet finns tillgängligt, men det behöver inte synas hela tiden. className placerar knappen (t.ex. "bottom-2 left-2").
export function ImageCreditButton({ item, className }: { item: PriceItem; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!item.imageCredit) return null
  // Bara musen öppnar vid hover. På en pekskärm öppnar trycket, och hover skulle annars stänga direkt igen.
  const hover = (on: boolean) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setOpen(on)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Vem tog bilden?"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={cn(
          'absolute z-10 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-soft-sm outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/30',
          className,
        )}
      >
        <Info className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto max-w-72 text-xs text-muted-foreground"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <CreditText item={item} />
      </PopoverContent>
    </Popover>
  )
}
