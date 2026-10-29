import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const COLORS = ['bg-primary', 'bg-mint', 'bg-sun', 'bg-sky', 'bg-lilac']
const PIECES = 22

// Ett litet konfettiregn över föräldern (som ska vara relative). Bara dekoration: göms för skärmläsare, tar inga tryck
// och visas inte alls med "minska rörelse". Bitarnas plats, riktning och snurr räknas fram ur numret, så att samma
// regn blir likadant varje gång. delay = hur länge regnet väntar innan det börjar (ms).
export function Konfetti({ delay = 0 }: { delay?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 motion-reduce:hidden">
      {Array.from({ length: PIECES }, (_, i) => {
        const left = 4 + ((i * 37) % 92)
        const drift = ((i * 53) % 61) - 30
        const spin = 180 + ((i * 97) % 360)
        return (
          <span
            key={i}
            className={cn(
              'absolute top-0 h-3 w-1.5 rounded-sm motion-safe:animate-confetti',
              i % 3 === 0 && 'h-2 w-2 rounded-full',
              COLORS[i % COLORS.length],
            )}
            style={
              {
                left: `${left}%`,
                animationDelay: `${delay + ((i * 23) % 220)}ms`,
                '--x': `${drift}px`,
                '--spin': `${i % 2 === 0 ? spin : -spin}deg`,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
