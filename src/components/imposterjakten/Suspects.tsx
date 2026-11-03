import { Crown } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { findBlob } from '@/lib/figurer'

export type Suspect = { id: string; name: string; avatar: string; host: boolean }

// Spelarna i Imposterjaktens väntrum: stora figurer som gungar lätt, med namnet under. emptySeats = streckade ringar
// för lediga platser. Figurerna gungar i otakt, så att de inte rör sig som en enda.
export function Suspects({ players, meId, emptySeats }: { players: readonly Suspect[]; meId: string; emptySeats: number }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-2 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]">
      {players.map((player, i) => (
        <li key={player.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center motion-safe:animate-pop">
          <div className="relative">
            {findBlob(player.avatar) ? (
              <span className="block text-5xl leading-none sm:text-6xl">
                <LobbyFigur playerId={player.id} avatar={player.avatar} delay={i * 0.7} className="block" />
              </span>
            ) : (
              <span
                className="block origin-bottom text-5xl leading-none motion-safe:animate-sway sm:text-6xl"
                style={{ animationDelay: `${-i * 0.7}s` }}
              >
                <Emoji emoji={player.avatar} className="block" />
              </span>
            )}
            {player.host && (
              <span className="absolute -top-1 -right-2 flex size-7 items-center justify-center rounded-full border bg-card shadow-soft-sm">
                <Crown className="size-4 text-crown" aria-label="Värd" />
              </span>
            )}
            {player.id === meId && (
              <span className="absolute -right-2 -bottom-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Du</span>
            )}
          </div>
          <span title={player.name} className="line-clamp-2 w-full leading-tight font-semibold [overflow-wrap:anywhere]">{player.name}</span>
        </li>
      ))}
      {Array.from({ length: emptySeats }, (_, i) => (
        <li key={i} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <span className="block size-[3.6rem] rounded-full border-2 border-dashed border-muted-foreground/50 sm:size-[4.5rem]" />
          <span className="text-sm text-muted-foreground">Ledig plats</span>
        </li>
      ))}
    </ul>
  )
}
