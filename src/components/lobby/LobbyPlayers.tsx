import { useEffect, useRef, useState } from 'react'
import { Bot, Crown } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { useGazeFollow } from '@/hooks/useGazeFollow'
import { useReactions } from '@/hooks/useReactions'
import { findBlob, lookDirection, SLEEP_AFTER_MS } from '@/lib/figurer'
import { cn } from '@/lib/utils'
import { VannSenast } from '@/components/lobby/VannSenast'

// watching: en bot i ett spel som botar inte kan spela än. Den står över matchen och tittar på.
// dress: vann senast i lobbyn och bär tantklänningen.
export type LobbyPlayer = { id: string; name: string; avatar: string; host: boolean; bot?: boolean; watching?: boolean; dress?: boolean }

// Spelarna i väntrummet: stora figurer med sin egen rörelse och personlighet (figurer.ts), med namnet under. emptySeats = streckade ringar
// för lediga platser. Figurerna gungar i otakt, så att de inte rör sig som en enda.
export function LobbyPlayers({ players, meId, emptySeats }: { players: readonly LobbyPlayer[]; meId: string; emptySeats: number }) {
  // Det senaste som hänt i väntrummet: en reaktion eller ett kast (med avsändaren), eller någon som gått med eller lämnat.
  const reactions = useReactions()
  const latest = reactions?.floating.at(-1)
  const hits = Object.entries(reactions?.throws.hits ?? {}).map(([id, n]) => `${id}:${n}`).join()
  const happening = `${players.map((player) => player.id).join()}|${latest?.key ?? ''}|${hits}`
  // Sjusovaren somnar när inget har hänt på SLEEP_AFTER_MS. En timer för hela listan, och den vaknar när något händer.
  // Värdet är det som gällde när timern löpte ut, så den sover inte från början och vaknar så fort något händer.
  const [quietSince, setQuietSince] = useState<string | null>(null)
  const asleep = quietSince === happening
  useEffect(() => {
    const timer = setTimeout(() => setQuietSince(happening), SLEEP_AFTER_MS)
    return () => clearTimeout(timer)
  }, [happening])
  // Ögat tittar mot den som nyss reagerade eller kastade, så länge raden syns.
  const lookAt = latest?.from ? players.findIndex((player) => player.id === latest.from) : -1
  // Med mus följer allas figurer muspekaren med blicken, som figurerna på startsidan.
  const listRef = useRef<HTMLUListElement>(null)
  const gaze = useGazeFollow(listRef)

  return (
    <ul ref={listRef} className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-2 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]">
      {players.map((player, i) => (
        <li key={player.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center motion-safe:animate-pop">
          <div className={cn('relative', player.watching && 'opacity-55 grayscale-[0.4]')}>
            {findBlob(player.avatar) ? (
              <span data-gaze className="block text-5xl leading-none sm:text-6xl">
                <LobbyFigur
                  playerId={player.id}
                  avatar={player.avatar}
                  delay={i * 0.7}
                  asleep={asleep}
                  look={lookDirection(i, lookAt)}
                  gaze={gaze}
                  dress={player.dress}
                  className="block"
                />
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
            {/* En bot har en liten robot vid figuren. */}
            {player.bot && (
              <span className="absolute -top-1 -left-2 flex size-7 items-center justify-center rounded-full border bg-card shadow-soft-sm">
                <Bot className="size-4" aria-label="Bot" />
              </span>
            )}
            {player.id === meId && (
              <span className="absolute -right-2 -bottom-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Du</span>
            )}
          </div>
          <span title={player.name} className="line-clamp-2 w-full leading-tight font-semibold [overflow-wrap:anywhere]">{player.name}</span>
          {player.watching && <span className="-mt-1 text-xs font-semibold text-muted-foreground">tittar på</span>}
          {player.dress && <VannSenast />}
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
