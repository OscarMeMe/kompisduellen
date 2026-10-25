import type { ReactNode } from 'react'
import { Countdown } from '@/components/Countdown'
import type { GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'

export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">{children}</div>
}

export function Wide({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-4 sm:gap-6 sm:pt-6">{children}</div>
}

export function RoundBadge({ state }: { state: GameState }) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm">
        Runda {state.round} av {state.rounds}
      </span>
    </div>
  )
}

// Runda och nedräkning medan man gissar. Ligger fast högst upp, så att tiden syns även när man scrollar.
export function RoundTimer({ state, clockOffset }: { state: GameState; clockOffset: number }) {
  if (state.deadline === null) return <RoundBadge state={state} />
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <Countdown
        deadline={state.deadline}
        clockOffset={clockOffset}
        totalSeconds={rulesFor(state.game).guessSeconds}
        label={
          <span className="font-bold text-primary">
            Runda {state.round} av {state.rounds}
          </span>
        }
      />
    </div>
  )
}
