import { CARDS, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Ett kort i Exploderande Tanter: symbol, namn och regeltext på kortets färg. Kortbilderna kommer senare.
// small = utan regeltext (slänghögen, kort man tittat på).
export function TantKort({ type, small = false, className }: { type: CardType; small?: boolean; className?: string }) {
  const card = CARDS[type]
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col rounded-lg border border-foreground/10 p-2.5 text-left shadow-soft-sm',
        card.color,
        small ? 'h-24 w-18 items-center justify-center gap-1 text-center' : 'h-44 w-32 gap-1.5 sm:h-48 sm:w-36',
        className,
      )}
    >
      <span aria-hidden className={cn('leading-none', small ? 'text-2xl' : 'text-3xl')}>
        {card.symbol}
      </span>
      <span className={cn('font-heading leading-tight font-bold', small ? 'text-[11px]' : 'text-sm')}>{card.name}</span>
      {!small && <span className="text-[11px] leading-snug opacity-85 sm:text-xs">{card.text}</span>}
    </div>
  )
}

// Baksidan: likadan för alla kort, så att den inte säger något om vilket kort det är.
export function TantBaksida({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-24 w-18 shrink-0 items-center justify-center rounded-lg border-4 border-card bg-foreground font-heading text-lg font-bold text-card shadow-soft-sm',
        className,
      )}
    >
      {children ?? <span aria-hidden>?</span>}
    </div>
  )
}
