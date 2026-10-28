import { Emoji } from '@/components/Emoji'
import { AnswerCard, Sentence } from '@/components/kort/PlayingCard'
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

// Avslöja: först vinnarkortet och vem som spelade det, sedan vem som spelade de andra korten.
export function RevealStep({ state, me, prompt, isHost, clockOffset, onNext }: RevealStepProps) {
  const table = state.cards!
  const owners = table.owners ?? {}
  const winning = table.submissions.find((s) => s.key === table.winner)
  const winnerId = table.winner ? owners[table.winner] : undefined
  const winner = winnerId ? state.players[winnerId] : undefined
  const others = table.submissions.filter((s) => s.key !== table.winner)

  return (
    <>
      {table.skipped || !winning ? (
        <div className="space-y-2 rounded-lg border bg-card p-6 text-center shadow-soft animate-pop">
          <h1 className="text-2xl">Ingen poäng den här rundan</h1>
          <p className="text-muted-foreground">För få kort kom in, även på det nya frågekortet.</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-mint-soft p-6 shadow-soft animate-pop sm:p-8">
          {table.judgeAsleep && (
            <p className="inline-flex rounded-full bg-card px-3 py-1 text-sm font-semibold">
              Domaren somnade. Vinnaren lottades
            </p>
          )}
          <p className="font-heading text-2xl leading-snug font-bold break-words sm:text-3xl">
            <Sentence prompt={prompt} answer={winning.text} />
          </p>
          {winner && (
            <p className="flex items-center gap-2 text-lg font-bold">
              <Emoji emoji={winner.avatar} className="text-3xl" />
              {winnerId === me.id ? 'Ditt kort vann! +1 poäng' : `${winner.name} spelade kortet · +1 poäng`}
            </p>
          )}
        </div>
      )}

      {others.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="De andra korten">
          {others.map((submission, i) => {
            const player = state.players[owners[submission.key]]
            return (
              <li key={submission.key} className="animate-pop" style={{ animationDelay: `${600 + i * 250}ms` }}>
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
              </li>
            )
          })}
        </ul>
      )}

      <Standings state={state} meId={me.id} />

      <RevealFooter
        state={state}
        isHost={isHost}
        clockOffset={clockOffset}
        onNext={onNext}
        totalSeconds={kortkaosRules.seconds.reveal}
      />
    </>
  )
}

function Standings({ state, meId }: { state: GameState; meId: string }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-5 shadow-soft">
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
