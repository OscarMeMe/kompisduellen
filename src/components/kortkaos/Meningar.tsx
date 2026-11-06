import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FlipCard } from '@/components/kort/FlipCard'
import { PromptCard } from '@/components/kort/PlayingCard'
import { WAITING_LINE_MS, waitingLine } from '@/components/kortkaos/vantan'
import { Button } from '@/components/ui/button'
import type { Submission } from '@/lib/kort'
import { cn } from '@/lib/utils'

type MeningarProps = {
  prompt: string
  submissions: Submission[]
  round: number
}

// Medan domaren väljer: de färdiga meningarna en i taget, stort, och en rolig statusrad som byts var fjärde sekund.
// Man bläddrar med knapparna, prickarna eller pilarna på tangentbordet. Ordningen är densamma som domaren ser
// (slumpad), och varken vem som spelade vad eller vilket kort domaren tittar på visas.
export function Meningar({ prompt, submissions, round }: MeningarProps) {
  const [index, setIndex] = useState(0)
  const [tick, setTick] = useState(0)
  const n = submissions.length
  const current = submissions[Math.min(index, n - 1)]

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), WAITING_LINE_MS)
    return () => clearInterval(timer)
  }, [])

  // Pilarna bläddrar, utom när man skriver i ett fält.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % n)
      else if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + n) % n)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])

  if (!current) return null
  const line = waitingLine(round, tick)

  return (
    <div className="flex flex-col items-center gap-4 lg:gap-3">
      {/* Bara dekoration för skärmläsare, annars läses en ny rad upp var fjärde sekund. */}
      <p aria-hidden key={line} className="min-h-6 text-center font-semibold text-sun motion-safe:animate-fade">
        {line}
      </p>

      <section aria-label="Meningarna" aria-roledescription="bildspel" className="w-full lg:max-w-2xl">
        <FlipCard key={current.key}>
          <PromptCard
            prompt={prompt}
            answer={current.text}
            className="lg:min-h-0 lg:short:min-h-0"
          />
        </FlipCard>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="lg" aria-label="Förra meningen" onClick={() => setIndex((i) => (i - 1 + n) % n)} className="text-foreground">
          <ChevronLeft aria-hidden />
        </Button>
        <div className="flex flex-wrap justify-center" role="group" aria-label="Välj mening">
          {submissions.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Mening ${i + 1}`}
              aria-current={i === index}
              // Prickarna är små, men tryckytan runt dem är stor nog för ett finger.
              className="group rounded-full p-2 focus-visible:ring-4 focus-visible:ring-sun/50 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'block size-3 rounded-full transition-colors',
                  i === index ? 'bg-sun' : 'bg-background/40 group-hover:bg-background/70',
                )}
              />
            </button>
          ))}
        </div>
        <Button variant="outline" size="lg" aria-label="Nästa mening" onClick={() => setIndex((i) => (i + 1) % n)} className="text-foreground">
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <p className="text-sm font-medium text-background" aria-live="polite">
        Mening {index + 1} av {n}
        <span className="max-lg:hidden"> · bläddra med pilarna ← →</span>
      </p>
    </div>
  )
}
