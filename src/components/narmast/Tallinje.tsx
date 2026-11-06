import type { CSSProperties } from 'react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { MAX_NUMBER, MIN_NUMBER, numberLineLanes } from '@/lib/narmast'
import { cn } from '@/lib/utils'

// Hur nära två figurer får stå (på skalan 1–100) innan de läggs på olika rader. En figur är cirka 30 px bred, och
// linjen är cirka 300 px på en smal telefon, så 11 räcker för att de aldrig skymmer varandra.
const MIN_GAP = 11
// Höjden per rad med figurer (px).
const LANE_HEIGHT = 40

export type LinePlayer = { id: string; name: string; avatar: string; value: number }

function position(value: number): string {
  return `${((value - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100}%`
}

// Facit som en tallinje 1–100: varje spelares figur står vid sitt tal, och en markör rullar fram längs linjen, saktar
// in och stannar på rätt tal (animate-tallinje-markor, ROLL_MS i RevealView). done = markören har stannat, och då lyser
// de som fick poäng. Med "minska rörelse" står markören på rätt tal direkt.
export function Tallinje({
  players,
  target,
  done,
  meId,
  scorers,
}: {
  players: readonly LinePlayer[]
  target: number
  done: boolean
  meId: string
  // De som fick poäng i rundan.
  scorers: readonly string[]
}) {
  const lanes = numberLineLanes(players, MIN_GAP)
  const laneCount = Math.max(1, ...Object.values(lanes).map((lane) => lane + 1))

  return (
    <div className="px-4 pt-2 pb-1" aria-hidden>
      <div className="relative" style={{ height: laneCount * LANE_HEIGHT + 64 }}>
        {/* Figurerna, i rader ovanför linjen när de står nära varandra. */}
        {players.map((player) => {
          const scored = done && scorers.includes(player.id)
          return (
            <div
              key={player.id}
              className="absolute flex -translate-x-1/2 flex-col items-center"
              style={{ left: position(player.value), bottom: 54 + lanes[player.id] * LANE_HEIGHT }}
            >
              <span
                className={cn(
                  'rounded-full px-1 font-heading text-[10px] leading-tight font-bold tabular-nums',
                  scored ? 'bg-mint text-foreground' : 'bg-card text-muted-foreground',
                  player.id === meId && 'ring-2 ring-primary',
                )}
              >
                {player.value}
              </span>
              <span className={cn('text-[1.6rem] leading-none', scored && 'motion-safe:animate-hop')}>
                <LobbyFigur playerId={player.id} avatar={player.avatar} className="block" />
              </span>
            </div>
          )
        })}

        {/* Linjen med 1, 50 och 100 under. */}
        <div className="absolute inset-x-0 bottom-7 h-2 rounded-full bg-muted" />
        {[MIN_NUMBER, 25, 50, 75, MAX_NUMBER].map((value) => (
          <span
            key={value}
            className="absolute bottom-0 -translate-x-1/2 text-xs font-semibold text-muted-foreground tabular-nums"
            style={{ left: position(value) }}
          >
            {value}
          </span>
        ))}

        {/* Markören. Rullar från 1 till rätt tal och stannar där. */}
        <div
          className="absolute bottom-[22px] flex -translate-x-1/2 flex-col items-center motion-safe:animate-tallinje-markor"
          style={{ left: position(target), '--target': position(target) } as CSSProperties}
        >
          <span className="size-0 border-x-[7px] border-t-[10px] border-x-transparent border-t-primary" />
          <span className="size-5 rounded-full border-[5px] border-primary bg-card shadow-soft-sm" />
        </div>
      </div>
    </div>
  )
}
