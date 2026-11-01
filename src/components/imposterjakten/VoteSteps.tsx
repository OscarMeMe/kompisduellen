import { useEffect, useState, type FormEvent } from 'react'
import { Check, Flag, Send, Vote, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hasFinePointer } from '@/lib/device'
import { MAX_CLUE_LENGTH, type ImposterOutcome, type ImposterTable } from '@/lib/imposterjakten'
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

// "Kim och Lisa", "Kim, Lisa och Ada".
function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} och ${names.at(-1)}`
}

// Spelarna i omgången som är med just nu. Den som lämnat räknas inte och går inte att rösta på.
function presentIds(table: ImposterTable, online: StepProps['online']): string[] {
  return table.order.filter((id) => online.some((player) => player.id === id))
}

// Två rader i mitten av bordet.
function Center({ title, line, tone }: { title: string; line?: string; tone?: string }) {
  return (
    <>
      <span className={cn('font-heading text-base leading-tight font-bold break-words sm:text-2xl sm:short:text-lg', tone)}>{title}</span>
      {line && <span className="text-xs font-semibold text-muted-foreground tabular-nums sm:text-base sm:short:text-xs">{line}</span>}
    </>
  )
}

// Det som står mitt på bordet, för faserna efter ledtrådsvarven.
export function TableCenter({ state, table, me, online, secondsLeft }: Omit<StepProps, 'inRound'>) {
  const players = presentIds(table, online).length
  if (table.accusation) {
    const name = state.players[table.accusation.accused]?.name ?? 'Spelaren'
    return <Center title={`Är ${name} impostern?`} line={`${table.accusation.answered} av ${table.accusation.voters} har svarat`} tone="text-primary-button" />
  }
  if (table.step === 'diskussion') {
    if (table.countdownStarted) {
      return <Center title={`${secondsLeft} s`} line={`${table.readyCount} av ${players} är redo`} tone="text-primary-button text-2xl sm:text-3xl" />
    }
    return <Center title={table.tied ? 'Lika röster!' : 'Diskutera!'} line={`${table.readyCount} av ${players} är redo`} />
  }
  if (table.step === 'rostning') {
    return <Center title={table.tied ? 'Ny omröstning' : 'Rösta!'} line={`${table.votedCount} av ${players} har röstat`} />
  }
  if (table.step === 'gissning') {
    const name = state.players[table.caught ?? '']?.name ?? 'Impostern'
    return <Center title="Impostern är fast!" line={table.caught === me.id ? 'Gissa ordet' : `${name} gissar…`} tone="text-primary-button" />
  }
  if (table.step === 'facit' && table.outcome) return <Center title={table.outcome.word} line="var ordet" />
  return null
}

// Anklaga!: alla utom den anklagade svarar i hemlighet ja eller nej, högst ACCUSE_SECONDS. Allt annat står still.
export function AccusationStep({ state, table, me, inRound, imposterCard, secondsLeft, onMove }: StepProps) {
  const accusation = table.accusation
  if (!accusation) return null
  const name = state.players[accusation.accused]?.name ?? 'Spelaren'
  const accuser = state.players[accusation.accuser]?.name ?? 'Någon'
  const answer = imposterCard?.accuseVote ?? null
  const accusedIsMe = accusation.accused === me.id
  return (
    <>
      <section {...SPLAT_SHIELD} className="sticky bottom-0 z-10 -mx-4 space-y-3 bg-background/95 px-4 py-2 text-center backdrop-blur-sm motion-safe:animate-fade sm:mx-0 sm:px-0">
        <p className="rounded-md bg-coral-soft px-4 py-3 font-semibold">
          {accuser} anklagar {accusedIsMe ? 'dig' : name}! {secondsLeft} s kvar.
        </p>
        {inRound && !accusedIsMe && answer === null && (
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => onMove({ type: 'accuseVote', yes: true })}>
              Ja
            </Button>
            <Button size="lg" variant="outline" onClick={() => onMove({ type: 'accuseVote', yes: false })}>
              Nej
            </Button>
          </div>
        )}
        {inRound && !accusedIsMe && answer !== null && (
          <p className="flex items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
            <Check className="size-5" aria-hidden />
            Du har svarat. Väntar på de andra…
          </p>
        )}
      </section>
    </>
  )
}

// Diskussionen: allas ord står kvar och var och en markerar när den har hört nog. Det är ingen röst. När mer än
// hälften är redo börjar en nedräkning, och då går markeringen inte att ta tillbaka. Efter lika röster diskuterar man
// igen, och sedan röstar alla bara mellan de lika placerade. Man kan peka ut någon (tryck på spelaren), men det är
// offentligt och ingen röst.

export function DiscussionStep({ state, table, inRound, imposterCard, online, onMove }: StepProps) {
  const ready = imposterCard?.ready ?? false
  const players = presentIds(table, online).length
  // En kort stund efter att diskussionen börjat går det inte att trycka, så att ett extra tryck på Klar inte räknas.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 1000)
    return () => clearTimeout(timer)
  }, [])
  const tiedNames = (table.tied ?? []).map((id) => state.players[id]?.name ?? 'någon')
  return (
    <>
      <section {...SPLAT_SHIELD} className="sticky bottom-0 z-10 -mx-4 space-y-3 bg-background/95 px-4 py-2 text-center backdrop-blur-sm motion-safe:animate-fade sm:mx-0 sm:px-0">
        {table.countdownStarted ? (
          <p className="rounded-md bg-sun-soft px-4 py-3 font-semibold">Sista chansen att försvara dig!</p>
        ) : table.tied ? (
          <p className="rounded-md bg-sun-soft px-3 py-2 text-sm font-semibold" role="status">
            Lika röster mellan {joinNames(tiedNames)}. Diskutera igen, sedan röstar ni bara mellan dem.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tryck på en spelare för att peka ut. <strong className="text-foreground">Peka ut är inte din röst.</strong>{' '}
            Omröstningen är hemlig.
          </p>
        )}
        {inRound &&
          (!ready ? (
            <Button size="lg" className="w-full" disabled={!settled} onClick={() => onMove({ type: 'ready', on: true })}>
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
        <p className="sr-only" role="status">
          {table.readyCount} av {players} är redo
        </p>
      </section>
    </>
  )
}

// Omröstningen: hemlig och utan tidsgräns. Var och en väljer en annan spelare och bekräftar. En bekräftad röst är låst.
// Efter lika röster går det bara att rösta på de lika placerade.
export function VotingStep({ state, table, online, inRound, imposterCard, choice, onMove }: StepProps & { choice: string | null }) {
  const myVote = imposterCard?.vote ?? null
  const present = presentIds(table, online)

  return (
    <>
      <section {...SPLAT_SHIELD} className="sticky bottom-0 z-10 -mx-4 space-y-3 bg-background/95 px-4 py-2 text-center backdrop-blur-sm motion-safe:animate-fade sm:mx-0 sm:px-0">
        {inRound &&
          (myVote ? (
            <p className="flex flex-wrap items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
              <Check className="size-5" aria-hidden />
              Du röstade på
              <PlayerTag state={state} id={myVote} />. Väntar på de andra…
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Rösten är hemlig.</p>
              <Button size="lg" className="w-full" disabled={!choice} onClick={() => choice && onMove({ type: 'vote', target: choice })}>
                <Vote aria-hidden />
                {choice ? `Bekräfta röst på ${state.players[choice]?.name ?? 'spelaren'}` : 'Bekräfta röst'}
              </Button>
            </>
          ))}
        <p className="sr-only" role="status">
          {table.votedCount} av {present.length} har röstat
        </p>
      </section>
    </>
  )
}

// Sista gissningen: impostern fick flest röster och gissar ordet. Ingen tidsgräns. De andra väntar. Bordet visar
// rösterna som pilar.
export function GuessStep({ table, me, onMove }: StepProps) {
  const mine = table.caught === me.id
  return (
    <>
      <p className="text-center text-sm text-muted-foreground">
        {mine ? 'Gissar du rätt får du en poäng.' : 'Ni får era poäng ändå, och gissar impostern rätt får den en poäng.'}
      </p>
      {mine && (
        <div className="rounded-lg border bg-card p-4 shadow-soft">
          <FinalGuess onMove={onMove} />
        </div>
      )}
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
  'gissade-ratt': { emoji: '🎯', text: 'Fast, men impostern gissade rätt!', tone: 'bg-sun-soft' },
  avbruten: { emoji: '⏸️', text: 'Omgången avbröts', tone: 'bg-muted' },
}

// Facit: vem som vann omgången, ordet, impostern, ledtråden (i Normal), gissningen, allas röster och poängen.
export function FacitStep({ state, table, me, isHost, onNextRound }: StepProps) {
  const outcome = table.outcome
  if (!outcome) return null
  const headline = HEADLINES[outcome.kind]
  // En avbruten omgång räknas inte, så då kommer en ny omgång med samma nummer.
  const completed = outcome.kind === 'avbruten' ? state.round - 1 : state.round
  const last = completed >= state.rounds
  const guessed = outcome.kind === 'gissade-ratt' || outcome.kind === 'gissade-fel'

  return (
    <section className="space-y-4 motion-safe:animate-fade">
      <div className={cn('rounded-lg border p-5 text-center shadow-soft motion-safe:animate-pop', headline.tone)}>
        <p className="font-heading text-3xl font-bold">
          <Emoji emoji={headline.emoji} className="mr-2 text-3xl" />
          {headline.text}
        </p>
        {outcome.reason && <p className="mt-2 font-semibold">{outcome.reason} Ingen fick poäng.</p>}
        {/* Lurig: impostern har inte vetat om det förrän nu. */}
        {outcome.imposterWord && outcome.kind === 'undan' && outcome.imposter === me.id && <p className="mt-2 font-semibold">Det var du hela tiden!</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 text-center shadow-soft-sm">
          <p className="text-sm font-semibold text-muted-foreground">Det hemliga ordet</p>
          <p className="font-heading text-2xl font-bold">{outcome.word}</p>
          {outcome.hint && <p className="mt-1 text-sm text-muted-foreground">Imposterns ledtråd: {outcome.hint}</p>}
          {outcome.imposterWord && <p className="mt-1 text-sm text-muted-foreground">Imposterns ord: {outcome.imposterWord}</p>}
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
