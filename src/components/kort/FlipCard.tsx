import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Ett kort som vänds från baksidan till framsidan en gång när det dyker upp (animate-flip). Används för korten som
// visas upp i Kortkaos, och kan användas av fler kortspel. delay = hur länge kortet ligger med baksidan upp (ms).
// back = egen baksida, annars ett mörkt kort med ett frågetecken. Med "minska rörelse" tonas framsidan bara in.
export function FlipCard({
  children,
  back,
  delay = 0,
  className,
}: {
  children: ReactNode
  back?: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={cn('h-full perspective-[1200px]', className)}>
      <div
        className="relative h-full transform-3d motion-safe:animate-flip motion-reduce:animate-fade"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="h-full backface-hidden">{children}</div>
        <div aria-hidden className="absolute inset-0 rotate-y-180 backface-hidden">
          {back ?? <CardBack />}
        </div>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border-2 border-foreground bg-foreground shadow-soft">
      <span className="font-heading text-5xl font-bold text-background/60">?</span>
    </div>
  )
}
