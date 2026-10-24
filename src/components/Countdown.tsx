import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type CountdownProps = {
  // Deadline enligt värdens klocka.
  deadline: number
  // Min klocka minus värdens klocka.
  clockOffset: number
  totalSeconds: number
  className?: string
}

export function Countdown({ deadline, clockOffset, totalSeconds, className }: CountdownProps) {
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
        <span className="text-sm font-medium text-muted-foreground">Tid kvar</span>
        <span className={cn('text-2xl font-black tabular-nums', urgent && 'text-pink-600')}>{secondsLeft} s</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-violet-100">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            urgent ? 'bg-pink-500' : 'bg-gradient-to-r from-violet-500 to-pink-500',
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
