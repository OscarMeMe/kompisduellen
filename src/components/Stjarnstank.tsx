import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const STARS = 12

// Stjärnor som skjuts ut åt alla håll från mitten av föräldern (som ska vara relative), en gång. Till exempel vid
// fullträff i Gissa priset. Bara dekoration: göms för skärmläsare, tar inga tryck och visas inte med "minska rörelse".
// Platserna räknas fram ur numret, så att stänket blir likadant varje gång. delay = väntan innan det börjar (ms).
export function Stjarnstank({ delay = 0 }: { delay?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      {Array.from({ length: STARS }, (_, i) => {
        const angle = (i / STARS) * 2 * Math.PI + (i % 2 ? 0.2 : 0)
        const distance = 110 + ((i * 37) % 80)
        const size = 18 + ((i * 7) % 14)
        return (
          <span
            key={i}
            className={cn(
              'absolute top-1/2 left-1/2 opacity-0 [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)] motion-safe:animate-burst',
              ['bg-crown', 'bg-primary', 'bg-sun'][i % 3],
            )}
            style={
              {
                width: size,
                height: size,
                animationDelay: `${delay + (i % 3) * 40}ms`,
                '--x': `${Math.round(Math.cos(angle) * distance)}px`,
                '--y': `${Math.round(Math.sin(angle) * distance)}px`,
                '--r': `${i % 2 ? 160 : -160}deg`,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
