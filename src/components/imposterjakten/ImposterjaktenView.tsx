import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, CircleStop, RefreshCw, Send } from 'lucide-react'
import { Bord } from '@/components/imposterjakten/Bord'
import { MyCard } from '@/components/imposterjakten/MyCard'
import { AccusationStep, DiscussionStep, FacitStep, GuessStep, VotingStep } from '@/components/imposterjakten/VoteSteps'
import { AnswerDock } from '@/components/lobby/AnswerDock'
import { RoundTimer, Wide } from '@/components/lobby/LobbyLayout'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import { ReactionBar } from '@/components/lobby/Reactions'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useReactions } from '@/hooks/useReactions'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import {
  canChangeWord,
  clueRound,
  CLUE_ROUNDS,
  ACCUSE_SECONDS,
  canAccuse,
  imposterInstruction,
  COUNTDOWN_SECONDS,
  currentTurn,
  MAX_CLUE_LENGTH,
  type ImposterTable,
} from '@/lib/imposterjakten'
import { hasFinePointer } from '@/lib/device'
import { playTurn } from '@/lib/ljud'
import { cn } from '@/lib/utils'

// Imposterjakten: hela omgången i en vy. Först läser alla sitt kort, sedan ger alla ett ord var i turordning, tre
// varv. Efter andra varvet kan vem som helst anklaga någon. Sedan diskuterar gruppen och röstar. Fångas impostern får den gissa ordet, och till sist visas facit med
// poängen. Kortet går att visa och dölja hela tiden. Värden kan avbryta omgången (inga poäng, den räknas inte).
export function ImposterjaktenView(props: ImposterViewProps) {
  const { state, me, isHost, imposterCard, clockOffset, onNewWord, onAbortRound } = props
  const [confirmAbort, setConfirmAbort] = useState(false)
  const table = state.imposter
  // Nedräkningen till omröstningen varnar på samma sätt som tiden i de andra spelen.
  const accusing = table?.accusation != null
  const totalSeconds = accusing ? ACCUSE_SECONDS : COUNTDOWN_SECONDS
  const countdown = useTimeWarning(state.deadline, clockOffset, totalSeconds, false)
  if (!table) return null
  const inRound = table.order.includes(me.id)
  const stepProps = { ...props, table, inRound, secondsLeft: countdown.secondsLeft }

  return (
    <Wide>
      {(accusing || (table.countdownStarted && table.step === 'diskussion')) && (
        <TimeWarningFrame warning={countdown.warning} secondsLeft={countdown.secondsLeft} />
      )}
      <RoundTimer
        state={state}
        clockOffset={clockOffset}
        label="Omgång"
        totalSeconds={totalSeconds}
        warning={accusing || table.step === 'diskussion' ? countdown.warning : 'normal'}
      />
      <MyCard mine={imposterCard} inRound={inRound} compact={table.step !== 'kort'} />
      <Instruction
        {...imposterInstruction(table, {
          id: me.id,
          name: (id) => state.players[id]?.name ?? 'Någon',
          ready: imposterCard?.ready ?? false,
          vote: imposterCard?.vote ?? null,
          accuseVote: imposterCard?.accuseVote ?? null,
          typing: props.typing,
          secondsLeft: countdown.secondsLeft,
        })}
      />

      {table.failedAccusation && !accusing && (
        <p className="rounded-md bg-sun-soft px-4 py-3 text-center font-semibold" role="status">
          Ingen majoritet. {state.players[table.failedAccusation]?.name ?? 'Spelaren'} är kvar, och spelet fortsätter.
        </p>
      )}
      {accusing && <AccusationStep {...stepProps} />}
      {!accusing && table.step === 'kort' && <CardStep {...props} table={table} inRound={inRound} />}
      {!accusing && table.step === 'ledtradar' && <CluesStep {...props} table={table} />}
      {!accusing && table.step === 'diskussion' && <DiscussionStep {...stepProps} />}
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

      {/* Kasta något: tryck på en spelare vid bordet. */}
      <ReactionBar />
    </Wide>
  )
}

// Den stora raden ovanför bordet om vad jag ska göra just nu. Fast höjd, så att bordet inte hoppar när texten byts.
function Instruction({ text, act }: { text: string; act: boolean }) {
  return (
    <p
      role="status"
      className={cn(
        'flex min-h-16 items-center justify-center text-center font-heading text-xl leading-tight font-bold text-balance sm:min-h-18 sm:text-3xl',
        act && 'text-primary-button',
      )}
    >
      {text}
    </p>
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

// Ett ord var i turordning, tre varv. Den som har tur skriver sitt ord (eller passar), eller säger det högt och
// trycker Klar. De andra ser vem som funderar.
function CluesStep({ state, table, me, online, isHost, imposterCard, typing, onMove, onTyping, onSkipTurn }: StepProps) {
  const turn = currentTurn(table)
  const myTurn = turn === me.id
  const thinker = turn ? state.players[turn] : undefined
  useYourTurn(myTurn)

  const line = (
    <p className="text-center text-sm font-semibold text-muted-foreground">
      Varv {clueRound(table)} av {CLUE_ROUNDS}
    </p>
  )
  const center = (
    <>
      <span className="text-sm font-semibold text-muted-foreground sm:text-base">
        Varv {clueRound(table)} av {CLUE_ROUNDS}
      </span>
      <span
        key={table.turn}
        className={cn('font-heading text-lg leading-tight font-bold break-words motion-safe:animate-pop sm:text-2xl', myTurn && 'text-primary-button')}
      >
        {myTurn ? 'Din tur!' : `${thinker?.name ?? 'Någon'}s tur`}
      </span>
    </>
  )

  return (
    <>
      <Bord state={state} table={table} meId={me.id} online={online} typing={typing} center={center} onMove={onMove} />
      {myTurn ? (
        <AnswerDock state={state} online={online} clockOffset={0} meId={me.id} locked={null} line={line}>
          {/* Ny ruta för varje tur, så att texten börjar om. */}
          {table.aloud ? (
            <SaidTurn key={table.turn} onDone={(word) => onMove(word ? { type: 'said', word } : { type: 'said' })} />
          ) : (
            <WriteTurn key={table.turn} onMove={onMove} onTyping={onTyping} rejectedAt={imposterCard?.rejectedAt ?? null} />
          )}
        </AnswerDock>
      ) : (
        <div className="sr-only">{line}</div>
      )}
      {canAccuse(table, me.id) && (
        <p className="text-center text-sm font-semibold text-muted-foreground">Misstänker du någon? Tryck på spelaren och välj Anklaga!</p>
      )}
      {/* Om den som har tur har glömt att trycka Klar. */}
      {isHost && table.aloud && !myTurn && (
        <Button variant="outline" className="mx-auto h-11" onClick={onSkipTurn}>
          Nästa
        </Button>
      )}
    </>
  )
}

// När det blir min tur: en kort vibration där det går och ett kort ljud som följer ljudknappen. En gång per tur.
function useYourTurn(myTurn: boolean) {
  const reactions = useReactions()
  const soundOn = reactions?.soundOn ?? false
  const was = useRef(myTurn)
  useEffect(() => {
    if (myTurn && !was.current) {
      if ('vibrate' in navigator) navigator.vibrate(80)
      if (soundOn) playTurn()
    }
    was.current = myTurn
  }, [myTurn, soundOn])
}

// Säg högt: den som har tur säger sitt ord och trycker Klar, eller var som helst på rutan utom i fältet. Vill man kan man
// först skriva in ordet, så att det syns i bubblan vid ens plats. Annars står det "✓ sa sitt".
function SaidTurn({ onDone }: { onDone: (word: string) => void }) {
  const [text, setText] = useState('')
  const sent = useRef(false)
  function done() {
    if (sent.current) return
    sent.current = true
    onDone(text.trim())
  }
  return (
    <form
      className="cursor-pointer space-y-3 text-center"
      onSubmit={(event) => {
        event.preventDefault()
        done()
      }}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('input')) done()
      }}
    >
      <Button type="button" size="lg" className="w-full">
        <Check aria-hidden />
        Klar
      </Button>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Skriv ordet om du vill"
        aria-label="Ditt ord, om du vill skriva in det"
        maxLength={MAX_CLUE_LENGTH}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="text-center"
      />
    </form>
  )
}

// Skriv i appen: exakt ett ord, eller Pass. Värden kontrollerar ordet och säger bara till om det inte går
// (rejectedAt ändras), utan att säga varför.
function WriteTurn({
  onMove,
  onTyping,
  rejectedAt,
}: {
  onMove: StepProps['onMove']
  onTyping: () => void
  rejectedAt: number | null
}) {
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
          // De andra ser "skriver…" (skickas högst varannan sekund, aldrig texten).
          if (event.target.value.trim()) onTyping()
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
