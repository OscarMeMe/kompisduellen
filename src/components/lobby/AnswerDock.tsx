import type { ReactNode } from 'react'
import { GuessStatusLine } from '@/components/lobby/GuessStatusList'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import type { GameState } from '@/lib/match'
import type { TimeWarning } from '@/lib/tidvarning'

type AnswerDockProps = {
  state: GameState
  online: OnlinePlayer[]
  clockOffset: number
  meId: string
  locked: number | null
  warning?: TimeWarning
  children: ReactNode
}

// Svarsytan: statusraden (tid kvar och hur många som svarat) och inmatning med låsknapp tillsammans.
// Den ligger fast i nederkant (på mobil lyft ovanför tangentbordet), så att låsknappen alltid syns medan man
// skriver, även om frågan är lång eller skärmen låg. När allt får plats ligger den direkt under frågan.
export function AnswerDock({ state, online, clockOffset, meId, locked, warning, children }: AnswerDockProps) {
  const keyboard = useKeyboardInset()

  return (
    <div
      className="sticky z-10 -mx-4 space-y-2 border-t bg-background/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:mx-0 sm:space-y-3 sm:border-0 sm:px-0 sm:pt-0 sm:pb-2"
      style={{ bottom: keyboard }}
    >
      <GuessStatusLine state={state} online={online} clockOffset={clockOffset} meId={meId} locked={locked} warning={warning} />
      <div className="rounded-lg border bg-card p-3 shadow-soft sm:p-6 sm:short:p-4">{children}</div>
    </div>
  )
}
