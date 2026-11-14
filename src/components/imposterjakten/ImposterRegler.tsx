import { findGame } from '@/lib/games'
import { IMPOSTER_GAME, IMPOSTER_SCORING } from '@/lib/imposterjakten'
import { cn } from '@/lib/utils'

// Imposterjaktens regler på ett ställe: de numrerade stegen är samma som i rutan "Så spelar man" på startsidan
// (intro.steps i games.ts), och poängen är en kort lista (IMPOSTER_SCORING). Visas i väntrummet (Så spelas det) och i
// regelrutan (?) vid spelplanen, med samma lampgula siffror som i rutan på startsidan.
export function ImposterRegler({ className }: { className?: string }) {
  const steps = findGame(IMPOSTER_GAME)?.intro?.steps ?? []
  // Den sista raden handlar om svårigheterna, inte om poäng, och står för sig.
  const points = IMPOSTER_SCORING.slice(0, -1)
  const levels = IMPOSTER_SCORING.at(-1)
  return (
    <div className={cn('space-y-4', className)}>
      <ol className="space-y-2.5">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--natt-lampa)] font-heading text-sm font-bold text-[var(--natt)] ring-2 ring-[var(--natt)]">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-snug">{step}</span>
          </li>
        ))}
      </ol>
      <div>
        <h3 className="text-lg">Poäng</h3>
        <ul className="mt-1.5 space-y-1.5">
          {points.map((line) => (
            <li key={line} className="flex items-start gap-2 leading-snug">
              <span aria-hidden className="mt-[0.45em] size-2 shrink-0 rounded-full bg-[var(--natt-lampa)] ring-1 ring-[var(--natt)]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      {levels && <p className="text-sm leading-snug opacity-80">{levels}</p>}
    </div>
  )
}
