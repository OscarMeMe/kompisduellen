import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { loadSoundOn, playPop, saveSoundOn } from '@/lib/ljud'
import { REACTION_COOLDOWN_MS, REACTIONS } from '@/lib/reaktioner'
import { cn } from '@/lib/utils'

// En reaktion som svävar över skärmen en kort stund.
export type FloatingReaction = { key: string; name: string; avatar: string; emoji: string; left: number }

type ReactionsValue = {
  // Reaktioner kan skickas när fler än en är med i lobbyn.
  enabled: boolean
  floating: FloatingReaction[]
  send: (reactionId: string) => void
  soundOn: boolean
  setSoundOn: (on: boolean) => void
}

const ReactionsContext = createContext<ReactionsValue | null>(null)

type ReactionsProviderProps = {
  enabled: boolean
  floating: FloatingReaction[]
  send: (reactionId: string) => void
  children: ReactNode
}

// Håller reaktionerna och ljudvalet för lobbysidan, så att väntrummet och facitvyerna kan visa knapparna
// utan att få dem som props. Ljudet spelas när en ny reaktion kommer in.
export function ReactionsProvider({ enabled, floating, send, children }: ReactionsProviderProps) {
  const [soundOn, setSound] = useState(loadSoundOn)
  const lastKey = useRef<string | undefined>(floating.at(-1)?.key)

  useEffect(() => {
    const key = floating.at(-1)?.key
    if (key && key !== lastKey.current && soundOn) playPop()
    lastKey.current = key
  }, [floating, soundOn])

  const value = useMemo<ReactionsValue>(
    () => ({
      enabled,
      floating,
      send,
      soundOn,
      setSoundOn: (on) => {
        setSound(on)
        saveSoundOn(on)
      },
    }),
    [enabled, floating, send, soundOn],
  )
  return <ReactionsContext.Provider value={value}>{children}</ReactionsContext.Provider>
}

// Tre reaktioner och en ljudknapp. Visas inte om man är ensam i lobbyn eller utanför en lobby.
export function ReactionBar({ className }: { className?: string }) {
  const reactions = useContext(ReactionsContext)
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
    <div role="group" aria-label="Reaktioner" className={cn('flex items-center justify-center gap-2', className)}>
      {REACTIONS.map((reaction) => (
        <Button
          key={reaction.id}
          variant="outline"
          className="h-12 w-14 text-2xl"
          disabled={cooling}
          onClick={() => press(reaction.id)}
          aria-label={reaction.label}
        >
          {reaction.emoji}
        </Button>
      ))}
      <Button
        variant="ghost"
        className="h-12 w-12"
        aria-pressed={reactions.soundOn}
        aria-label={reactions.soundOn ? 'Stäng av ljud' : 'Sätt på ljud'}
        onClick={() => reactions.setSoundOn(!reactions.soundOn)}
      >
        {reactions.soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      </Button>
    </div>
  )
}

// Svävande reaktioner från alla i lobbyn. Ligger över sidan men tar inga tryck.
export function ReactionFloaters() {
  const reactions = useContext(ReactionsContext)
  if (!reactions || reactions.floating.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 h-0" aria-hidden>
      {reactions.floating.map((item) => (
        <div
          key={item.key}
          className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-1 duration-700 animate-in fade-in slide-in-from-bottom-16"
          style={{ left: `${item.left}%` }}
        >
          <span className="text-5xl drop-shadow">{item.emoji}</span>
          <span className="flex max-w-32 items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-xs font-semibold shadow-soft-sm">
            <Emoji emoji={item.avatar} className="text-sm" />
            <span className="truncate">{item.name}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
