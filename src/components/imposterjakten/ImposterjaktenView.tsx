import { ImposterRegler } from '@/components/imposterjakten/ImposterRegler'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, Flag, Undo2, Check, CircleHelp, CircleStop, List, LogOut, Menu, RefreshCw, Send } from 'lucide-react'
import { AllaOrd, Bord } from '@/components/imposterjakten/Bord'
import { MyCard } from '@/components/imposterjakten/MyCard'
import { AccusationStep, DiscussionStep, FacitStep, GuessStep, VotingStep, TableCenter } from '@/components/imposterjakten/VoteSteps'
import { SoundControl } from '@/components/lobby/LjudKnapp'
import { TimeWarningFrame } from '@/components/lobby/TimeWarningFrame'
import { ReactionBar } from '@/components/lobby/Reactions'
import type { ImposterViewProps } from '@/components/lobby/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/useCountdown'
import { useGameMusic } from '@/hooks/useGameMusic'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { useReactions } from '@/hooks/useReactions'
import { useTimeWarning } from '@/hooks/useTimeWarning'
import {
  canChangeWord,
  clueRound,
  clueRoundsFor,
  endsAfterThisRound,
  ACCUSE_SECONDS,
  canAccuse,
  imposterInstruction,
  voteCandidates,
  COUNTDOWN_SECONDS,
  currentTurn,
  MAX_CLUE_LENGTH,
  hostSkipAt,
  hostSkipKind,
  type ImposterTable,
} from '@/lib/imposterjakten'
import type { GameState } from '@/lib/match'
import { latestClue } from '@/lib/bord'
import { hasFinePointer } from '@/lib/device'
import { loadSoundOn, playTurn, saveSoundOn } from '@/lib/ljud'
import { fitWordSize } from '@/lib/ordstorlek'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { cn } from '@/lib/utils'

const PATTERN = '/images/imposterjakten/monster-mork.webp'
const LOGO = '/images/imposterjakten/logga-800.webp'

// Imposterjakten: hela omgången i en vy, i stilen Nattspanarna. Under matchen tar spelplanen hela skärmen, på det mörka
// mönstret: en rad överst med reglerna, vad jag ska göra just nu, ljudet och menyn, bordet under lampans sken i mitten,
// och svarsdelen på krämvitt papper i nederkant (på bred skärm i en egen kolumn till höger, med allas ord som en lista).
// Först läser alla sitt kort, sedan ger alla ett ord var i turordning, två eller tre varv. Efter näst sista varvet kan
// vem som helst anklaga någon. Sedan diskuterar gruppen och röstar. Fångas impostern får den gissa ordet, och till sist
// visas facit med poängen. Kortet går att visa och dölja hela tiden. Värdens val (Nytt ord, avsluta efter omgången,
// avbryta omgången och tillbaka till väntrummet) ligger i menyn.
export function ImposterjaktenView(props: ImposterViewProps) {
  const { state, me, isHost, imposterCard, clockOffset, onNewWord, onAbortRound, onEndAfterRound } = props
  const [confirmAbort, setConfirmAbort] = useState(false)
  const [rules, setRules] = useState(false)
  const [menu, setMenu] = useState(false)
  const [words, setWords] = useState(false)
  useLockPageScroll()
  // Matchens musik, lågt så att den inte stör när man pratar. Tonas över från väntrummets spår.
  useGameMusic('imposter', 'match')
  const keyboard = useKeyboardInset()
  // Svarsdelen skrollar för sig när innehållet inte får plats (t.ex. facit med tio spelare på en liten telefon). Då
  // visas en liten etikett, så att det syns att det finns mer nedanför.
  const dockRef = useRef<HTMLElement>(null)
  const moreBelow = useMoreBelow(dockRef)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const table = state.imposter
  // Vem jag tänker rösta på. Valet gäller bara den omröstning det gjordes i.
  const voteRound = `${table?.step}-${table?.tied?.join() ?? ''}-${state.round}`
  const [picked, setPicked] = useState<{ round: string; id: string } | null>(null)
  const choice = picked?.round === voteRound ? picked.id : null
  // Nedräkningen till omröstningen varnar på samma sätt som tiden i de andra spelen.
  const accusing = table?.accusation != null
  const totalSeconds = accusing ? ACCUSE_SECONDS : COUNTDOWN_SECONDS
  const countdown = useTimeWarning(state.deadline, clockOffset, totalSeconds, false)
  const { progress } = useCountdown(state.deadline, clockOffset, totalSeconds)
  if (!table) return null
  const inRound = table.order.includes(me.id)
  const stepProps = { ...props, table, inRound, secondsLeft: countdown.secondsLeft }
  const counting = state.deadline !== null && (accusing || (table.countdownStarted && table.step === 'diskussion'))
  const instruction = imposterInstruction(table, {
    id: me.id,
    name: (id) => state.players[id]?.name ?? 'Någon',
    ready: imposterCard?.ready ?? false,
    vote: imposterCard?.vote ?? null,
    accuseVote: imposterCard?.accuseVote ?? null,
    typing: props.typing,
    secondsLeft: countdown.secondsLeft,
  })

  return (
    <div
      data-tema="nattspanarna"
      data-spel="imposterjakten"
      // h-dvh: spelplanen följer skärmens höjd även när Safaris verktygsfält döljs eller visas. inset-0 är reserven för
      // webbläsare som inte förstår dvh. Med tangentbordet uppe krymper spelplanen, så att svarsdelen ligger ovanför det.
      className="fixed inset-0 z-10 flex h-dvh flex-col overflow-hidden overscroll-none bg-background bg-repeat pt-[env(safe-area-inset-top)] text-foreground"
      style={{ backgroundImage: `url(${PATTERN})`, backgroundSize: '256px 256px', paddingBottom: keyboard }}
    >
      {counting && <TimeWarningFrame warning={countdown.warning} secondsLeft={countdown.secondsLeft} />}

      {/* Raden överst: reglerna, vad JAG ska göra just nu (lampgul när det är något jag ska göra), ljudet och menyn. */}
      <div className="relative z-30 flex shrink-0 items-center gap-1.5 px-2 pt-1.5 pb-1 sm:gap-2 sm:px-3 sm:pt-2.5">
        <RoundButton label="Så spelas det" onClick={() => setRules(true)}>
          <CircleHelp aria-hidden className="size-5" />
        </RoundButton>
        <p
          role="status"
          className={cn(
            'flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-3xl px-3 py-1 text-center font-heading text-[13px] leading-tight font-bold text-balance text-[var(--natt)] sm:min-h-12 sm:text-xl',
            instruction.act ? 'bg-[var(--natt-lampa)] shadow-[0_0_22px_color-mix(in_oklch,var(--natt-lampa)_55%,transparent)]' : 'bg-[var(--natt-kram)]',
          )}
        >
          {instruction.text}
        </p>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-sm">
          <SoundControl soundOn={soundOn} onSoundOn={(on) => (reactions ? reactions.setSoundOn(on) : saveSoundOn(on))} music />
        </span>
        <RoundButton label="Meny" onClick={() => setMenu(true)}>
          <Menu aria-hidden className="size-5" />
        </RoundButton>
      </div>

      {/* Under raden: loggan (inte på mobil, där platsen behövs), omgången och varvet som tydliga brickor, och på smal
          skärm knappen till listan med allas ord. Raden bryts aldrig, så att bordet inte hoppar. */}
      <div className="relative z-30 flex shrink-0 items-center justify-center gap-1.5 px-2 pt-0.5 sm:gap-2.5 sm:px-3 sm:pt-1">
        <img src={LOGO} alt="Imposterjakten" width={800} height={245} className="h-7 w-auto max-sm:hidden lg:h-8" />
        <RoundBadges state={state} table={table} />
        {table.clues.length > 0 && (
          <button
            type="button"
            className="flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 text-xs font-bold text-foreground sm:text-sm lg:hidden"
            onClick={() => setWords(true)}
          >
            <List aria-hidden className="size-3.5" />
            Allas ord
          </button>
        )}
      </div>
      {/* Tidsstapeln för nedräkningen till omröstningen och för en anklagelse. Platsen finns alltid, så att bordet inte hoppar. */}
      <div className="relative z-30 mx-3 mt-1 h-1.5 shrink-0 overflow-hidden rounded-full sm:mx-4" aria-hidden>
        {counting && (
          <div
            className={cn('h-full origin-left rounded-full', countdown.warning === 'kritisk' ? 'bg-destructive' : 'bg-primary')}
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }}
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Samma bord genom alla faser, så att det står still när de byts. Bara svarsdelen byts. */}
        {/* min-w-0: bordet får aldrig trycka svarsdelen utanför fönstret, vad som än står vid platserna. */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <Bord
            state={state}
            table={table}
            meId={me.id}
            online={props.online}
            typing={props.typing}
            center={table.step === 'ledtradar' && !accusing ? <CluesCenter table={table} state={state} meId={me.id} /> : <TableCenter {...stepProps} />}
            onMove={props.onMove}
            vote={
              table.step === 'rostning' && !accusing && inRound && !imposterCard?.vote
                ? { choice, candidates: voteCandidates(table, me.id, props.online.map((player) => player.id)), onChoose: (id) => setPicked({ round: voteRound, id }) }
                : null
            }
          />
        </div>

        {/* Svarsdelen på krämvitt papper: i nederkant, eller i en egen kolumn till höger på bred skärm. Den skrollar för
            sig om innehållet inte får plats, så att bordet alltid syns. Kast landar aldrig här. */}
        <aside
          ref={dockRef}
          data-yta="papper"
          {...SPLAT_SHIELD}
          // Medan korten läses får svarsdelen ta mer av höjden, så att hela kortet och knappen syns utan att skrolla.
          data-steg={table.step}
          // På bred skärm slutar kolumnen där innehållet slutar (lg:self-start), och skrollar först om den inte får plats.
          className="relative z-30 flex shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[1.4rem] bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-foreground shadow-[0_-8px_26px_rgb(0_0_0/0.45)] sm:gap-3 sm:px-5 max-lg:max-h-[58%] max-lg:tiny:max-h-[52%] max-lg:data-[steg=kort]:max-h-[68%] lg:my-2 lg:max-h-[calc(100%-1.25rem)] lg:w-[min(23.5rem,36vw)] lg:self-start lg:rounded-l-[1.4rem] lg:rounded-tr-none lg:py-5 lg:shadow-[-8px_0_26px_rgb(0_0_0/0.45)]"
        >
          {table.failedAccusation && !accusing && (
            <Note>Ingen majoritet. {state.players[table.failedAccusation]?.name ?? 'Spelaren'} är kvar, och spelet fortsätter.</Note>
          )}
          {/* Värden hoppade över någon som dröjde. Alla ser det, så att det inte ser ut som ett fel. */}
          {table.skipNote && !accusing && <Note>{table.skipNote}</Note>}
          {/* Nytt kort är dolt igen, även om det förra visades (en avbruten omgång har samma nummer, men ett ord till är använt). */}
          {table.step !== 'facit' && <MyCard key={`${state.round}-${state.usedWordIds.length}`} mine={imposterCard} inRound={inRound} compact={table.step !== 'kort'} />}
          {accusing && <AccusationStep {...stepProps} />}
          {!accusing && table.step === 'kort' && <CardStep {...props} table={table} inRound={inRound} />}
          {!accusing && table.step === 'ledtradar' && <CluesStep {...props} table={table} />}
          {!accusing && table.step === 'diskussion' && <DiscussionStep {...stepProps} />}
          {table.step === 'rostning' && !accusing && <VotingStep {...stepProps} choice={choice} />}
          {table.step === 'gissning' && !accusing && <GuessStep {...stepProps} />}
          {table.step === 'facit' && <FacitStep {...stepProps} />}
          {isHost && <HostSkipButton state={state} table={table} meId={me.id} onSkip={props.onSkipTurn} />}
          {/* Allas ord som en lista. På smal skärm ligger den bakom knappen Allas ord i stället. */}
          {/* I facit med få spelare står alla ord redan vid platserna, så där behövs inte listan. */}
          {table.clues.length > 0 && !(table.step === 'facit' && table.order.length < 7) && (
            <div className="hidden space-y-1.5 border-t border-border pt-3 lg:block">
              <h3 className="text-lg">Allas ord</h3>
              <AllaOrd state={state} table={table} meId={me.id} />
            </div>
          )}
          {moreBelow && (
            <span aria-hidden className="pointer-events-none sticky bottom-0 z-10 -mt-7 flex justify-center">
              <span className="flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background shadow-soft-sm motion-safe:animate-hop">
                <ChevronDown className="size-3.5" />
                Skrolla för mer
              </span>
            </span>
          )}
        </aside>
      </div>

      <Dialog open={words} onOpenChange={setWords}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allas ord</DialogTitle>
            <DialogDescription>Varje spelares ord i den ordning de gavs.</DialogDescription>
          </DialogHeader>
          <AllaOrd state={state} table={table} meId={me.id} />
        </DialogContent>
      </Dialog>

      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Så spelas det</DialogTitle>
            <DialogDescription>Alla vet ordet. Utom en.</DialogDescription>
          </DialogHeader>
          <ImposterRegler className="text-sm" />
          {/* Väntrummets musik är CC BY 3.0, så den har en kredit. Matchens (CC0) behöver ingen. */}
          <p className="text-xs text-muted-foreground">
            Musik:{' '}
            <a href="https://opengameart.org/content/trouble-makers-coolriff-jazz" target="_blank" rel="noreferrer" className="underline">
              Trouble Makers
            </a>{' '}
            av{' '}
            <a href="https://www.matthewpablo.com" target="_blank" rel="noreferrer" className="underline">
              Matthew Pablo
            </a>{' '}
            (OpenGameArt,{' '}
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer" className="underline">
              CC BY 3.0
            </a>
            )
          </p>
        </DialogContent>
      </Dialog>

      {/* Menyn: reaktionerna, värdens val och vägen ut. */}
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="max-h-[85dvh] gap-4 overflow-x-hidden overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Meny</DialogTitle>
            <DialogDescription>Tryck på en spelare vid bordet för att kasta något.</DialogDescription>
          </DialogHeader>
          <ReactionBar />
          <div className="grid gap-2">
            {/* Värden kan byta ord om någon inte förstår det, men bara innan första associationen. */}
            {isHost && canChangeWord(table) && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  onNewWord()
                }}
              >
                <RefreshCw aria-hidden />
                Nytt ord
              </MenuButton>
            )}
            {/* Värden kan korta matchen. Spelet går till prispallen efter den pågående omgången, med poängen kvar. */}
            {isHost && endsAfterThisRound(state) && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  onEndAfterRound(false)
                }}
              >
                <Undo2 aria-hidden />
                Kör alla omgångar
              </MenuButton>
            )}
            {isHost && !endsAfterThisRound(state) && state.round < state.rounds && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  onEndAfterRound(true)
                }}
              >
                <Flag aria-hidden />
                Avsluta efter den här omgången
              </MenuButton>
            )}
            {/* Om någon dröjer eller ordet avslöjas av misstag. Omgången ger inga poäng och räknas inte. */}
            {isHost && table.step !== 'facit' && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  setConfirmAbort(true)
                }}
              >
                <CircleStop aria-hidden />
                Avbryt omgången
              </MenuButton>
            )}
            {isHost && props.onAbort && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  props.onAbort?.()
                }}
              >
                <Undo2 aria-hidden />
                Tillbaka till väntrummet
              </MenuButton>
            )}
            {props.onLeave && (
              <MenuButton
                onClick={() => {
                  setMenu(false)
                  props.onLeave?.()
                }}
              >
                <LogOut aria-hidden />
                Lämna lobbyn
              </MenuButton>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AbortRoundDialog
        open={confirmAbort}
        onStay={() => setConfirmAbort(false)}
        onAbort={() => {
          setConfirmAbort(false)
          onAbortRound()
        }}
      />
    </div>
  )
}

// En rund knapp i raden överst.
function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur-sm">
      {children}
    </button>
  )
}

function MenuButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline" size="lg" className="w-full" onClick={onClick}>
      {children}
    </Button>
  )
}

// En gul rad i svarsdelen med något alla ska veta.
function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-sun-soft px-3 py-2 text-center text-sm font-semibold sm:text-base" role="status">
      {children}
    </p>
  )
}

// Finns det mer att skrolla fram nedanför i rutan? Mäts när rutan skrollas eller ändrar storlek.
function useMoreBelow(ref: React.RefObject<HTMLElement | null>): boolean {
  const [more, setMore] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setMore(element.scrollHeight - element.scrollTop - element.clientHeight > 12)
    const frame = requestAnimationFrame(measure)
    element.addEventListener('scroll', measure, { passive: true })
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    for (const child of element.children) resize.observe(child)
    const changes = new MutationObserver(measure)
    changes.observe(element, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('scroll', measure)
      resize.disconnect()
      changes.disconnect()
    }
  }, [ref])
  return more
}

// Sidan bakom spelplanen skrollar inte medan den visas.
function useLockPageScroll() {
  useEffect(() => {
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = before
    }
  }, [])
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

// Mitt på bordet under ledtrådsvarven: det senaste ordet stort och vem som gav det. Varv och tur står ovanför bordet.
function CluesCenter({ table, state, meId }: { table: ImposterTable; state: ImposterViewProps['state']; meId: string }) {
  const latest = latestClue(table.clues)
  if (!latest) {
    return <span className="px-2 font-heading text-base leading-tight font-bold text-balance sm:text-2xl">Första ordet kommer snart</span>
  }
  return (
    <span key={table.turn} className="flex max-w-full flex-col items-center motion-safe:animate-pop">
      <span
        className="max-w-full font-heading text-[length:min(1.25rem,var(--fit))] leading-tight font-bold [overflow-wrap:normal] sm:text-[length:min(2.25rem,var(--fit))]"
        style={{ '--fit': fitWordSize(latest.text, 0.82) } as CSSProperties}
      >
        {latest.text}
      </span>
      <span className="max-w-full truncate text-xs font-semibold text-muted-foreground sm:text-base">{latest.player === meId ? 'Ditt ord' : (state.players[latest.player]?.name ?? 'Någon')}</span>
    </span>
  )
}

// Ett ord var i turordning, två eller tre varv. Den som har tur skriver sitt ord (eller passar), eller säger det högt och
// trycker Klar. De andra ser vem som funderar.
function CluesStep({ table, me, imposterCard, onMove, onTyping }: StepProps) {
  const myTurn = currentTurn(table) === me.id
  useYourTurn(myTurn)

  return (
    <>
      {/* Ny ruta för varje tur, så att texten börjar om. */}
      {myTurn &&
        (table.aloud ? (
          <SaidTurn key={table.turn} onDone={(word) => onMove(word ? { type: 'said', word } : { type: 'said' })} />
        ) : (
          <WriteTurn key={table.turn} onMove={onMove} onTyping={onTyping} rejectedAt={imposterCard?.rejectedAt ?? null} />
        ))}
      {!myTurn && !canAccuse(table, me.id) && <p className="text-center text-sm font-semibold text-muted-foreground">Vänta på din tur.</p>}
      {canAccuse(table, me.id) && (
        <p className="text-center text-sm font-semibold text-muted-foreground">Misstänker du någon? Tryck på spelaren och välj Anklaga!</p>
      )}
    </>
  )
}

// Värdens knapp för att gå vidare när någon dröjer. När ni säger orden högt heter den Nästa och finns direkt (någon har
// glömt att trycka Klar). Annars heter den Hoppa över och kommer först när spelet väntat i HOST_SKIP_SECONDS: på den som
// har tur, på dem som inte röstat eller på imposterns sista gissning. Aldrig på värdens egen tur.
function HostSkipButton({ state, table, meId, onSkip }: { state: GameState; table: ImposterTable; meId: string; onSkip: () => void }) {
  const kind = hostSkipKind(table)
  const at = hostSkipAt(table)
  const ready = useReached(at)
  if (!kind || !ready) return null
  const turn = currentTurn(table)
  if (kind === 'tur' && turn === meId) return null
  if (kind === 'gissning' && table.caught === meId) return null
  const name = (id: string | null) => (id ? (state.players[id]?.name ?? 'spelaren') : 'spelaren')
  const text =
    kind === 'tur'
      ? table.aloud
        ? 'Nästa'
        : `Hoppa över ${name(turn)}`
      : kind === 'rostning'
        ? 'Hoppa över: räkna rösterna nu'
        : `Hoppa över ${name(table.caught)}`
  return (
    <Button variant="outline" className="mx-auto h-11 max-w-full motion-safe:animate-fade" onClick={onSkip}>
      <span className="truncate">{text}</span>
    </Button>
  )
}

// Har klockan passerat at (ms, värdens klocka)? null = aldrig. Ritar om när tiden är inne.
function useReached(at: number | null): boolean {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (at === null) return
    const wait = at - Date.now()
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, wait) + 50)
    return () => clearTimeout(timer)
  }, [at])
  return at !== null && now >= at
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
        className="text-center font-heading text-xl font-bold placeholder:text-sm placeholder:font-semibold sm:text-2xl"
      />
      <p
        className={cn('min-h-5 text-center text-sm', spaces || rejected ? 'font-semibold text-primary' : 'text-muted-foreground tiny:hidden')}
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

// Omgången och varvet som brickor ovanför bordet, stora nog att läsa på armlängds avstånd. Omgången står på krämvitt
// ("Sista omgången" på den sista när matchen har flera). Under ledtrådsvarven står varvet bredvid, med en prick per varv,
// och på det sista varvet "Sista varvet!" i lampgult.
function RoundBadges({ state, table }: { state: GameState; table: ImposterTable }) {
  const lastRound = state.rounds > 1 && (state.round >= state.rounds || endsAfterThisRound(state))
  const laps = clueRoundsFor(table)
  const lap = Math.min(laps, clueRound(table))
  const showLap = table.step === 'ledtradar' && !table.accusation
  const lastLap = lap >= laps
  const badge = 'flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--natt)] px-2.5 font-heading text-[13px] leading-none font-bold whitespace-nowrap text-[var(--natt)] sm:min-h-9 sm:px-3.5 sm:text-base lg:text-lg'
  return (
    <>
      <span className={cn(badge, 'bg-[var(--natt-kram)]')}>{lastRound ? 'Sista omgången' : `Omgång ${state.round} av ${state.rounds}`}</span>
      {showLap && (
        <span className={cn(badge, lastLap ? 'bg-[var(--natt-lampa)] shadow-[0_0_14px_color-mix(in_oklch,var(--natt-lampa)_50%,transparent)]' : 'bg-[var(--natt-kram)]')}>
          {lastLap ? 'Sista varvet!' : `Varv ${lap} av ${laps}`}
          <span aria-hidden className="flex items-center gap-1">
            {Array.from({ length: laps }, (_, i) => (
              <span key={i} className={cn('size-2 rounded-full border border-[var(--natt)] sm:size-2.5', i < lap ? 'bg-[var(--natt)]' : 'bg-transparent')} />
            ))}
          </span>
        </span>
      )}
    </>
  )
}
