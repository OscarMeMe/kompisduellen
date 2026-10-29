import { ArrowDown, ArrowUp, Crown } from 'lucide-react'
import { roundStanding, type GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

// Var man står i matchen efter facit: egen placering, hur den ändrades och vem som leder matchen.
// Rundans vinnare är grön i listan ovanför, matchledaren får kronan här. Visas inte i en provomgång.
export function RoundStanding({ state, meId }: { state: GameState; meId: string }) {
  const standing = roundStanding(state, meId)
  if (!standing || state.practice) return null
  const { place, previousPlace, players, leaderIds } = standing
  const moved = previousPlace === null ? 0 : previousPlace - place

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft-sm animate-pop sm:flex-row sm:items-center sm:justify-between">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-lg font-bold">
          Du är på plats {place} av {players}
        </span>
        {previousPlace !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold',
              moved > 0 ? 'bg-mint-soft' : moved < 0 ? 'bg-coral-soft' : 'bg-muted',
            )}
          >
            {moved > 0 && <ArrowUp className="size-3.5" aria-hidden />}
            {moved < 0 && <ArrowDown className="size-3.5" aria-hidden />}
            {moved === 0 ? 'Samma plats' : `${moved > 0 ? 'Upp' : 'Ner'} ${placesText(Math.abs(moved))}`}
          </span>
        )}
      </p>
      {leaderIds.length > 0 && (
        <p className="flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-sm font-semibold sm:shrink-0">
          <Crown className="size-4 shrink-0 text-amber-500" aria-hidden />
          <span className="truncate">{leaderText(state, meId, leaderIds)}</span>
        </p>
      )}
    </div>
  )
}

function placesText(count: number) {
  return count === 1 ? '1 plats' : `${count} platser`
}

function leaderText(state: GameState, meId: string, leaderIds: string[]) {
  if (leaderIds.length === 1) {
    return leaderIds[0] === meId ? 'Du leder matchen' : `${state.players[leaderIds[0]]?.name ?? 'Någon'} leder matchen`
  }
  if (leaderIds.length > 2) return `Delad ledning mellan ${leaderIds.length} spelare`
  const names = leaderIds.map((id) => (id === meId ? 'du' : (state.players[id]?.name ?? 'någon')))
  return `Delad ledning: ${names[0]} och ${names[1]}`
}
