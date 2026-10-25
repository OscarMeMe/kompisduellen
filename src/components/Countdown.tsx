import type { ReactNode } from 'react'
import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/lib/utils'

type CountdownProps = {
  // Deadline enligt värdens klocka.
  deadline: number
  // Min klocka minus värdens klocka.
  clockOffset: number
  totalSeconds: number
  // Texten till vänster om sekunderna.
  label?: ReactNode
  className?: string
}

export function Countdown({ deadline, clockOffset, totalSeconds, label = 'Tid kvar', className }: CountdownProps) {
  const { secondsLeft, progress, urgent } = useCountdown(deadline, clockOffset, totalSeconds)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn('font-heading text-2xl font-bold tabular-nums', urgent && 'text-primary')}>{secondsLeft} s</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            urgent ? 'bg-primary' : 'bg-mint',
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
