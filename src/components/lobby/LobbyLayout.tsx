import type { ReactNode } from 'react'
import { useCountdown } from '@/hooks/useCountdown'
import { guessSecondsFor, type GameState } from '@/lib/match'
import type { TimeWarning } from '@/lib/tidvarning'
import { cn } from '@/lib/utils'
import { SPLAT_CEILING } from '@/lib/splatt'

export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">{children}</div>
}

export function Wide({ children, tight = false }: { children: ReactNode; tight?: boolean }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-6 sm:short:gap-4 sm:short:pt-2', tight && 'max-sm:gap-1.5 max-sm:pt-0 sm:gap-3 sm:pt-2')}>
      {children}
    </div>
  )
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
// warning (från useTimeWarning): stapeln blir solgul vid varning och röd när det är kritiskt.
export function RoundTimer({
  state,
  clockOffset,
  totalSeconds,
  warning = 'normal',
  label = 'Runda',
  keepBarSpace = false,
}: {
  state: GameState
  clockOffset: number
  totalSeconds?: number
  warning?: TimeWarning
  // Vad en runda heter i spelet, t.ex. "Omgång" i Imposterjakten.
  label?: string
  // Samma höjd med och utan tidsstapel, så att det under inte hoppar när en nedräkning börjar eller slutar.
  keepBarSpace?: boolean
}) {
  const { progress } = useCountdown(state.deadline, clockOffset, totalSeconds ?? guessSecondsFor(state))

  return (
    <div
      {...SPLAT_CEILING}
      className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
    >
      <p className="flex items-center justify-center gap-2 font-heading text-sm font-bold tabular-nums">
        {label} {state.round}/{state.rounds}
        {state.practice && <PracticeChip />}
      </p>
      {state.deadline === null && keepBarSpace && <div aria-hidden className="mt-1.5 h-1.5" />}
      {state.deadline !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-[width,background-color] duration-200 ease-linear',
              warning === 'kritisk' ? 'bg-destructive' : warning === 'varning' ? 'bg-sun' : 'bg-mint',
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
