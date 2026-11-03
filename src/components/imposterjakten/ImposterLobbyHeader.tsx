import { useEffect, useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { IMPOSTER_LOBBY_LINE_MS, IMPOSTER_LOBBY_LINES } from '@/lib/imposterjakten'
import { cn } from '@/lib/utils'

// Rubrikraden i Imposterjaktens väntrum: mörk, med en replik som byter och ett förstoringsglas som letar sakta.
export function ImposterLobbyHeader({ gameId, name }: { gameId: string; name: string }) {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setLine((current) => (current + 1) % IMPOSTER_LOBBY_LINES.length), IMPOSTER_LOBBY_LINE_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div data-spel={gameId} className="flex items-center gap-3 overflow-hidden rounded-md bg-spel-yta px-4 py-3 text-spel-text">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl leading-tight">{name}</h1>
        {/* Alla repliker ligger i samma ruta, så att raden inte ändrar höjd. Dolda för skärmläsare, som annars skulle
            läsa upp en ny replik var tredje sekund. */}
        <p aria-hidden className="mt-0.5 grid text-sm">
          {IMPOSTER_LOBBY_LINES.map((text, i) => (
            <span
              key={text}
              className={cn('col-start-1 row-start-1 motion-safe:transition-opacity motion-safe:duration-500', i === line ? 'opacity-90' : 'opacity-0')}
            >
              {text}
            </span>
          ))}
        </p>
      </div>
      <span aria-hidden className="shrink-0 pr-1 text-4xl leading-none motion-safe:animate-magnify">
        <Emoji emoji="🔍" />
      </span>
    </div>
  )
}
