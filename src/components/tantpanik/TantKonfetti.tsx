import { useEffect, useState, type CSSProperties } from 'react'

// Färger med kontrast mot den krämvita bakgrunden: vinrött, mörkt guld, klänningsrosa och turkos.
const COLORS = ['var(--konfetti-vin)', 'var(--konfetti-guld)', 'var(--konfetti-rosa)', 'var(--konfetti-turkos)']
const PIECES = 56
// Bitarna börjar så här långt ovanför skärmen (px).
const ABOVE = 60

// Konfettin på Exploderande Tanters slutskärm: fyrkanter och pappersremsor som börjar ovanför skärmen och faller hela
// vägen till nederkanten, medan de vickar i sidled och snurrar. Fallhöjden är skärmens uppmätta höjd. Bitarnas plats,
// storlek, takt och snurr räknas fram ur numret, så att regnet blir likadant varje gång. Tar inga tryck, göms för
// skärmläsare och visas inte med "minska rörelse". delay = när regnet börjar (ms).
export function TantKonfetti({ delay = 0 }: { delay?: number }) {
  const [height, setHeight] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  useEffect(() => {
    const measure = () => setHeight(window.innerHeight)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[25] overflow-hidden motion-reduce:hidden">
      {Array.from({ length: PIECES }, (_, i) => {
        const strip = i % 3 !== 0
        const left = (i * 37 + (i % 7) * 11) % 100
        const fall = 2600 + ((i * 131) % 1600)
        const start = delay + ((i * 97) % 1500)
        const sway = 10 + ((i * 29) % 22)
        const swing = 380 + ((i * 53) % 420)
        const turn = (i % 2 === 0 ? 1 : -1) * (160 + ((i * 71) % 360))
        return (
          <span
            key={i}
            className="absolute top-0 motion-safe:animate-tant-konfetti-fall"
            style={
              {
                left: `${left}%`,
                top: -ABOVE,
                animationDuration: `${fall}ms`,
                animationDelay: `${start}ms`,
                '--fall': `${height + ABOVE * 2}px`,
              } as CSSProperties
            }
          >
            <span
              className="block motion-safe:animate-tant-konfetti-sway"
              style={
                {
                  width: strip ? 9 : 16,
                  height: strip ? 26 : 16,
                  borderRadius: strip ? 2 : 3,
                  background: COLORS[i % COLORS.length],
                  animationDuration: `${swing}ms`,
                  animationDelay: `${-((i * 41) % swing)}ms`,
                  '--sway': `${sway}px`,
                  '--r0': `${-turn / 4}deg`,
                  '--r1': `${turn}deg`,
                  '--flip': strip ? '180deg' : '0deg',
                } as CSSProperties
              }
            />
          </span>
        )
      })}
    </div>
  )
}
