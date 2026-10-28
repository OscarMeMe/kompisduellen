import type { ReactNode } from 'react'
import { formatExactSek, formatSek } from '@/lib/belopp'
import type { PriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

// Svaret i Gissa priset: saken, rätt pris och (via children) hur det gick. Används i spelet och på /granska.
// target är priset som poängen räknas mot (hela kronor från en krona). revealed = false ger ett suddigt pris.
export function PriceAnswerCard({
  item,
  target,
  revealed,
  children,
}: {
  item: PriceItem | undefined
  target: number
  revealed: boolean
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center shadow-soft sm:p-8">
      <div className="flex items-center justify-center gap-3">
        {/* Emojin bara när saken saknar bild. Bredvid ett foto ser den malplacerad ut. */}
        {!item?.image && <span className="text-4xl sm:text-5xl">{item?.emoji ?? '🏷️'}</span>}
        <span className={cn('min-w-0', item?.image ? 'text-center' : 'text-left')}>
          <span className="block text-sm font-semibold text-balance sm:text-base">{item?.name}</span>
          {item && <span className="block text-xs font-semibold text-primary sm:text-sm">År {item.year}</span>}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-muted-foreground sm:mt-4">Rätt pris</p>
      <p
        className={cn(
          'font-heading text-5xl font-bold text-balance transition-all duration-500 sm:text-7xl',
          revealed ? 'text-primary' : 'scale-90 text-muted-foreground blur-md select-none',
        )}
      >
        {formatSek(target)}
      </p>
      {/* Poängen räknas mot priset i hela kronor, men det exakta priset står under. */}
      {revealed && item && item.priceSek !== target && (
        <p className="text-sm font-semibold text-muted-foreground">exakt {formatExactSek(item.priceSek)}</p>
      )}
      {children}
    </div>
  )
}

// Bakgrunden till priset, som visas efter svaret.
export function PriceFact({ item }: { item: PriceItem }) {
  return (
    <p className="px-2 text-center text-xs text-muted-foreground animate-in fade-in sm:text-sm">{item.fact}</p>
  )
}
