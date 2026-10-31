import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadSoundOn, playPop, saveSoundOn } from '@/lib/ljud'
import { REACTION_COOLDOWN_MS, REACTIONS } from '@/lib/reaktioner'
import { cn } from '@/lib/utils'

// En reaktion som visas överst på skärmen en kort stund.
// target = den som träffades av ett kast ("Oscar 🍅 → Lisa"). Saknas för vanliga reaktioner.
export type FloatingReaction = { key: string; name: string; emoji: string; target?: string }

// Så många reaktioner syns samtidigt. De äldsta försvinner först.
const MAX_VISIBLE = 6

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

// Reaktionerna och en ljudknapp. Visas inte om man är ensam i lobbyn eller utanför en lobby.
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
    <div role="group" aria-label="Reaktioner" className={cn('flex flex-wrap items-center justify-center gap-1.5 sm:gap-2', className)}>
      {REACTIONS.map((reaction) => (
        <Button
          key={reaction.id}
          variant="outline"
          className="h-12 w-11 text-2xl sm:w-14"
          disabled={cooling}
          onClick={() => press(reaction.id)}
          aria-label={reaction.label}
        >
          {reaction.emoji}
        </Button>
      ))}
      <Button
        variant="ghost"
        className="h-12 w-11 sm:w-12"
        aria-pressed={reactions.soundOn}
        aria-label={reactions.soundOn ? 'Stäng av ljud' : 'Sätt på ljud'}
        onClick={() => reactions.setSoundOn(!reactions.soundOn)}
      >
        {reactions.soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      </Button>
    </div>
  )
}

// Reaktioner från alla i lobbyn, som bubblor i en rad överst på skärmen (under sidhuvudet och rundans tidsstapel).
// De står bredvid varandra i stället för på varandra, och tar inga tryck.
export function ReactionFloaters() {
  const reactions = useContext(ReactionsContext)
  if (!reactions || reactions.floating.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-30 flex justify-center px-4" aria-hidden>
      <div className="flex max-w-xl flex-wrap justify-center gap-2">
        {reactions.floating.slice(-MAX_VISIBLE).map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1.5 shadow-soft motion-safe:animate-reaction motion-reduce:animate-reaction-fade"
          >
            <span className="text-2xl leading-none sm:text-4xl">{item.emoji}</span>
            <span className="max-w-24 truncate text-sm font-semibold sm:max-w-32">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
