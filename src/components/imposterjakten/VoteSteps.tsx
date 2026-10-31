import { useState } from 'react'
import { Check, Vote } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { ClueList } from '@/components/imposterjakten/ClueList'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { tallyVotes, type ImposterTable } from '@/lib/imposterjakten'
import type { GameState } from '@/lib/match'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { cn } from '@/lib/utils'

type StepProps = ImposterViewProps & { table: ImposterTable; inRound: boolean; secondsLeft: number }

// En spelare med figur och namn. Två spelare kan heta samma sak, så figuren visas alltid.
function PlayerTag({ state, id, className }: { state: GameState; id: string; className?: string }) {
  const player = state.players[id]
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {player && <Emoji emoji={player.avatar} className="text-2xl" />}
      <span className="truncate font-bold">{player?.name ?? 'Någon'}</span>
    </span>
  )
}

function seconds(n: number): string {
  return `${n} ${n === 1 ? 'sekund' : 'sekunder'}`
}

// Diskussionen: allas ord står kvar och var och en markerar när den har hört nog. Det är ingen röst. När mer än
// hälften är redo börjar en nedräkning, och då går markeringen inte att ta tillbaka.
export function DiscussionStep({ state, table, me, inRound, imposterCard, secondsLeft, onMove }: StepProps) {
  const ready = imposterCard?.ready ?? false
  const players = table.order.length
  return (
    <>
      <ClueList state={state} table={table} meId={me.id} />
      <section {...SPLAT_SHIELD} className="space-y-3 text-center">
        {table.countdownStarted ? (
          <p className="rounded-md bg-sun-soft px-4 py-3 font-semibold" role="status">
            Omröstningen börjar om {seconds(secondsLeft)}. Sista chansen att försvara dig!
          </p>
        ) : (
          <p className="text-muted-foreground">Diskutera vem som bluffar. Tryck när du har hört nog, det är ingen röst.</p>
        )}
        {inRound &&
          (!ready ? (
            <Button size="lg" className="w-full" onClick={() => onMove({ type: 'ready', on: true })}>
              <Check aria-hidden />
              Redo att rösta
            </Button>
          ) : table.countdownStarted ? (
            <p className="flex items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
              <Check className="size-5" aria-hidden />
              Du är redo.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
                <Check className="size-5" aria-hidden />
                Du är redo att rösta.
              </p>
              <Button variant="outline" className="h-11" onClick={() => onMove({ type: 'ready', on: false })}>
                Ångra, jag vill diskutera mer
              </Button>
            </div>
          ))}
        <p className="text-sm font-semibold text-muted-foreground tabular-nums" role="status">
          {table.readyCount} av {players} är redo
        </p>
      </section>
    </>
  )
}

// Omröstningen: hemlig och utan tidsgräns. Var och en väljer en annan spelare och bekräftar. En bekräftad röst är låst.
export function VotingStep({ state, table, me, inRound, imposterCard, onMove }: StepProps) {
  const [choice, setChoice] = useState<string | null>(null)
  const myVote = imposterCard?.vote ?? null
  const candidates = table.order.filter((id) => id !== me.id)

  return (
    <section {...SPLAT_SHIELD} className="space-y-4">
      <h2 className="text-center text-2xl">Vem är impostern?</h2>
      {inRound &&
        (myVote ? (
          <p className="flex flex-wrap items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
            <Check className="size-5" aria-hidden />
            Du röstade på
            <PlayerTag state={state} id={myVote} />. Väntar på de andra…
          </p>
        ) : (
          <>
            <ul className="grid gap-2 sm:grid-cols-2" aria-label="Rösta på">
              {candidates.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={choice === id}
                    onClick={() => setChoice(id)}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left shadow-soft-sm transition outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
                      choice === id ? 'border-primary bg-coral-soft' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <PlayerTag state={state} id={id} className="flex-1" />
                    {choice === id && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full" disabled={!choice} onClick={() => choice && onMove({ type: 'vote', target: choice })}>
              <Vote aria-hidden />
              Bekräfta röst
            </Button>
          </>
        ))}
      <p className="text-center text-sm font-semibold text-muted-foreground tabular-nums" role="status">
        {table.votedCount} av {table.order.length} har röstat
      </p>
    </section>
  )
}

// Tillfälligt i steg 2: allas röster och vem som fick flest. Avslöjandet, sista gissningen och poängen kommer i nästa
// steg. Värden går vidare till nästa omgång.
export function ResultStep({ state, table, isHost, onNextRound }: StepProps) {
  const votes = table.votes ?? {}
  const { counts, top } = tallyVotes(votes)
  const last = state.round >= state.rounds

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-card p-5 text-center shadow-soft motion-safe:animate-pop">
        <p className="text-sm font-semibold text-muted-foreground">{top.length > 1 ? 'Lika röster' : 'Flest röster'}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-heading text-2xl">
          {top.length === 0
            ? 'Inga röster'
            : top.map((id, i) => (
                <span key={id} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-base font-normal text-muted-foreground">och</span>}
                  <PlayerTag state={state} id={id} />
                </span>
              ))}
        </p>
      </div>
      <ul className="space-y-2" aria-label="Allas röster">
        {table.order.map((voter) => (
          <li key={voter} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-4 py-3 shadow-soft-sm">
            <PlayerTag state={state} id={voter} />
            <span className="text-sm text-muted-foreground">röstade på</span>
            {votes[voter] ? <PlayerTag state={state} id={votes[voter]} /> : <span className="text-muted-foreground">ingen</span>}
            <span className="ml-auto rounded-full bg-muted px-3 py-1 text-sm font-semibold tabular-nums">
              {counts[voter] ?? 0} {(counts[voter] ?? 0) === 1 ? 'röst' : 'röster'}
            </span>
          </li>
        ))}
      </ul>
      <p className="rounded-md bg-sky-soft px-4 py-3 text-center font-semibold">
        Avslöjandet, sista gissningen och poängen kommer i nästa steg.
      </p>
      {isHost && (
        <Button size="lg" className="w-full" onClick={onNextRound}>
          {last ? 'Visa resultatet' : 'Nästa omgång'}
        </Button>
      )}
    </section>
  )
}
