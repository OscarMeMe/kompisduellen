import type { ReactNode } from 'react'
import type { GameState } from '@/lib/match'

export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">{children}</div>
}

export function Wide({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-6">{children}</div>
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
