import { useEffect, useState, type ReactNode } from 'react'
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
  const localDeadline = deadline + clockOffset
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(timer)
  }, [])

  const msLeft = Math.max(0, localDeadline - now)
  const secondsLeft = Math.ceil(msLeft / 1000)
  const progress = Math.min(1, msLeft / (totalSeconds * 1000))
  const urgent = secondsLeft <= 5

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
