import { Check } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { CLUE_ROUNDS, currentTurn, type Clue, type ImposterTable } from '@/lib/imposterjakten'
import type { GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Allas ord i omgången, en rad per spelare i turordning och ett ord per varv. Listan växer varv för varv, och den
// som har tur markeras med "funderar…". Med Säg högt visas bara att spelaren har sagt sitt ord.
export function ClueList({ state, table, meId }: { state: GameState; table: ImposterTable; meId: string }) {
  const turn = currentTurn(table)
  const cluesOf = (id: string) => table.clues.filter((clue) => clue.player === id)

  return (
    <ol className="space-y-2" aria-label="Allas ord">
      {table.order.map((id) => {
        const player = state.players[id]
        const clues = cluesOf(id)
        const thinking = turn === id
        return (
          <li
            key={id}
            className={cn(
              'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-4 py-3 shadow-soft-sm',
              thinking && 'border-primary bg-coral-soft',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {player && <Emoji emoji={player.avatar} className="text-2xl" />}
              <span className="truncate font-bold">
                {player?.name ?? 'Någon'}
                {id === meId && <span className="font-normal text-muted-foreground"> (du)</span>}
              </span>
            </span>
            <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              {Array.from({ length: CLUE_ROUNDS }, (_, round) => {
                const clue = clues[round]
                if (clue) return <ClueChip key={round} clue={clue} />
                if (thinking && round === clues.length) {
                  return (
                    <span key={round} className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-muted-foreground">
                      funderar…
                    </span>
                  )
                }
                return null
              })}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ClueChip({ clue }: { clue: Clue }) {
  if (clue.kind === 'pass') {
    return <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground motion-safe:animate-pop">Pass</span>
  }
  if (clue.kind === 'sagt') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-mint-soft px-3 py-1 text-sm font-semibold motion-safe:animate-pop">
        <Check className="size-4" aria-hidden />
        Sa sitt ord
      </span>
    )
  }
  return (
    <span className="rounded-full border bg-sun-soft px-3 py-1 font-heading text-base font-bold motion-safe:animate-pop">
      {clue.word}
    </span>
  )
}
