import { useEffect, useState } from 'react'
import { SpelIkon } from '@/components/SpelIkon'
import { LOBBY_LINE_MS, type LobbyTheme } from '@/lib/vantrum'
import { cn } from '@/lib/utils'

// Rubrikraden i väntrummet, i spelets färg (data-spel): spelets namn, en replik som byter och ikonen som rör sig sakta.
// Ge den spelets id som key, så att repliken börjar om när spelet byts.
export function LobbyHeader({ gameId, name, theme }: { gameId: string; name: string; theme: LobbyTheme }) {
  const [line, setLine] = useState(0)
  const count = theme.lines.length
  useEffect(() => {
    if (count < 2) return
    const timer = setInterval(() => setLine((current) => (current + 1) % count), LOBBY_LINE_MS)
    return () => clearInterval(timer)
  }, [count])

  return (
    <div data-spel={gameId} className="flex items-center gap-3 overflow-hidden rounded-md bg-spel-yta px-4 py-3 text-spel-text">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl leading-tight">{name}</h1>
        {/* Alla repliker ligger i samma ruta, så att raden inte ändrar höjd. Dolda för skärmläsare, som annars skulle
            läsa upp en ny replik var tredje sekund. */}
        {count > 0 && (
          <p aria-hidden className="mt-0.5 grid text-sm">
            {theme.lines.map((text, i) => (
              <span
                key={text}
                className={cn('col-start-1 row-start-1 motion-safe:transition-opacity motion-safe:duration-500', i === line ? 'opacity-90' : 'opacity-0')}
              >
                {text}
              </span>
            ))}
          </p>
        )}
      </div>
      <span aria-hidden className="shrink-0 pr-1 text-4xl leading-none motion-safe:animate-drift">
        <SpelIkon game={{ emoji: theme.icon, icon: theme.image }} />
      </span>
    </div>
  )
}
