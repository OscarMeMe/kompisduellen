import { useState, type FormEvent } from 'react'
import { Check, CircleStop, RefreshCw, Send } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { ClueList } from '@/components/imposterjakten/ClueList'
import { MyCard } from '@/components/imposterjakten/MyCard'
import { DiscussionStep, FacitStep, GuessStep, VotingStep } from '@/components/imposterjakten/VoteSteps'
import { AnswerDock } from '@/components/lobby/AnswerDock'
import { ThrowBar } from '@/components/lobby/Kast'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import { ReactionBar } from '@/components/lobby/Reactions'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import {
  canChangeWord,
  clueRound,
  CLUE_ROUNDS,
  COUNTDOWN_SECONDS,
  currentTurn,
  MAX_CLUE_LENGTH,
  type ImposterTable,
} from '@/lib/imposterjakten'
import { hasFinePointer } from '@/lib/device'
import { cn } from '@/lib/utils'

// Imposterjakten: hela omgången i en vy. Först läser alla sitt kort, sedan ger alla ett ord var i turordning, två
// varv. Sedan diskuterar gruppen och röstar. Fångas impostern får den gissa ordet, och till sist visas facit med
// poängen. Kortet går att visa och dölja hela tiden. Värden kan avbryta omgången (inga poäng, den räknas inte).
export function ImposterjaktenView(props: ImposterViewProps) {
  const { state, me, isHost, imposterCard, clockOffset, onNewWord, onAbortRound } = props
  const [confirmAbort, setConfirmAbort] = useState(false)
  const table = state.imposter
  // Nedräkningen till omröstningen varnar på samma sätt som tiden i de andra spelen.
  const countdown = useTimeWarning(state.deadline, clockOffset, COUNTDOWN_SECONDS, false)
  if (!table) return null
  const inRound = table.order.includes(me.id)
  const stepProps = { ...props, table, inRound, secondsLeft: countdown.secondsLeft }

  return (
    <Wide>
      {table.countdownStarted && table.step === 'diskussion' && (
        <TimeWarningFrame warning={countdown.warning} secondsLeft={countdown.secondsLeft} />
      )}
      <RoundTimer
        state={state}
        clockOffset={clockOffset}
        label="Omgång"
        totalSeconds={COUNTDOWN_SECONDS}
        warning={table.step === 'diskussion' ? countdown.warning : 'normal'}
      />
      <MyCard mine={imposterCard} inRound={inRound} compact={table.step !== 'kort'} />

      {table.step === 'kort' && <CardStep {...props} table={table} inRound={inRound} />}
      {table.step === 'ledtradar' && <CluesStep {...props} table={table} />}
      {table.step === 'diskussion' && <DiscussionStep {...stepProps} />}
      {table.step === 'rostning' && <VotingStep {...stepProps} />}
      {table.step === 'gissning' && <GuessStep {...stepProps} />}
      {table.step === 'facit' && <FacitStep {...stepProps} />}

      {/* Värden kan byta ord om någon inte förstår det, men bara innan första associationen. */}
      {isHost && canChangeWord(table) && (
        <Button variant="ghost" className="mx-auto text-muted-foreground" onClick={onNewWord}>
          <RefreshCw aria-hidden />
          Nytt ord
        </Button>
      )}
      {/* Om någon dröjer eller ordet avslöjas av misstag. Omgången ger inga poäng och räknas inte. */}
      {isHost && table.step !== 'facit' && (
        <Button variant="ghost" className="mx-auto text-muted-foreground" onClick={() => setConfirmAbort(true)}>
          <CircleStop aria-hidden />
          Avbryt omgången
        </Button>
      )}
      <AbortRoundDialog
        open={confirmAbort}
        onStay={() => setConfirmAbort(false)}
        onAbort={() => {
          setConfirmAbort(false)
          onAbortRound()
        }}
      />

      <div className="space-y-3">
        <ReactionBar />
        <ThrowBar />
      </div>
    </Wide>
  )
}

type StepProps = ImposterViewProps & { table: ImposterTable }

// Alla läser sitt kort. När alla tryckt Jag har läst (eller värden trycker Starta ändå) börjar ledtrådsvarven.
function CardStep({ table, me, isHost, inRound, onMove, onStartAnyway }: StepProps & { inRound: boolean }) {
  const read = table.read.includes(me.id)
  const present = table.order.length
  return (
    <section className="space-y-3 text-center">
      {inRound &&
        (read ? (
          <p className="flex items-center justify-center gap-2 rounded-md bg-mint-soft px-4 py-3 font-semibold">
            <Check className="size-5" aria-hidden />
            Du har läst. Väntar på de andra…
          </p>
        ) : (
          <Button size="lg" className="w-full" onClick={() => onMove({ type: 'read' })}>
            Jag har läst
          </Button>
        ))}
      <p className="text-sm font-semibold text-muted-foreground tabular-nums" role="status">
        {table.read.length} av {present} har läst
      </p>
      {isHost && table.read.length < present && (
        <Button variant="outline" className="h-11" onClick={onStartAnyway}>
          Starta ändå
        </Button>
      )}
    </section>
  )
}

// Ett ord var i turordning, två varv. Den som har tur skriver sitt ord (eller passar), eller säger det högt och
// trycker Klar. De andra ser vem som funderar.
function CluesStep({ state, table, me, online, imposterCard, onMove }: StepProps) {
  const turn = currentTurn(table)
  const myTurn = turn === me.id
  const thinker = turn ? state.players[turn] : undefined

  const line = (
    <p className="text-center text-sm font-semibold text-muted-foreground">
      Varv {clueRound(table)} av {CLUE_ROUNDS}
      {myTurn ? ' · Din tur!' : thinker ? ` · ${thinker.name} funderar…` : ''}
    </p>
  )

  return (
    <>
      <ClueList state={state} table={table} meId={me.id} />
      {myTurn ? (
        <AnswerDock state={state} online={online} clockOffset={0} meId={me.id} locked={null} line={line}>
          {/* Ny ruta för varje tur, så att texten börjar om. */}
          {table.aloud ? (
            <SaidTurn onDone={() => onMove({ type: 'said' })} />
          ) : (
            <WriteTurn key={table.turn} onMove={onMove} rejectedAt={imposterCard?.rejectedAt ?? null} />
          )}
        </AnswerDock>
      ) : (
        <div className="space-y-1 text-center">
          {line}
          {thinker && (
            <p className="flex items-center justify-center gap-2 font-heading text-lg font-bold">
              <Emoji emoji={thinker.avatar} className="text-2xl" />
              {thinker.name} funderar…
            </p>
          )}
        </div>
      )}
    </>
  )
}

// Säg högt: appen visar bara vems tur det är, och den som har tur trycker Klar när ordet är sagt.
function SaidTurn({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-3 text-center">
      <p className="rounded-full bg-primary px-3 py-1 font-heading text-sm font-bold text-primary-foreground motion-safe:animate-pop">
        Din tur! Säg ditt ord högt.
      </p>
      <Button size="lg" className="w-full" onClick={onDone}>
        <Check aria-hidden />
        Klar
      </Button>
    </div>
  )
}

// Skriv i appen: exakt ett ord, eller Pass. Värden kontrollerar ordet och säger bara till om det inte går
// (rejectedAt ändras), utan att säga varför.
function WriteTurn({ onMove, rejectedAt }: { onMove: StepProps['onMove']; rejectedAt: number | null }) {
  const [text, setText] = useState('')
  // Ett avvisat ord som redan fanns när turen började, eller som man har börjat skriva om, visas inte.
  const [seenRejection, setSeenRejection] = useState(rejectedAt)
  const rejected = rejectedAt !== null && rejectedAt !== seenRejection
  const trimmed = text.trim()
  const spaces = /\s/.test(trimmed)
  const valid = trimmed.length > 0 && !spaces && trimmed.length <= MAX_CLUE_LENGTH

  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) onMove({ type: 'clue', word: trimmed })
  }

  return (
    <form onSubmit={submit} className="space-y-2 sm:space-y-3">
      <Input
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setSeenRejection(rejectedAt)
        }}
        aria-invalid={rejected}
        placeholder="Ett ord som hör ihop med ordet"
        aria-label="Ditt ord"
        maxLength={MAX_CLUE_LENGTH}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus={hasFinePointer()}
        className="text-center font-heading text-2xl font-bold"
      />
      <p
        className={cn('min-h-5 text-center text-sm', spaces || rejected ? 'font-semibold text-primary' : 'text-muted-foreground')}
        role="status"
      >
        {spaces ? 'Skriv ett ord, utan mellanslag.' : rejected ? 'Det ordet går inte. Välj ett annat.' : 'Sammansatta ord går bra.'}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={!valid}>
          <Send aria-hidden />
          Skicka
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={() => onMove({ type: 'pass' })}>
          Pass
        </Button>
      </div>
    </form>
  )
}

// Frågan innan värden avbryter omgången.
function AbortRoundDialog({ open, onStay, onAbort }: { open: boolean; onStay: () => void; onAbort: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent className="gap-5 sm:max-w-sm" showCloseButton={false}>
        <div className="space-y-2 text-center">
          <DialogTitle className="text-2xl leading-tight font-bold">Avbryta omgången?</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Ingen får poäng och omgången räknas inte. Ni kör en ny omgång med ett nytt ord.
          </DialogDescription>
        </div>
        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={onStay}>
            Fortsätt spela
          </Button>
          <Button size="lg" variant="outline" onClick={onAbort}>
            Avbryt omgången
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
