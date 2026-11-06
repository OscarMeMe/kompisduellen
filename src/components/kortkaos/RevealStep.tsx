import { useEffect, useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { Konfetti } from '@/components/Konfetti'
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
// 1) den färdiga meningen, 2) vem som spelade den och +1 poäng, 3) de andra korten, vem som spelade dem,
// ställningen och nedräkningen till nästa runda (med Nästa nu, reaktioner och kast).
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

// Avslöja i tre steg med en paus mellan, så att varje steg hinner läsas. På dator står meningen och vinnaren i mitten,
// och i steg 3 blir det två kolumner: till vänster meningen, vinnaren och de andra korten, till höger ställningen och
// nedräkningen. Då får allt plats utan att man scrollar på en bärbar dator.
export function RevealStep({ state, me, prompt, isHost, clockOffset, onNext }: RevealStepProps) {
  const table = state.cards!
  const owners = table.owners ?? {}
  const winning = table.submissions.find((s) => s.key === table.winner)
  const winnerId = table.winner ? owners[table.winner] : undefined
  const winner = winnerId ? state.players[winnerId] : undefined
  const others = table.submissions.filter((s) => s.key !== table.winner)
  const step = useRevealStep(state.deadline, clockOffset)

  return (
    <div className={cn('grid gap-4 lg:items-start lg:gap-5', step >= 3 && 'lg:grid-cols-[minmax(0,1fr)_21.5rem]')}>
      <div className={cn('flex flex-col gap-4 lg:gap-3', step < 3 && 'lg:mx-auto lg:w-full lg:max-w-2xl')}>
        {table.skipped || !winning ? (
          <div className="space-y-2 rounded-lg border bg-card p-6 text-center text-foreground shadow-soft animate-pop">
            <h1 className="text-2xl">Ingen poäng den här rundan</h1>
            <p className="text-muted-foreground">För få kort kom in, även på det nya frågekortet.</p>
          </div>
        ) : (
          <section aria-label="Vinnarkortet" aria-live="polite" className="flex flex-col gap-4 lg:gap-3">
            {table.judgeAsleep && (
              <p className="self-start rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground">
                Domaren somnade. Vinnaren lottades
              </p>
            )}
            {/* Steg 1: den färdiga meningen. Kortet vänds upp och vickar till. */}
            <FlipCard>
              <PromptCard
                prompt={prompt}
                answer={winning.text}
                className="lg:min-h-0 lg:short:min-h-0 motion-safe:animate-wiggle motion-safe:[animation-delay:600ms]"
              />
            </FlipCard>
            {/* Steg 2: vem som spelade kortet och +1. Platsen finns redan, så att inget hoppar. */}
            {winner && (
              <Winner
                visible={step >= 2}
                avatar={winner.avatar}
                text={winnerId === me.id ? 'Ditt kort vann!' : `${winner.name} vann rundan!`}
              />
            )}
          </section>
        )}

        {/* Steg 3: de andra korten med namn. */}
        {step >= 3 && others.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="De andra korten">
            {others.map((submission, i) => {
              const player = state.players[owners[submission.key]]
              return (
                <li key={submission.key}>
                  <FlipCard delay={i * 200}>
                    <AnswerCard
                      className="min-h-0 lg:gap-2 lg:p-3 lg:text-base"
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
      </div>

      {/* Steg 3: ställningen och nedräkningen till nästa runda, med Nästa nu, reaktioner och kast. */}
      {step >= 3 && (
        <div className="flex flex-col gap-3 text-foreground motion-safe:animate-pop motion-reduce:animate-fade">
          <Standings state={state} meId={me.id} />
          <RevealFooter
            state={state}
            isHost={isHost}
            clockOffset={clockOffset}
            onNext={onNext}
            totalSeconds={kortkaosRules.seconds.reveal}
          />
        </div>
      )}
    </div>
  )
}

// Vinnaren i rundan: figuren hoppar, konfetti regnar och +1 poäng stämplas dit.
function Winner({ visible, avatar, text }: { visible: boolean; avatar: string; text: string }) {
  return (
    <div
      className={cn(
        'relative flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg bg-mint-soft px-5 py-3 text-foreground shadow-soft ring-4 ring-sun',
        visible ? 'motion-safe:animate-pop motion-reduce:animate-fade' : 'invisible',
      )}
    >
      {visible && <Konfetti />}
      <Emoji emoji={avatar} className={cn('text-5xl', visible && 'motion-safe:animate-hop')} />
      <p className="font-heading text-2xl font-bold sm:text-3xl">{text}</p>
      <span
        className={cn(
          '-rotate-6 rounded-full bg-primary px-4 py-1.5 font-heading text-xl font-bold text-primary-foreground shadow-primary sm:text-2xl',
          visible && 'motion-safe:animate-stamp motion-safe:[animation-delay:300ms]',
        )}
      >
        +1 poäng
      </span>
    </div>
  )
}

function Standings({ state, meId }: { state: GameState; meId: string }) {
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4 text-foreground shadow-soft lg:p-3">
      <h2 className="text-lg lg:text-base">Ställning</h2>
      <ol className="space-y-1.5 lg:space-y-1">
        {rankPlayers(state).map((p) => (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-1.5 lg:py-1',
              p.place === 1 && p.score > 0 ? 'bg-sun-soft font-bold' : 'bg-muted',
            )}
          >
            <span className="w-5 text-center font-heading font-bold tabular-nums">{p.place}</span>
            <Emoji emoji={p.avatar} className="text-xl" />
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
