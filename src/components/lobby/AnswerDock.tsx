import type { ReactNode } from 'react'
import { GuessStatusLine } from '@/components/lobby/GuessStatusList'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import type { GameState } from '@/lib/match'

type AnswerDockProps = {
  state: GameState
  online: OnlinePlayer[]
  clockOffset: number
  meId: string
  locked: number | null
  children: ReactNode
}

// Svarsytan: statusraden (tid kvar och hur många som svarat) och inmatning med låsknapp tillsammans.
// På mobil ligger den fast i nederkant och lyfts ovanför tangentbordet, så att låsknappen alltid syns
// medan man skriver. På större skärmar är den ett vanligt kort i flödet.
export function AnswerDock({ state, online, clockOffset, meId, locked, children }: AnswerDockProps) {
  const keyboard = useKeyboardInset()

  return (
    <div
      className="sticky z-10 -mx-4 space-y-2 border-t bg-background/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      style={{ bottom: keyboard }}
    >
      <GuessStatusLine state={state} online={online} clockOffset={clockOffset} meId={meId} locked={locked} />
      <div className="rounded-lg border bg-card p-3 shadow-soft sm:p-8">{children}</div>
    </div>
  )
}
