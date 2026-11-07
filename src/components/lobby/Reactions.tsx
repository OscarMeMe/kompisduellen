import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import {
  ReactionsContext,
  useReactions,
  type FloatingReaction,
  type ReactionsValue,
  type Throws,
} from '@/hooks/useReactions'
import { IMPACT_MS } from '@/lib/kast'
import { loadSoundOn, playReaction, playThrow, saveSoundOn } from '@/lib/ljud'
import { REACTION_COOLDOWN_MS, REACTIONS } from '@/lib/reaktioner'
import { cn } from '@/lib/utils'

// Så många reaktioner syns samtidigt. De äldsta försvinner först.
const MAX_VISIBLE = 6
const NONE: readonly string[] = []

type ReactionsProviderProps = {
  enabled: boolean
  floating: FloatingReaction[]
  send: (reactionId: string) => void
  throws: Throws
  // Spelarna som sitter vid Imposterjaktens bord. Deras reaktioner visas vid platsen i stället för överst.
  seatedIds?: readonly string[]
  children: ReactNode
}

// Håller reaktionerna, kasten och ljudvalet för lobbysidan, så att väntrummet, spelarlistorna och facitvyerna kan
// visa knapparna utan att få dem som props. Ljudet spelas när en ny reaktion kommer in eller något splattar mot mig.
export function ReactionsProvider({ enabled, floating, send, throws, seatedIds = NONE, children }: ReactionsProviderProps) {
  const [soundOn, setSound] = useState(loadSoundOn)
  const lastKey = useRef<string | undefined>(floating.at(-1)?.key)

  useEffect(() => {
    const latest = floating.at(-1)
    if (latest && latest.key !== lastKey.current && soundOn) playReaction(latest.emoji)
    lastKey.current = latest?.key
  }, [floating, soundOn])

  // Ljudet för det som kastas på mig: svischet medan det flyger och träffen när det slår i skärmen.
  const splatKey = throws.splat?.key
  const splatItem = throws.splat?.item
  useEffect(() => {
    if (splatKey && splatItem && soundOn) playThrow(splatItem, IMPACT_MS / 1000)
  }, [splatKey, splatItem, soundOn])

  const value = useMemo<ReactionsValue>(
    () => ({
      enabled,
      floating,
      seatedIds,
      send,
      throws,
      soundOn,
      setSoundOn: (on) => {
        setSound(on)
        saveSoundOn(on)
      },
    }),
    [enabled, floating, seatedIds, send, throws, soundOn],
  )
  return <ReactionsContext.Provider value={value}>{children}</ReactionsContext.Provider>
}

// Reaktionerna på en rad som aldrig bryts: de krymper i stället (minst 40 px breda på en skärm som är 320 px bred).
// Ljudet ställs med ljudknappen uppe till höger (LobbySound i LjudKnapp.tsx). Visas inte om man är ensam i lobbyn eller utanför en lobby.
export function ReactionBar({ className }: { className?: string }) {
  const reactions = useReactions()
  const [cooling, setCooling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!reactions?.enabled) return null

  function press(id: string) {
    if (cooling) return
    reactions?.send(id)
    setCooling(true)
    timer.current = setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS)
  }

  return (
    <div role="group" aria-label="Reaktioner" className={cn('flex w-full items-center justify-center gap-1 min-[360px]:gap-1.5 sm:gap-2', className)}>
      {REACTIONS.map((reaction) => (
        <Button
          key={reaction.id}
          variant="outline"
          className="h-12 min-w-0 max-w-14 flex-1 px-0 text-2xl"
          disabled={cooling}
          onClick={() => press(reaction.id)}
          aria-label={reaction.label}
        >
          {reaction.emoji}
        </Button>
      ))}
    </div>
  )
}

// Reaktioner från alla i lobbyn, som bubblor i en rad överst på skärmen (under sidhuvudet och rundans tidsstapel).
// De står bredvid varandra i stället för på varandra, och tar inga tryck.
export function ReactionFloaters() {
  const reactions = useReactions()
  // Reaktioner från den som sitter vid Imposterjaktens bord visas vid platsen (Bord.tsx).
  const shown = reactions?.floating.filter((item) => !item.from || !reactions.seatedIds.includes(item.from)) ?? []
  if (!reactions || shown.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-30 flex justify-center px-4" aria-hidden>
      <div className="flex max-w-xl flex-wrap justify-center gap-2">
        {shown.slice(-MAX_VISIBLE).map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1.5 shadow-soft motion-safe:animate-reaction motion-reduce:animate-reaction-fade"
          >
            {item.target === undefined ? (
              <>
                <span className="text-2xl leading-none sm:text-4xl">{item.emoji}</span>
                <span className="max-w-24 truncate text-sm font-semibold sm:max-w-32">{item.name}</span>
              </>
            ) : (
              // Ett kast: "Oscar 🍅 → Lisa"
              <span className="flex items-center gap-1.5 pl-1.5 text-sm font-semibold">
                <span className="max-w-24 truncate sm:max-w-32">{item.name}</span>
                <Emoji emoji={item.emoji} className="text-2xl leading-none" />
                <span aria-hidden>→</span>
                <span className="max-w-24 truncate sm:max-w-32">{item.target}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
