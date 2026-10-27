import type { ReactNode } from 'react'
import { useCountdown } from '@/hooks/useCountdown'
import { guessSecondsFor, type GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">{children}</div>
}

export function Wide({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-6">{children}</div>
}

export function RoundBadge({ state }: { state: GameState }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="inline-flex rounded-full bg-sky-soft px-4 py-1.5 font-heading text-sm font-bold">
        Runda {state.round} av {state.rounds}
      </span>
      {state.practice && <PracticeChip />}
    </div>
  )
}

// Visas under en provomgång med en spelare, som inte räknas i topplistan.
function PracticeChip() {
  return <span className="rounded-full bg-lilac px-2.5 py-0.5 font-sans text-xs font-semibold">Testläge</span>
}

// Runda och en tunn stapel som krymper med tiden medan man gissar. Sekunderna står i statusraden
// under gissningsrutan. Ligger fast högst upp, så att tiden syns även när man scrollar.
// totalSeconds = stegets hela tid, om den inte är svarstiden (t.ex. i kortspelen).
export function RoundTimer({
  state,
  clockOffset,
  totalSeconds,
}: {
  state: GameState
  clockOffset: number
  totalSeconds?: number
}) {
  const { progress, urgent } = useCountdown(state.deadline, clockOffset, totalSeconds ?? guessSecondsFor(state))

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <p className="flex items-center justify-center gap-2 font-heading text-sm font-bold tabular-nums">
        Runda {state.round}/{state.rounds}
        {state.practice && <PracticeChip />}
      </p>
      {state.deadline !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          {/* Korallröd de sista fem sekunderna */}
          <div
            className={cn(
              'h-full rounded-full transition-[width,background-color] duration-200 ease-linear',
              urgent ? 'bg-primary' : 'bg-mint',
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
