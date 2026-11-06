import { useState } from 'react'
import { FlipCard } from '@/components/kort/FlipCard'
import { AnswerCard, Sentence } from '@/components/kort/PlayingCard'
import { Meningar } from '@/components/kortkaos/Meningar'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import type { CardMove } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'
import type { GameState } from '@/lib/match'

type JudgingStepProps = {
  state: GameState
  prompt: string
  isJudge: boolean
  clockOffset: number
  onMove: (move: CardMove) => void
}

// Domaren väljer: alla ser korten ifyllda i frågan, utan namn och i slumpad ordning.
// Bara domaren kan välja, och valet bekräftas med en knapp så att ett feltryck inte avgör. Domarens markering finns
// bara i domarens egen flik. De andra bläddrar mellan meningarna, en i taget och stort (Meningar).
export function JudgingStep({ state, prompt, isJudge, clockOffset, onMove }: JudgingStepProps) {
  const table = state.cards!
  const [chosen, setChosen] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const { secondsLeft } = useCountdown(state.deadline, clockOffset, kortkaosRules.seconds.judging)
  const judgeName = state.players[table.judge]?.name ?? 'Domaren'

  function confirm() {
    if (!chosen) return
    setSent(true)
    onMove({ type: 'judge', key: chosen })
  }

  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl">{isJudge ? 'Välj ditt favoritkort' : `${judgeName} väljer vinnare…`}</h1>
        <p className="text-sm font-semibold text-background tabular-nums">
          {state.deadline !== null && `⏱ ${secondsLeft} s kvar · `}Ingen vet vem som spelade vad
        </p>
      </div>

      {!isJudge && <Meningar prompt={prompt} submissions={table.submissions} round={state.round} />}

      {isJudge && (
        <ul {...SPLAT_SHIELD} className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-center" aria-label="Insända kort">
          {table.submissions.map((submission, i) => (
            <li key={submission.key} className="lg:w-[calc((100%-1.5rem)/3)]">
              {/* Korten vänds upp ett i taget. */}
              <FlipCard delay={i * 180}>
                <AnswerCard
                  selected={chosen === submission.key}
                  disabled={sent}
                  onSelect={() => setChosen(submission.key)}
                >
                  <Sentence prompt={prompt} answer={submission.text} />
                </AnswerCard>
              </FlipCard>
            </li>
          ))}
        </ul>
      )}

      {isJudge && (
        <div {...SPLAT_SHIELD} className="sticky bottom-4 z-10 lg:mx-auto lg:w-full lg:max-w-sm">
          <Button size="lg" className="w-full" disabled={!chosen || sent} onClick={confirm}>
            {sent ? 'Vinnaren är vald' : chosen ? 'Välj som vinnare' : 'Tryck på ett kort'}
          </Button>
        </div>
      )}
    </>
  )
}
