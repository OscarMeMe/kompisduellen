import { useEffect, useRef, type CSSProperties } from 'react'
import { Figur } from '@/components/figurer/Figur'
import { BLOBS, type BlobId } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Figurerna på startsidan, i den här ordningen. Ögat har ett stort öga, så att blicken syns tydligt.
const HERO_IDS: readonly BlobId[] = ['festis', 'klumpen', 'ogat', 'blygis']
const HERO_FIGURES = HERO_IDS.map((id) => BLOBS.find((blob) => blob.id === id)).filter((blob) => blob !== undefined)

// Hur långt bort (px) muspekaren ska vara för att blicken ska gå hela vägen åt sidan.
const GAZE_REACH = 260

// Några figurer som står och väntar i startsidans hero. De andas, blinkar och guppar lätt, var och en i sin egen takt,
// och med mus följer de muspekaren med blicken. Bara dekoration, så de göms för skärmläsare. Med "minska rörelse" står
// de still och tittar rakt fram.
export function HeroFigurer({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const figures = Array.from(root.querySelectorAll<HTMLElement>('[data-gaze]'))
    let frame = 0
    let pointer = { x: 0, y: 0 }
    // Blicken räknas ut högst en gång per bildruta och sätts som CSS-variabler, så att React inte ritar om något.
    function update() {
      frame = 0
      for (const figure of figures) {
        const box = figure.getBoundingClientRect()
        if (box.bottom < 0 || box.top > window.innerHeight) continue
        const dx = pointer.x - (box.left + box.width / 2)
        const dy = pointer.y - (box.top + box.height * 0.45)
        figure.style.setProperty('--gaze-x', String(Math.max(-1, Math.min(1, dx / GAZE_REACH)).toFixed(2)))
        figure.style.setProperty('--gaze-y', String(Math.max(-1, Math.min(1, dy / GAZE_REACH)).toFixed(2)))
      }
    }
    function onMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY }
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className={cn('flex items-end -space-x-1.5 text-[3.375rem] max-md:mb-1 sm:text-7xl md:-space-x-2 md:text-[5.625rem]', className)}>
      {HERO_FIGURES.map((figure, i) => (
        // Guppet ligger på ett eget element runt figuren, eftersom figuren själv redan andas.
        <span key={figure.id} data-gaze className="inline-flex motion-safe:animate-hero-bob" style={{ animationDelay: `${-i * 0.9}s`, '--blink-delay': `${-i * 1.7}s` } as CSSProperties}>
          <Figur figure={figure} animated gaze delay={i * 1.3} />
        </span>
      ))}
    </div>
  )
}
