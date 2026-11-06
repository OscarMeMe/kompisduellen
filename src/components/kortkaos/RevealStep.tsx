import { useEffect, useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { FlipCard } from '@/components/kort/FlipCard'
import { AnswerCard, PromptCard } from '@/components/kort/PlayingCard'
import { RevealFooter } from '@/components/lobby/RevealFooter'
import { capitalize } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'
import { rankPlayers, type GameState } from '@/lib/match'
import type { Player } from '@/lib/player'
import { cn } from '@/lib/utils'

type RevealStepProps = {
  state: GameState
  me: Player
  prompt: string
  isHost: boolean
  clockOffset: number
  onNext: (round: number) => void
}

// När varje steg i avslöjandet börjar (ms efter att avslöjandet började):
// 1) den färdiga meningen, 2) vem som spelade den och +1 poäng, 3) de andra korten, vem som spelade dem och
// ställningen.
const STEP_MS = [0, 2500, 5000] as const

// Vilket steg som visas nu. Den som kommer in mitt i avslöjandet (eller laddar om) hoppar till rätt steg.
function useRevealStep(deadline: number | null, clockOffset: number): number {
  const [step, setStep] = useState(() => {
    if (deadline === null) return 1
    const elapsed = kortkaosRules.seconds.reveal * 1000 - (deadline + clockOffset - Date.now())
    return STEP_MS.filter((ms) => elapsed >= ms).length || 1
  })
  useEffect(() => {
    if (step >= STEP_MS.length) return
    const timer = setTimeout(() => setStep((s) => s + 1), STEP_MS[step] - STEP_MS[step - 1])
    return () => clearTimeout(timer)
  }, [step])
  return step
}

// Avslöja i tre steg med en paus mellan, så att varje steg hinner läsas.
export function RevealStep({ state, me, prompt, isHost, clockOffset, onNext }: RevealStepProps) {
  const table = state.cards!
  const owners = table.owners ?? {}
  const winning = table.submissions.find((s) => s.key === table.winner)
  const winnerId = table.winner ? owners[table.winner] : undefined
  const winner = winnerId ? state.players[winnerId] : undefined
  const others = table.submissions.filter((s) => s.key !== table.winner)
  const step = useRevealStep(state.deadline, clockOffset)

  return (
    <>
      {table.skipped || !winning ? (
        <div className="space-y-2 rounded-lg border bg-card p-6 text-center text-foreground shadow-soft animate-pop">
          <h1 className="text-2xl">Ingen poäng den här rundan</h1>
          <p className="text-muted-foreground">För få kort kom in, även på det nya frågekortet.</p>
        </div>
      ) : (
        <section aria-label="Vinnarkortet" aria-live="polite" className="flex flex-col items-center gap-4">
          {table.judgeAsleep && (
            <p className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground">
              Domaren somnade. Vinnaren lottades
            </p>
          )}
          {/* Steg 1: den färdiga meningen. Kortet vänds upp och vickar till. */}
          <FlipCard className="w-full lg:max-w-2xl">
            <PromptCard
              prompt={prompt}
              answer={winning.text}
              className="motion-safe:animate-wiggle motion-safe:[animation-delay:600ms]"
            />
          </FlipCard>
          {/* Steg 2: vem som spelade kortet och +1. Platsen finns redan, så att inget hoppar. */}
          {winner && (
            <p
              className={cn(
                'flex items-center gap-3 rounded-full bg-mint-soft py-2 pr-2 pl-3 text-lg font-bold text-foreground shadow-soft-sm',
                step < 2 ? 'invisible' : 'motion-safe:animate-pop motion-reduce:animate-fade',
              )}
            >
              <Emoji emoji={winner.avatar} className="text-3xl" />
              {winnerId === me.id ? 'Ditt kort vann!' : `${winner.name} spelade kortet`}
              <span
                className={cn(
                  'rounded-full bg-primary px-3 py-1 font-heading text-base text-primary-foreground shadow-primary',
                  step >= 2 && 'motion-safe:animate-stamp motion-safe:[animation-delay:250ms]',
                )}
              >
                +1 poäng
              </span>
            </p>
          )}
        </section>
      )}

      {/* Steg 3: de andra korten med namn, och ställningen. */}
      {step >= 3 && (
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {others.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2" aria-label="De andra korten">
              {others.map((submission, i) => {
                const player = state.players[owners[submission.key]]
                return (
                  <li key={submission.key}>
                    <FlipCard delay={i * 200}>
                      <AnswerCard
                        className="min-h-0"
                        footer={
                          player && (
                            <span className="inline-flex items-center gap-1.5">
                              <Emoji emoji={player.avatar} className="text-lg" />
                              {owners[submission.key] === me.id ? 'Ditt kort' : player.name}
                            </span>
                          )
                        }
                      >
                        {capitalize(submission.text)}
                      </AnswerCard>
                    </FlipCard>
                  </li>
                )
              })}
            </ul>
          )}
          <Standings state={state} meId={me.id} className={cn('animate-fade', others.length === 0 && 'lg:col-span-3')} />
        </div>
      )}

      <div className="text-foreground">
        <RevealFooter
          state={state}
          isHost={isHost}
          clockOffset={clockOffset}
          onNext={onNext}
          totalSeconds={kortkaosRules.seconds.reveal}
        />
      </div>
    </>
  )
}

function Standings({ state, meId, className }: { state: GameState; meId: string; className?: string }) {
  return (
    <section className={cn('space-y-3 rounded-lg border bg-card p-5 text-foreground shadow-soft', className)}>
      <h2 className="text-xl">Ställning</h2>
      <ol className="space-y-2">
        {rankPlayers(state).map((p) => (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2',
              p.place === 1 && p.score > 0 ? 'bg-sun-soft font-bold' : 'bg-muted',
            )}
          >
            <span className="w-5 text-center font-heading font-bold tabular-nums">{p.place}</span>
            <Emoji emoji={p.avatar} className="text-2xl" />
            <span className="flex-1 truncate">
              {p.name}
              {p.id === meId && <span className="font-normal text-muted-foreground"> (du)</span>}
            </span>
            <span className="font-heading font-bold tabular-nums">{p.score} p</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
