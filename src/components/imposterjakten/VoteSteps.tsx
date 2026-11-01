import { useState, type FormEvent } from 'react'
import { Check, Flag, Send, Vote, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { ClueList } from '@/components/imposterjakten/ClueList'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hasFinePointer } from '@/lib/device'
import { MAX_CLUE_LENGTH, tallyVotes, type ImposterOutcome, type ImposterTable } from '@/lib/imposterjakten'
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

// Flera spelare i en rad: "Kim och Lisa", "Kim, Lisa och Ada".
function PlayerTags({ state, ids }: { state: GameState; ids: readonly string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {ids.map((id, i) => (
        <span key={id} className="inline-flex items-center gap-2">
          {i > 0 && <span className="font-normal text-muted-foreground">{i === ids.length - 1 ? 'och' : ','}</span>}
          <PlayerTag state={state} id={id} />
        </span>
      ))}
    </span>
  )
}

function seconds(n: number): string {
  return `${n} ${n === 1 ? 'sekund' : 'sekunder'}`
}

// Diskussionen: allas ord står kvar och var och en markerar när den har hört nog. Det är ingen röst. När mer än
// hälften är redo börjar en nedräkning, och då går markeringen inte att ta tillbaka. Efter lika röster diskuterar man
// igen, och sedan röstar alla bara mellan de lika placerade.
// Spelarna i omgången som är med just nu. Den som lämnat räknas inte och går inte att rösta på.
function presentIds(table: ImposterTable, online: StepProps['online']): string[] {
  return table.order.filter((id) => online.some((player) => player.id === id))
}

export function DiscussionStep({ state, table, me, online, inRound, imposterCard, secondsLeft, onMove }: StepProps) {
  const ready = imposterCard?.ready ?? false
  const players = presentIds(table, online).length
  return (
    <>
      {table.tied && (
        <p className="rounded-lg border bg-sun-soft px-4 py-3 text-center font-semibold shadow-soft-sm motion-safe:animate-pop">
          <span className="mb-1 block">Lika röster mellan</span>
          <PlayerTags state={state} ids={table.tied} />
          <span className="mt-1 block font-normal">Diskutera igen, sedan röstar ni bara mellan dem.</span>
        </p>
      )}
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
// Efter lika röster går det bara att rösta på de lika placerade.
export function VotingStep({ state, table, me, online, inRound, imposterCard, onMove }: StepProps) {
  const [choice, setChoice] = useState<string | null>(null)
  const myVote = imposterCard?.vote ?? null
  const present = presentIds(table, online)
  const candidates = (table.tied ?? table.order).filter((id) => id !== me.id && present.includes(id))

  return (
    <section {...SPLAT_SHIELD} className="space-y-4">
      <h2 className="text-center text-2xl">{table.tied ? 'Ny omröstning. Vem är impostern?' : 'Vem är impostern?'}</h2>
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
        {table.votedCount} av {present.length} har röstat
      </p>
    </section>
  )
}

// Allas röster: hur många röster var och en fick, och vem som röstade på vem.
function VoteList({ state, table }: { state: GameState; table: ImposterTable }) {
  const votes = table.votes ?? {}
  const { counts } = tallyVotes(votes)
  const voters = table.order.filter((id) => votes[id])
  if (voters.length === 0) return null
  const received = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  return (
    <section className="space-y-2" aria-label="Allas röster">
      <p className="flex flex-wrap justify-center gap-2">
        {received.map((id) => (
          <span key={id} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 shadow-soft-sm">
            <PlayerTag state={state} id={id} />
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {counts[id]} {counts[id] === 1 ? 'röst' : 'röster'}
            </span>
          </span>
        ))}
      </p>
      <ul className="space-y-2">
        {voters.map((voter) => (
          <li key={voter} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-4 py-3 shadow-soft-sm">
            <PlayerTag state={state} id={voter} />
            <span className="text-sm text-muted-foreground">röstade på</span>
            <PlayerTag state={state} id={votes[voter]} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// Sista gissningen: impostern fick flest röster och gissar ordet. Ingen tidsgräns. De andra väntar.
export function GuessStep({ state, table, me, onMove }: StepProps) {
  const caught = table.caught
  const mine = caught === me.id
  return (
    <>
      <div className="rounded-lg border bg-card p-5 text-center shadow-soft motion-safe:animate-pop">
        <p className="font-heading text-2xl font-bold">Impostern är fast!</p>
        {caught && (
          <p className="mt-2 flex justify-center">
            <PlayerTag state={state} id={caught} />
          </p>
        )}
        <p className="mt-2 text-muted-foreground" role="status">
          {mine ? 'Gissa det hemliga ordet. Gissar du rätt får du ändå en poäng.' : 'Om impostern gissar ordet får den ändå en poäng.'}
        </p>
      </div>
      {mine ? (
        <div className="rounded-lg border bg-card p-4 shadow-soft">
          <FinalGuess onMove={onMove} />
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 font-heading text-lg font-bold">
          {caught && <Emoji emoji={state.players[caught]?.avatar ?? '🙂'} className="text-2xl" />}
          {state.players[caught ?? '']?.name ?? 'Impostern'} gissar…
        </p>
      )}
      <VoteList state={state} table={table} />
    </>
  )
}

function FinalGuess({ onMove }: { onMove: StepProps['onMove'] }) {
  const [word, setWord] = useState('')
  const [sent, setSent] = useState(false)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!word.trim() || sent) return
    setSent(true)
    onMove({ type: 'guess', word: word.trim() })
  }
  return (
    <form onSubmit={submit} className="space-y-2" {...SPLAT_SHIELD}>
      <label htmlFor="sista-gissningen" className="sr-only">
        Det hemliga ordet
      </label>
      <Input
        id="sista-gissningen"
        value={word}
        onChange={(event) => setWord(event.target.value.slice(0, MAX_CLUE_LENGTH))}
        placeholder="Det hemliga ordet"
        autoComplete="off"
        autoFocus={hasFinePointer()}
        disabled={sent}
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button type="submit" size="lg" disabled={!word.trim() || sent}>
          <Send aria-hidden />
          Bekräfta gissning
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={sent}
          onClick={() => {
            setSent(true)
            onMove({ type: 'giveUp' })
          }}
        >
          <Flag aria-hidden />
          Ge upp
        </Button>
      </div>
    </form>
  )
}

const HEADLINES: Record<ImposterOutcome['kind'], { emoji: string; text: string; tone: string }> = {
  'gissade-fel': { emoji: '🎉', text: 'De oskyldiga vann!', tone: 'bg-mint-soft' },
  'gav-upp': { emoji: '🎉', text: 'De oskyldiga vann!', tone: 'bg-mint-soft' },
  undan: { emoji: '🕵️', text: 'Impostern kom undan!', tone: 'bg-coral-soft' },
  'gissade-ratt': { emoji: '🎯', text: 'Impostern gissade rätt!', tone: 'bg-sun-soft' },
  avbruten: { emoji: '⏸️', text: 'Omgången avbröts', tone: 'bg-muted' },
}

// Facit: vem som vann omgången, ordet, impostern, ledtråden (i Normal), gissningen, allas röster och poängen.
export function FacitStep({ state, table, isHost, onNextRound }: StepProps) {
  const outcome = table.outcome
  if (!outcome) return null
  const headline = HEADLINES[outcome.kind]
  // En avbruten omgång räknas inte, så då kommer en ny omgång med samma nummer.
  const completed = outcome.kind === 'avbruten' ? state.round - 1 : state.round
  const last = completed >= state.rounds
  const guessed = outcome.kind === 'gissade-ratt' || outcome.kind === 'gissade-fel'

  return (
    <section className="space-y-4">
      <div className={cn('rounded-lg border p-5 text-center shadow-soft motion-safe:animate-pop', headline.tone)}>
        <p className="font-heading text-3xl font-bold">
          <Emoji emoji={headline.emoji} className="mr-2 text-3xl" />
          {headline.text}
        </p>
        {outcome.reason && <p className="mt-2 font-semibold">{outcome.reason} Ingen fick poäng.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 text-center shadow-soft-sm">
          <p className="text-sm font-semibold text-muted-foreground">Det hemliga ordet</p>
          <p className="font-heading text-2xl font-bold">{outcome.word}</p>
          {outcome.hint && <p className="mt-1 text-sm text-muted-foreground">Imposterns ledtråd: {outcome.hint}</p>}
        </div>
        <div className="rounded-lg border bg-card p-4 text-center shadow-soft-sm">
          <p className="text-sm font-semibold text-muted-foreground">Impostern var</p>
          <p className="mt-1 flex justify-center">
            <PlayerTag state={state} id={outcome.imposter} />
          </p>
          {guessed && (
            <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
              Gissade "{outcome.guess}"
              {outcome.kind === 'gissade-ratt' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5">
                  <Check className="size-4" aria-hidden />
                  Rätt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5">
                  <X className="size-4" aria-hidden />
                  Fel
                </span>
              )}
            </p>
          )}
          {outcome.kind === 'gav-upp' && <p className="mt-1 text-sm font-semibold">Gav upp</p>}
        </div>
      </div>

      <VoteList state={state} table={table} />
      <PointsList state={state} table={table} outcome={outcome} />

      {isHost && (
        <Button size="lg" className="w-full" onClick={onNextRound}>
          {last ? 'Visa resultatet' : 'Nästa omgång'}
        </Button>
      )}
    </section>
  )
}

// Poängen för omgången ("+2" som stiger) och totalen, för alla i omgången.
function PointsList({ state, table, outcome }: { state: GameState; table: ImposterTable; outcome: ImposterOutcome }) {
  const ids = [...table.order].sort((a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0))
  return (
    <ul className="space-y-2" aria-label="Poäng">
      {ids.map((id) => {
        const gained = outcome.points[id] ?? 0
        return (
          <li key={id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft-sm">
            <PlayerTag state={state} id={id} className="flex-1" />
            <span className={cn('relative font-heading font-bold tabular-nums', gained > 0 ? 'text-primary' : 'text-muted-foreground')}>
              {gained > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-4 right-0 opacity-0 motion-safe:animate-rise motion-reduce:hidden"
                >
                  +{gained}
                </span>
              )}
              {gained > 0 ? `+${gained}` : '0'}
            </span>
            <span className="w-20 text-right text-sm font-semibold text-muted-foreground tabular-nums">
              {state.scores[id] ?? 0} totalt
            </span>
          </li>
        )
      })}
    </ul>
  )
}
