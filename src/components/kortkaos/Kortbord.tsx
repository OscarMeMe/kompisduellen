import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Kortkaos spelbord: en mörk, petroleumgrön yta med en ljusare kant, sajtens prickmönster och lite mörkare hörn.
// Texten direkt på bordet är ljus (text-background). Ljusa ytor på bordet (svarskort, rutor) sätter själva
// text-foreground. På dator fyller bordet skärmens höjd, så att frågekortet hamnar i mitten och handen längst ner.
export function Kortbord({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      aria-label="Spelbordet"
      className={cn(
        'relative flex flex-col gap-4 rounded-3xl border-4 border-kortbord-kant bg-kortbord p-4 text-background shadow-soft sm:gap-5 sm:p-6',
        'bg-[radial-gradient(color-mix(in_oklab,var(--background)_10%,transparent)_1px,transparent_1px),radial-gradient(ellipse_at_50%_40%,transparent_45%,color-mix(in_oklab,black_28%,transparent))] [background-size:22px_22px,100%_100%]',
        'lg:min-h-[calc(100svh-11rem)] lg:gap-4 lg:px-6 lg:py-5 lg:short:gap-3 lg:short:py-4',
        className,
      )}
    >
      {children}
    </section>
  )
}

// Allt under raden överst: fyller resten av bordets höjd på dator.
export function Middle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:gap-3', className)}>{children}</div>
}

// Frågekortet mitt på bordet.
export function Center({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('lg:flex lg:flex-1 lg:items-center lg:justify-center', className)}>{children}</div>
}
