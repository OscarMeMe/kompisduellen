import { Crown, TrendingUp } from 'lucide-react'
import { roundStanding, type GameState, type StandingKind } from '@/lib/match'

// Ungefär var man ligger efter facit, i ord i stället för en exakt placering, och vem som leder matchen.
// Rundans vinnare är grön i listan ovanför, matchledaren får kronan här. Visas inte i en provomgång.
export function RoundStanding({ state, meId }: { state: GameState; meId: string }) {
  const standing = roundStanding(state, meId)
  if (!standing || state.practice) return null
  const { kind, climbed, decider, leaderIds } = standing

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft-sm animate-pop sm:flex-row sm:items-center sm:justify-between">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-lg font-bold">{decider ? 'Allt avgörs nu!' : STANDING_TEXT[kind]}</span>
        {climbed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-0.5 text-sm font-semibold motion-safe:animate-hop motion-safe:[animation-delay:350ms]">
            <TrendingUp className="size-3.5" aria-hidden />
            Du klättrar!
          </span>
        )}
      </p>
      {/* Leder man själv säger texten till vänster redan det. */}
      {leaderIds.length > 0 && !leaderIds.includes(meId) && (
        <p className="flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-sm font-semibold sm:shrink-0">
          <Crown className="size-4 shrink-0 text-crown" aria-hidden />
          <span className="truncate">{leaderText(state, leaderIds)}</span>
        </p>
      )}
    </div>
  )
}

const STANDING_TEXT: Record<StandingKind, string> = {
  none: 'Ingen har fått poäng än',
  leader: 'Du leder!',
  shared: 'Du delar ledningen',
  close: 'Du flåsar ledaren i nacken',
  top: 'Du är med i toppstriden',
  middle: 'Du är mitt i klungan',
  last: 'Allt kan vända. Ge järnet!',
}

function leaderText(state: GameState, leaderIds: string[]) {
  const names = leaderIds.map((id) => state.players[id]?.name ?? 'Någon')
  if (names.length === 1) return `${names[0]} leder matchen`
  if (names.length === 2) return `Delad ledning: ${names[0]} och ${names[1]}`
  return `Delad ledning mellan ${names.length} spelare`
}

