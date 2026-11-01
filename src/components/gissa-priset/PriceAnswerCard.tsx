import { Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { CountingPrice } from '@/components/CountingPrice'
import { CreditText } from '@/components/gissa-priset/ImageCredit'
import { formatSek } from '@/lib/belopp'
import type { PriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

// Svaret i Gissa priset: saken, rätt pris och (via children) hur det gick. Används i spelet och på /granska.
// Priset visas exakt, med ören (target används bara om saken saknas). revealed = false ger ett suddigt pris.
export function PriceAnswerCard({
  item,
  target,
  revealed,
  countUp = false,
  children,
}: {
  item: PriceItem | undefined
  target: number
  revealed: boolean
  // Priset räknas upp när det visas (i spelet). På /granska står det direkt.
  countUp?: boolean
  children?: ReactNode
}) {
  const price = item?.priceSek ?? target
  return (
    <div className="relative rounded-lg border bg-card p-4 text-center shadow-soft sm:p-8">
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
        {revealed && countUp ? <CountingPrice target={price} /> : formatSek(price)}
      </p>
      {children}
      {/* Fotografens kredit i facit, så att namnet syns minst en gång per fråga. */}
      {item?.image && item.imageCredit && (
        <p className="mt-3 text-xs text-muted-foreground">
          <CreditText item={item} />
        </p>
      )}
    </div>
  )
}

// Bakgrunden till priset, som visas efter svaret.
// Faktatexten om saken, som en egen ruta som sticker ut från resultatlistan.
export function PriceFact({ item }: { item: PriceItem }) {
  return (
    <aside className="flex items-start gap-3 rounded-lg border bg-sky-soft p-4 shadow-soft-sm animate-pop sm:gap-4 sm:p-5">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-sky shadow-soft-sm sm:size-12">
        <Lightbulb className="size-5 sm:size-6" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-heading text-lg leading-tight font-bold">Visste du?</p>
        <p className="leading-snug sm:text-lg">{item.fact}</p>
      </div>
    </aside>
  )
}
