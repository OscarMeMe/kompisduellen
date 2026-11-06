import { CARDS, cardImage, cardSrcSet, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Hur stort kortet visas. small: slänghögen, kort man tittat på. large: korten bredvid varandra (par och tretal).
// preview: kortet som visas förstorat medan man drar längs solfjädern.
// zoom: ett förstorat kort, där den stora bilden används och regeltexten ska gå att läsa på en telefon.
export type TantKortSize = 'small' | 'large' | 'preview' | 'zoom'

// Bredd och sizes (för srcset) per storlek. Höjden följer kortets format, 107 × 147.
const SIZES: Record<TantKortSize, { width: string; sizes: string }> = {
  small: { width: 'w-18', sizes: '72px' },
  large: { width: 'w-32 sm:w-36', sizes: '(min-width: 640px) 144px, 128px' },
  preview: { width: 'w-48', sizes: '192px' },
  zoom: { width: 'w-[min(72vw,300px)]', sizes: 'min(72vw, 300px)' },
}

// Ett kort i Exploderande Tanter. Har kortet en bild (tantpanik-kort.ts) visas den hel, med ram och text, och inget
// läggs ovanpå. Annars ett textkort med symbol, namn och regeltext på kortets färg.
export function TantKort({ type, size = 'large', className }: { type: CardType; size?: TantKortSize; className?: string }) {
  const card = CARDS[type]
  const { width, sizes } = SIZES[size]
  const srcSet = cardSrcSet(type)
  if (srcSet) {
    return (
      <img
        src={cardImage(type, 360)}
        srcSet={srcSet}
        sizes={sizes}
        alt={`${card.name}. ${card.text}`}
        draggable={false}
        // Hörnen är genomskinliga, så skuggan följer kortets form i stället för en fyrkant.
        className={cn('aspect-[107/147] shrink-0 object-contain drop-shadow-md select-none', width, className)}
      />
    )
  }
  const small = size === 'small'
  return (
    <div
      className={cn(
        'flex aspect-[107/147] shrink-0 flex-col rounded-lg border border-foreground/10 p-2.5 text-left shadow-soft-sm',
        card.color,
        width,
        small ? 'items-center justify-center gap-1 text-center' : 'gap-1.5',
        className,
      )}
    >
      <span aria-hidden className={cn('leading-none', small ? 'text-2xl' : 'text-3xl')}>
        {card.symbol}
      </span>
      <span className={cn('font-heading leading-tight font-bold', small ? 'text-[11px]' : size === 'zoom' ? 'text-xl' : 'text-sm')}>
        {card.name}
      </span>
      {!small && (
        <span className={cn('leading-snug opacity-85', size === 'zoom' ? 'text-base' : 'text-[11px] sm:text-xs')}>{card.text}</span>
      )}
    </div>
  )
}

// Baksidan: likadan för alla kort, så att den inte säger något om vilket kort det är.
export function TantBaksida({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex aspect-[107/147] w-18 shrink-0 items-center justify-center rounded-lg border-4 border-card bg-foreground font-heading text-lg font-bold text-card shadow-soft-sm',
        className,
      )}
    >
      {children ?? <span aria-hidden>?</span>}
    </div>
  )
}
