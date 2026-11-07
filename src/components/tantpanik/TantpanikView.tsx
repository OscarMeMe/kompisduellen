import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, CircleHelp, Menu, ScrollText } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import type { TantViewProps } from '@/components/lobby/types'
import { TableAnimations, type Incoming } from '@/components/tantpanik/TantAnimationer'
import { TantHand } from '@/components/tantpanik/TantHand'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { HistoryDialog, MenuDialog, RulesDialog } from '@/components/tantpanik/TantMenyer'
import { FutureView, NopeVerdict, NopeWindow, PickCard, Place } from '@/components/tantpanik/TantSteg'
import { GivePopup, ValPopup } from '@/components/tantpanik/TantVal'
import { TurnCup } from '@/components/tantpanik/TurKopp'
import { Button } from '@/components/ui/button'
import { onlyBotsLeft as botsOnlyLeft } from '@/lib/tantbot'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReactions, useThrows } from '@/hooks/useReactions'
import { Konfetti } from '@/components/Konfetti'
import { tantMusic } from '@/lib/tantmusik'
import { SoundControl } from '@/components/lobby/LjudKnapp'
import { useMusicVolume } from '@/hooks/useMusicVolume'
import { loadSoundOn, playBullseye, saveSoundOn } from '@/lib/ljud'
import { useThrowWait } from '@/hooks/useThrowWait'
import { THROW_ITEMS } from '@/lib/kast'
import type { GameState } from '@/lib/match'
import { bombsInDeck, moveAllowed, waitingFor, type MyTantView, type TantEvent, type TantMove, type TantTable } from '@/lib/tantpanik'
import { cardName } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Hur länge ett besked syns innan det försvinner (ms).
const NOTICE_MS = 2500

// Exploderande Tanter: hela matchen som ett kortbord som tar hela skärmen. Överst vad jag ska göra, sedan motspelarna,
// högarna i mitten, en rad med det senaste och min hand längst ner. Reglerna, menyn och historiken ligger bakom knappar.
// Prispallen efteråt är gemensam för alla spel.
// onBotsOnly: värden spolar fram eller tar revansch direkt när bara botar är kvar (se fastForwardBots).
export function TantpanikView({
  state,
  me,
  isHost,
  clockOffset,
  tantView,
  onMove: sendMove,
  onAbort,
  onLeave,
  onBotsOnly,
}: TantViewProps) {
  const table = state.tantpanik
  // Bara drag som är tillåtna just nu skickas (moveAllowed, samma regel som spelmotorn), så att ett tryck på något som
  // inte är mitt aldrig blir ett drag. Spelmotorn avvisar dem ändå.
  const onMove = (move: TantMove) => {
    if (table && moveAllowed(table, me.id, move)) sendMove(move)
  }
  const [rules, setRules] = useState(false)
  const [menu, setMenu] = useState(false)
  const [history, setHistory] = useState(false)
  const [botsOnlyClosed, setBotsOnlyClosed] = useState<string | null>(null)
  // Se framtiden ligger kvar tills jag trycker Klar: vilken titt jag redan stängt.
  const [dismissedPeek, setDismissedPeek] = useState<string | null>(null)
  const peekKey = tantView?.peek && table ? `${tantView.peek.join()}|${table.discardCount}|${table.current}` : null
  const popupOpen = !!table && hasPopup(table, tantView, me.id, peekKey !== null && peekKey !== dismissedPeek)
  // Gamla besked försvinner när en popup öppnas, och visas aldrig ovanpå den.
  const notice = useFleeting(tantView?.notice ?? null, popupOpen)
  const myNotes = useMyNotes(tantView, state)
  // Bordet skakar när en exploderande tant vänds (ny key startar om skakningen).
  const [shake, setShake] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!shake || !root) return
    // Klassen tas bort och läggs till igen, så att skakningen börjar om utan att något ritas om.
    root.classList.remove('motion-safe:animate-table-shake')
    void root.offsetWidth
    root.classList.add('motion-safe:animate-table-shake')
  }, [shake])
  const [pileRef, pileSize, pilesTight] = usePileSize()
  // Hur mycket handen ligger över bordets nederkant (px). Högarna lämnar plats för den.
  const [handOverlap, setHandOverlap] = useState(0)
  // Kortet jag just drog, medan det visas stort (show) och medan det glider ner till sin plats i handen (land).
  const [incoming, setIncoming] = useState<Incoming>(null)
  // Kortet jag senast fick: markerat i handen ("NY") en stund efter att det landat.
  const [fresh, setFresh] = useState<string | null>(null)
  const landingId = useRef<string | null>(null)
  useEffect(() => {
    if (incoming) {
      landingId.current = incoming.id
      return
    }
    if (landingId.current) setFresh(landingId.current)
    landingId.current = null
  }, [incoming])
  useEffect(() => {
    if (!fresh) return
    const timer = setTimeout(() => setFresh(null), FRESH_MS)
    return () => clearTimeout(timer)
  }, [fresh])
  // Markeringen försvinner när min nästa tur börjar (andras turer kan komma direkt efter, och då hinner man inte se den).
  const myTurnNow = !!table && table.current === me.id && table.step === 'turn'
  const wasMyTurn = useRef(myTurnNow)
  useEffect(() => {
    if (myTurnNow && !wasMyTurn.current) setFresh(null)
    wasMyTurn.current = myTurnNow
  }, [myTurnNow])
  // En explosion visas: valen (t.ex. Göm tanten) och firandet av vinnaren väntar tills den är klar.
  const [bombShowing, setBombShowing] = useState(false)
  // När Nope!-fönstret stängs syns en kort stämpel (KÖR! eller STOPPAT!), så att man förstår att det är över.
  const verdict = useNopeVerdict(table)
  // Det som händer vid bordet, en pratbubbla i taget. Det som redan syns på annat sätt (Nope!-fönstret, explosioner,
  // väntebesked och popuper) hoppas över.
  const quiet =
    !!table &&
    ((table.step === 'window' && table.pending !== null) || bombShowing || table.step === 'pick' || table.step === 'give' || table.step === 'place' || table.step === 'arrange')
  const bubble = useEventBubbles(table?.log ?? [], quiet)
  // Bakgrundsmusiken: volymen sparas för sig, och "Stäng av allt" (ljudet av) stänger av den också.
  const musicVolume = useMusicVolume()
  const soundReactions = useReactions()
  const soundOn = soundReactions ? soundReactions.soundOn : loadSoundOn()
  const playing = !!table && state.phase === 'playing' && table.order.includes(me.id)
  const musicWanted = playing && soundOn && musicVolume > 0
  useEffect(() => {
    tantMusic.setLevel('match')
    tantMusic.setWanted(musicWanted)
  }, [musicWanted])
  useEffect(() => () => tantMusic.setWanted(false), [])
  // Lite snabbare när det är få kort kvar i högen, eller bara två kvar av fler.
  const tense = !!table && (table.deckCount <= 8 || (table.order.length > 2 && table.order.length - table.out.length === 2))
  useEffect(() => tantMusic.setFast(tense), [tense])
  // Någon spelade Se framtiden: de andra ser "tittar i högen" en stund.
  const peeker = usePeeker(table)
  // Var handen börjar, räknat från skärmens nederkant (px), för Nope!-fönstret ovanför den.
  const handBoxRef = useRef<HTMLDivElement>(null)
  const [handTop, setHandTop] = useState(200)
  // Var motspelarraden slutar (px från skärmens överkant). Nope!-fönstret börjar under den, så att platserna syns.
  const seatsRef = useRef<HTMLDivElement>(null)
  const [seatsBottom, setSeatsBottom] = useState(120)
  useLayoutEffect(() => {
    const element = handBoxRef.current
    if (!element) return
    const measure = () => {
      setHandTop(Math.max(0, window.innerHeight - element.getBoundingClientRect().top))
      const seats = seatsRef.current?.getBoundingClientRect()
      if (seats) setSeatsBottom(seats.bottom)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  if (!table) return null
  const inMatch = table.order.includes(me.id)
  const out = table.out.includes(me.id)
  // Jag har exploderat och bara botar är kvar: värden får välja Spola fram, Revansch direkt eller Följ resten.
  const onlyBotsLeft = botsOnlyLeft(state)
  const botsOnlyKey = out && onlyBotsLeft && isHost && !!onBotsOnly ? table.order.join() : null
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  // Varje val jag ska göra är en stor popup i mitten av skärmen (TantVal.tsx): valet vid ett par, Göm tanten, Ändra
  // framtiden, Se framtiden och Tjänst. Valen när jag spelar ett kort öppnas från handen (TantHand).
  const pick = table.step === 'pick' ? table.pick : null
  const popup = bombShowing ? null : pick && pick.by === me.id ? (
      <PickCard
        key={`${pick.from}-${table.log.at(-1)?.n}`}
        fromName={name(pick.from)}
        count={pick.count}
        title={
          pick.trap
            ? `Fällan slog igen! Välj ${pick.left === 1 ? 'ett kort' : `${pick.left} kort`} ur ${name(pick.from)}s hand`
            : undefined
        }
        onMove={onMove}
      />
    ) : table.step === 'place' && table.current === me.id ? (
      <Place deckCount={table.deckCount} onMove={onMove} />
    ) : table.step === 'arrange' && tantView?.arrange ? (
      <FutureView
        key={tantView.arrange.join()}
        cards={tantView.arrange}
        arrange
        onDone={(order) => {
          // Titten efter att jag lagt tillbaka korten är redan sedd.
          setDismissedPeek(`${order.map((i) => tantView.arrange![i]).join()}|${table.discardCount}|${table.current}`)
          onMove({ type: 'tArrange', order })
        }}
      />
    ) : table.step === 'give' && table.favor?.from === me.id && tantView ? (
      <GivePopup
        key={table.log.at(-1)?.n}
        toName={name(table.favor.to)}
        hand={tantView.hand}
        onGive={(card) => onMove({ type: 'tGive', card })}
      />
    ) : tantView?.peek && peekKey !== dismissedPeek && table.step !== 'window' ? (
      <FutureView key={peekKey} cards={tantView.peek} arrange={false} onDone={() => setDismissedPeek(peekKey)} />
    ) : null
  // Väntar vi på någon annan: en kort etikett med figuren, vid draghögen eller överst på bordet, och en liten animation.
  const activity: Activity | null =
    table.step === 'arrange' && !tantView?.arrange
      ? { kind: 'arrange', playerId: table.current, text: `${name(table.current)} möblerar om högen` }
      : table.step === 'place' && table.current !== me.id
        ? { kind: 'hide', playerId: table.current, text: `${name(table.current)} gömmer tanten` }
        : pick && pick.by !== me.id
          ? {
              kind: 'pick',
              playerId: pick.by,
              text: pick.trap
                ? `Fällan! ${name(pick.by)} väljer kort ur ${pick.from === me.id ? 'din hand' : `${name(pick.from)}s hand`}`
                : `${name(pick.by)} väljer ett kort från ${pick.from === me.id ? 'dig' : name(pick.from)}`,
            }
          : table.step === 'give' && table.favor && table.favor.from !== me.id
            ? {
                kind: 'give',
                playerId: table.favor.from,
                text:
                  table.favor.to === me.id
                    ? `${name(table.favor.from)} väljer ett kort åt dig`
                    : `${name(table.favor.from)} väljer ett kort åt ${name(table.favor.to)}`,
              }
            : peeker && peeker !== me.id && table.step === 'turn'
              ? { kind: 'peek', playerId: peeker, text: `${name(peeker)} tittar i högen` }
              : null
  const atPile = activity && (activity.kind === 'hide' || activity.kind === 'arrange' || activity.kind === 'peek') ? activity : null
  const nopeOpen = table.step === 'window' && table.pending !== null && !table.error
  // Jag kan säga Nope! just nu: då visas bara den stora knappen vid handen, ingen text.
  const pendingNow = table.pending
  const canNope =
    nopeOpen &&
    !out &&
    inMatch &&
    (pendingNow?.lastNopeBy ?? pendingNow?.by) !== me.id &&
    !!tantView?.hand.some((card) => card.type === 'nadu')
  // Är det något jag ska göra just nu (min tur, ett val, eller Nope!)? Annars är bordet och handen lätt dämpade. Popuper
  // och Nope!-fönstret ligger utanför det som dämpas, så de syns alltid fullt.
  const myAction = waitingFor(table) === me.id || canNope || !!tantView?.arrange
  const dimmed = inMatch && !out && !table.winner && !myAction
  const canDraw = inMatch && !out && table.step === 'turn' && table.current === me.id && !table.error

  return (
    <div
      ref={rootRef}
      data-spel="tantpanik"
      // Mönstret från väntrummet bakom hela matchen. Högarna och handen ligger direkt på det.
      // Lite luft under handen även utan säker marginal, så att webbläsarens list aldrig skär av korten.
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-background bg-repeat pt-[env(safe-area-inset-top)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ backgroundImage: `url(${TANT_PATTERN})`, backgroundSize: '512px 512px' }}
    >
      <StatusBar
        state={state}
        table={table}
        meId={me.id}
        bombShowing={bombShowing}
        canNope={canNope}
        history={<HistoryButton table={table} onOpen={() => setHistory(true)} />}
        sound={
          <SoundControl
            soundOn={soundOn}
            onSoundOn={(on) => (soundReactions ? soundReactions.setSoundOn(on) : saveSoundOn(on))}
            music
          />
        }
        onRules={() => setRules(true)} onMenu={() => setMenu(true)} />
      {/* Ovanpå Nope!-fönstret, så att den som spelar syns lysa. */}
      <div ref={seatsRef} className="relative z-[46]">
        <Opponents state={state} table={table} meId={me.id} playingId={nopeOpen ? (table.pending?.by ?? null) : null} />
      </div>


      {/* Bordet i mitten: högarna, och ovanpå dem det som väntar eller pågår. */}
      <section
        aria-label="Bordet"
        // Högarna ligger direkt på mönstret och dämpas aldrig. Vems tur det är syns på statusraden och spelaren överst.
        className="relative mx-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-2"
      >
        {/* Högarna växer och fyller bordet när det finns plats. */}
        <div ref={pileRef} className="flex min-h-0 w-full flex-1 items-center justify-center" style={{ paddingBottom: handOverlap }}>
          {/* Medan ett kort väntar på Nope! står det stort ovanför bordet (NopeOverlay), så högarna göms. */}
          <div className={cn('contents', nopeOpen && 'invisible')}>
            <Piles
              table={table}
              size={pileSize}
              tight={pilesTight}
              canDraw={canDraw}
              onDraw={() => onMove({ type: 'tDraw' })}
              activity={atPile}
              avatar={atPile ? (state.players[atPile.playerId]?.avatar ?? '') : ''}
            />
          </div>
        </div>
        {notice && !nopeOpen && !popup && (
          <p
            key={notice.n}
            role="status"
            className="pointer-events-none absolute inset-x-3 top-2 z-20 mx-auto w-fit max-w-full rounded-full bg-sun-soft px-4 py-1.5 text-center text-sm font-semibold shadow-soft motion-safe:animate-pop"
          >
            {notice.text}
          </p>
        )}
        {table.error && (
          <div className="absolute inset-x-2 top-1/2 z-10 -translate-y-1/2">
            <p role="alert" className="rounded-lg bg-card px-3 py-3 text-center font-semibold text-destructive shadow-lift">
              {table.error}
            </p>
          </div>
        )}
        {/* Det senaste som hänt, som en pratbubbla vid högarna. En i taget. */}
        {bubble && !nopeOpen && !bombShowing && !popup && (
          <div className="pointer-events-none absolute inset-x-2 top-1 z-20 flex justify-center">
            <EventBubble key={bubble.n} event={bubble} state={state} />
          </div>
        )}
        {/* Någon väljer ett kort (Tjänst, par): etiketten överst på bordet, nära spelarnas platser. */}
        {activity && !atPile && (
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex justify-center">
            <WaitTag playerId={activity.playerId} avatar={state.players[activity.playerId]?.avatar ?? ''} text={activity.text} cards />
          </div>
        )}
      </section>

      {/* Min hand. Det dragna kortet åker ner hit (data-tant-hand). */}
      <div ref={handBoxRef} data-tant-hand className="relative shrink-0">
        {inMatch && !out && tantView ? (
          <TantHand
            // Valen börjar om när turen eller steget byts.
            key={`${table.current}-${table.step}-${table.turnsLeft}`}
            state={state}
            table={table}
            meId={me.id}
            hand={tantView.hand}
            clockOffset={clockOffset}
            onMove={onMove}
            onOverlap={setHandOverlap}
            dimmed={dimmed}
            raised={canDraw}
            incoming={incoming}
            freshId={fresh}
            onFreshSeen={() => setFresh(null)}
            orderKey={`${me.id}:${table.order.join(',')}`}
          />
        ) : (
          <div className="mx-2 mb-3 flex items-center justify-center gap-3 rounded-md bg-card px-3 py-2 text-center text-sm font-semibold shadow-soft-sm">
            <p className="py-1">{!inMatch ? 'Du är med från nästa match.' : out ? 'Du är ute. Följ resten av matchen.' : 'Din hand kommer strax…'}</p>
            {/* Bara botar kvar: värden kan avsluta (Spola fram, Revansch direkt eller Följ resten). */}
            {botsOnlyKey && !table.winner && (
              <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setBotsOnlyClosed(null)}>
                Avsluta
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Turkoppen: står hos den som har tur och glider vidare när turen byts. */}
      <TurnCup table={table} meId={me.id} soundOn={soundOn} />
      {botsOnlyKey && botsOnlyClosed !== botsOnlyKey && !bombShowing && (
        <ValPopup
          panel
          title="Du exploderade! Botarna spelar vidare."
          actions={
            <div className="flex w-full flex-col gap-2">
              <Button size="lg" className="w-full" onClick={() => onBotsOnly?.('spola')}>
                Spola fram
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => onBotsOnly?.('revansch')}>
                Revansch direkt
              </Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={() => setBotsOnlyClosed(botsOnlyKey)}>
                Följ resten
              </Button>
            </div>
          }
        >
          <p className="text-center text-sm text-muted-foreground">
            Spola fram visar slutet direkt. Revansch direkt startar en ny match med samma spelare och inställningar.
          </p>
        </ValPopup>
      )}
      <DealIntro state={state} table={table} meId={me.id} />
      {nopeOpen && (
        // Det spelade kortet stort mellan statusraden och handen, så att det syns även när handen tar mycket plats på en
        // telefon. Rutan tar inga tryck, så att Nope!-knappen och korten i handen går att trycka på.
        <div
          className="pointer-events-none fixed inset-x-0 z-[44] bg-foreground/35 px-2 pt-1 motion-safe:animate-fade"
          // Under motspelarraden, och plats ovanför handen för kort som lyfts (t.ex. Nope!-kortet som hoppar upp).
          style={{ top: seatsBottom, bottom: handTop + Math.round(handOverlap * 0.9) + 8 + (canNope ? 40 : 0) }}
        >
          <NopeWindow
            state={state}
            table={table}
            meId={me.id}
            clockOffset={clockOffset}
            canNope={canNope}
            onNope={() => {
              const card = tantView?.hand.find((c) => c.type === 'nadu')
              if (card && table.pending) onMove({ type: 'tNope', card: card.id, level: table.pending.nopes })
            }}
          />
        </div>
      )}
      {verdict && <NopeVerdict key={verdict.n} stopped={verdict.stopped} />}
      {nopeOpen && table.pending?.target && (
        <TargetArrow key={`${table.pending.by}-${table.pending.target}-${table.log.at(-1)?.n}`} from={table.pending.by} to={table.pending.target} meId={me.id} />
      )}
      {popup}
      <TableAnimations state={state} table={table} meId={me.id} tantView={tantView} onShake={setShake} onIncoming={setIncoming} onBomb={setBombShowing} />
      {table.winner && !bombShowing && (
        <WinnerCelebration
          state={state}
          winner={table.winner}
          meId={me.id}
          canSkip={inMatch}
          onSkip={() => onMove({ type: 'tFinish' })}
        />
      )}
      <RulesDialog open={rules} onOpenChange={setRules} />
      <MenuDialog
        open={menu}
        onOpenChange={setMenu}
        isHost={isHost}
        onAbort={onAbort}
        onLeave={onLeave}
        onHistory={() => {
          setMenu(false)
          setHistory(true)
        }}
      />
      <HistoryDialog open={history} onOpenChange={setHistory} table={table} mine={myNotes} />
    </div>
  )
}

// När någon vunnit, fortfarande vid bordet: vinnarens figur hoppar fram i mitten med konfetti, jubel och "[namn] vinner!".
// Slutskärmen kommer av sig själv efter en stund (END_MS i tantpanik.ts), eller när någon trycker.
function WinnerCelebration({
  state,
  winner,
  meId,
  canSkip,
  onSkip,
}: {
  state: GameState
  winner: string
  meId: string
  canSkip: boolean
  onSkip: () => void
}) {
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  useEffect(() => {
    if (soundOn) {
      tantMusic.duck(1500)
      playBullseye()
    }
    // Bara en gång.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const name = winner === meId ? 'Du' : (state.players[winner]?.name ?? 'Någon')
  return (
    <button
      type="button"
      aria-label={canSkip ? `${name} vinner! Tryck för att gå vidare.` : `${name} vinner!`}
      disabled={!canSkip}
      onClick={onSkip}
      className="fixed inset-0 z-[57] flex flex-col items-center justify-center gap-4 overflow-hidden bg-foreground/60 px-4 motion-safe:animate-fade"
    >
      <div className="relative w-full">
        <Konfetti />
      </div>
      <span className="rounded-full bg-sun-soft p-6 shadow-lift motion-safe:animate-hop md:p-10">
        <LobbyFigur playerId={winner} avatar={state.players[winner]?.avatar ?? ''} className="text-8xl md:text-[10rem]" />
      </span>
      <span className="rounded-full bg-card px-6 py-3 font-heading text-4xl font-bold shadow-lift motion-safe:animate-pop md:text-6xl">
        {name} vinner!
      </span>
      {canSkip && <span className="text-sm font-semibold text-background/90">Tryck för att se resultatet</span>}
    </button>
  )
}

// Någon annan gör något jag väntar på.
type Activity = { kind: 'hide' | 'arrange' | 'peek' | 'give' | 'pick'; playerId: string; text: string }

// Väntebeskedet: en kompakt etikett med figuren, en kort text och tre punkter som hoppar (står still med "minska
// rörelse"). cards = en liten solfjäder som vickar, för när någon väljer ett kort.
function WaitTag({ playerId, avatar, text, cards = false }: { playerId: string; avatar: string; text: string; cards?: boolean }) {
  return (
    <span role="status" className="flex max-w-full items-center gap-2 rounded-full bg-card/95 py-1 pr-3.5 pl-1.5 shadow-lift">
      <LobbyFigur playerId={playerId} avatar={avatar} className="text-2xl md:text-3xl" />
      {cards && (
        <span aria-hidden className="relative h-6 w-7 shrink-0">
          {[-1, 0, 1].map((i) => (
            <TantBaksida
              key={i}
              sizes="16px"
              className="absolute bottom-0 left-2 w-3.5 origin-bottom motion-safe:animate-wiggle"
              style={{ rotate: `${i * 16}deg`, animationDelay: `${(i + 1) * 150}ms`, animationIterationCount: 'infinite' }}
            />
          ))}
        </span>
      )}
      <span className="truncate text-sm font-semibold md:text-base">{text}</span>
      <span aria-hidden className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full bg-foreground/60 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
    </span>
  )
}

// Hur ofta kortet som letar efter en plats byter läge (ms), och hur länge det tar att glida in i högen.
const SEARCH_MS = 650
const INSERT_MS = 450
// Platser längs högen som kortet glider mellan (andel av högens bredd).
const SEARCH_SPOTS = [0.15, 0.6, 0.3, 0.75, 0.45]

// Animationen vid draghögen medan någon annan gör något med den:
// - hide: tanten svävar med baksidan upp ovanför högen och glider fram och tillbaka, som om någon letar efter en plats.
//   När spelaren bestämt sig glider kortet in i högen.
// - arrange och peek: de tre översta korten lyfts lite och ligger utfläktade ovanför högen (arrange byter plats på dem).
// Med "minska rörelse" visas inget av detta, bara etiketten.
function PileActivity({ kind, size }: { kind: Activity['kind'] | null; size: number }) {
  const [spot, setSpot] = useState(0)
  const [inserting, setInserting] = useState(false)
  const was = useRef(kind)
  useEffect(() => {
    if (kind !== 'hide' && kind !== 'arrange') return
    const timer = setInterval(() => setSpot((s) => s + 1), SEARCH_MS)
    return () => clearInterval(timer)
  }, [kind])
  useEffect(() => {
    const before = was.current
    was.current = kind
    if (before !== 'hide' || kind === 'hide') return
    setInserting(true)
    const timer = setTimeout(() => setInserting(false), INSERT_MS)
    return () => clearTimeout(timer)
  }, [kind])
  if (reducedMotionNow()) return null
  const width = Math.round(size * 0.55)
  if (kind === 'hide' || inserting) {
    const x = SEARCH_SPOTS[spot % SEARCH_SPOTS.length] * size - width / 2
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 transition-[left,transform,opacity] ease-in-out"
        style={{
          width,
          left: inserting ? size / 2 - width / 2 : x,
          top: inserting ? '35%' : '-18%',
          transitionDuration: `${inserting ? INSERT_MS : SEARCH_MS - 50}ms`,
          opacity: inserting ? 0 : 1,
          transform: inserting ? 'scale(0.9)' : `rotate(${spot % 2 === 0 ? -6 : 6}deg)`,
        }}
      >
        <TantBaksida sizes={`${width}px`} className="w-full drop-shadow-[0_10px_16px_rgb(0_0_0/0.35)]" />
      </span>
    )
  }
  if (kind === 'arrange' || kind === 'peek') {
    const small = Math.round(size * 0.38)
    const order = kind === 'arrange' ? [0, 1, 2].map((i) => (i + spot) % 3) : [0, 1, 2]
    return (
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-[14%] z-10 flex justify-center">
        {order.map((slot, i) => (
          <TantBaksida
            key={i}
            sizes={`${small}px`}
            className="-mx-2 drop-shadow-lg transition-transform duration-500 ease-in-out motion-safe:animate-pop"
            style={{ width: small, transform: `translateY(${slot === 1 ? -8 : 0}px) rotate(${(slot - 1) * 12}deg)` }}
          />
        ))}
      </span>
    )
  }
  return null
}

function reducedMotionNow(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}

// Hur länge de andra ser att någon tittar i högen efter Se framtiden (ms). Själva titten syns bara för den som spelade.
const PEEK_TAG_MS = 3500

// Den som just spelade Se framtiden (och inte blev stoppad), en stund efter att Nope!-fönstret stängts. Etiketten gäller
// bara medan det fortfarande är den spelarens tur, så den står aldrig kvar när turen gått vidare. Klockan som tar bort den
// hör till själva titten (shown), så ett nytt kort som spelas strax efter kan inte stoppa den.
function usePeeker(table: TantTable | null): string | null {
  const pending = table?.step === 'window' ? table.pending : null
  const last = useRef<{ by: string; peek: boolean; stopped: boolean } | null>(null)
  const [shown, setShown] = useState<{ by: string } | null>(null)
  const open = pending !== null
  const nopes = pending?.nopes ?? 0
  useEffect(() => {
    if (open && pending) {
      last.current = { by: pending.by, peek: pending.kind === 'single' && pending.cards[0] === 'tjuvkika', stopped: nopes % 2 === 1 }
      setShown(null)
      return
    }
    const done = last.current
    last.current = null
    if (done?.peek && !done.stopped) setShown({ by: done.by })
    // pending ändras med open och nopes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nopes])
  useEffect(() => {
    if (!shown) return
    const timer = setTimeout(() => setShown(null), PEEK_TAG_MS)
    return () => clearTimeout(timer)
  }, [shown])
  if (!shown || !table || table.step !== 'turn' || table.current !== shown.by) return null
  return shown.by
}

// Hur länge ett nytt kort är markerat i handen (ms).
const FRESH_MS = 5000

// Pilen från den som spelade ett riktat kort till målet (par, tretal, Tjänst, Riktad attack). Är det mot mig lyser min
// hand rött en stund. Den tar inga tryck, och med "minska rörelse" ritas den direkt.
function TargetArrow({ from, to, meId }: { from: string; to: string; meId: string }) {
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [flash, setFlash] = useState(to === meId)
  useLayoutEffect(() => {
    const place = (id: string) =>
      (id === meId ? document.querySelector('[data-tant-hand]') : document.querySelector(`[data-seat="${CSS.escape(id)}"]`))?.getBoundingClientRect()
    const measure = () => {
      const a = place(from)
      const b = place(to)
      if (!a || !b) return
      // Mot mig på en smal skärm räcker "→ mot dig!" i rött: ingen pil. Annars till handens överkant (aldrig in bland
      // korten), eller mitt på en motspelares plats.
      if (to === meId && window.innerWidth <= 420) return setLine(null)
      setLine({ x1: a.left + a.width / 2, y1: a.top + a.height / 2, x2: b.left + b.width / 2, y2: to === meId ? b.top - 10 : b.top + b.height / 2 })
    }
    // Raden med motspelare går att svepa: målet (eller den som spelar) rullas fram, så att pilen syns hela vägen.
    const seat = (id: string) => (id === meId ? null : document.querySelector(`[data-seat="${CSS.escape(id)}"]`))
    seat(to)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (to === meId) seat(from)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [from, to, meId])
  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(false), 1000)
    return () => clearTimeout(timer)
  }, [flash])
  const hand = to === meId ? document.querySelector('[data-tant-hand]')?.getBoundingClientRect() : null
  return (
    <>
      {line && (
        <svg aria-hidden className="pointer-events-none fixed inset-0 z-[47] size-full">
          <defs>
            <marker id="tant-pil" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={to === meId ? 'fill-destructive' : 'fill-primary-button'} />
            </marker>
          </defs>
          {/* En båge ned över bordet, så att den syns även mellan två som sitter bredvid varandra. Mot mig rakt ned till handen. */}
          <path
            d={`M ${line.x1} ${line.y1} Q ${(line.x1 + line.x2) / 2} ${to === meId ? (line.y1 + line.y2) / 2 : Math.max(line.y1, line.y2) + 140} ${line.x2} ${line.y2}`}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="2 12"
            markerEnd="url(#tant-pil)"
            className={cn(to === meId ? 'stroke-destructive' : 'stroke-primary-button', 'drop-shadow-[0_0_4px_white]')}
          />
        </svg>
      )}
      {flash && hand && (
        // Mot mig: en tunn röd glöd längs handens överkant i en sekund.
        <span
          aria-hidden
          className="pointer-events-none fixed z-[45] h-1 rounded-full bg-destructive shadow-[0_0_16px_5px] shadow-destructive/70 motion-safe:animate-fade"
          style={{ left: hand.left + 16, top: hand.top - 2, width: hand.width - 32 }}
        />
      )}
    </>
  )
}

// Hur länge stämpeln syns när Nope!-fönstret stängs (ms).
const VERDICT_MS = 850

// Stämpeln när Nope!-fönstret stängs: stoppades kortet eller händer det? Inget efter en omladdning.
function useNopeVerdict(table: TantTable | null): { n: number; stopped: boolean } | null {
  const pending = table?.step === 'window' ? table.pending : null
  const last = useRef<{ stopped: boolean } | null>(null)
  const count = useRef(0)
  const [verdict, setVerdict] = useState<{ n: number; stopped: boolean } | null>(null)
  const open = pending !== null
  const stopped = pending ? pending.nopes % 2 === 1 : null
  useEffect(() => {
    if (open) {
      last.current = { stopped: !!stopped }
      return
    }
    if (!last.current) return
    const shown = last.current
    last.current = null
    count.current += 1
    const n = count.current
    setVerdict({ n, stopped: shown.stopped })
    const timer = setTimeout(() => setVerdict((v) => (v?.n === n ? null : v)), VERDICT_MS)
    return () => clearTimeout(timer)
  }, [open, stopped])
  return verdict
}

// Ska jag välja något i en popup just nu? (Samma villkor som popupen i TantpanikView, utan valen från handen.)
function hasPopup(table: TantTable, tantView: TantViewProps['tantView'], meId: string, unseenPeek: boolean): boolean {
  if (table.step === 'pick') return table.pick?.by === meId
  if (table.step === 'place') return table.current === meId
  if (table.step === 'arrange') return !!tantView?.arrange
  if (table.step === 'give') return table.favor?.from === meId
  return unseenPeek && table.step !== 'window'
}

// Hur bred draghögen får vara (px): den fyller bordets höjd, men slänghögen ska få plats bredvid (PILES_WIDE).
// Den växer med skärmen, även på dator och surfplatta.
function usePileSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(112)
  const [tight, setTight] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      // Plats för texten under högarna, kortlekens tjocklek och handen som ligger över bordets nederkant.
      const style = getComputedStyle(element)
      const height = element.clientHeight - parseFloat(style.paddingBottom) - 40
      const byHeight = height * (107 / 147)
      const wide = (element.clientWidth - 24) / PILES_WIDE
      // Räcker inte bredden till höjden: slänghögen läggs en bit bakom draghögen (tight).
      const tuck = byHeight > wide * 1.15
      const byWidth = (element.clientWidth - 24) / (tuck ? PILES_WIDE_TIGHT : PILES_WIDE)
      setTight(tuck)
      setSize(Math.round(Math.max(72, Math.min(byHeight, byWidth, 520))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // Handens överlapp ändrar bara utfyllnaden, inte rutans storlek.
    const mutations = new MutationObserver(measure)
    mutations.observe(element, { attributes: true, attributeFilter: ['style'] })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])
  return [ref, size, tight] as const
}

// Ett besked visas en gång, en kort stund, och aldrig igen (samma nummer visas inte två gånger).
// suppressed = en popup är öppen: beskedet försvinner direkt och visas inte igen.
function useFleeting(event: TantEvent | null, suppressed = false): TantEvent | null {
  const [shown, setShown] = useState<TantEvent | null>(null)
  const seen = useRef(new Set<number>())
  useEffect(() => {
    if (suppressed) setShown(null)
  }, [suppressed])
  useEffect(() => {
    if (!event || seen.current.has(event.n)) return
    seen.current.add(event.n)
    // Ett besked som kommer medan en popup är öppen hoppas över.
    if (suppressed) return
    setShown(event)
    const timer = setTimeout(() => setShown((current) => (current?.n === event.n ? null : current)), NOTICE_MS)
    return () => clearTimeout(timer)
    // suppressed ska inte visa ett besked igen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])
  return shown
}

// Raden överst: reglerna, vad JAG ska göra just nu (korallröd när det är något jag ska göra) och menyn.
function StatusBar({
  state,
  table,
  meId,
  onRules,
  onMenu,
  bombShowing,
  canNope,
  history,
  sound,
}: {
  state: GameState
  table: TantTable
  meId: string
  // Under den sista explosionen avslöjas inte vinnaren än.
  bombShowing: boolean
  canNope: boolean
  // Knappen med historiken.
  history: ReactNode
  // Högtalarikonen med volymen för ljudeffekter och musik.
  sound: ReactNode
  onRules: () => void
  onMenu: () => void
}) {
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const status = statusText(table, meId, name, bombShowing, canNope)
  return (
    // Ovanpå bordet (högarna och det som svävar ovanför dem), så att raden alltid syns. Popuperna ligger ändå över den.
    <div className="relative z-[46] flex shrink-0 items-center gap-1.5 px-2 py-1.5 lg:gap-2 lg:py-2">
      <button
        type="button"
        aria-label="Så spelas det"
        onClick={onRules}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm max-[420px]:size-9"
      >
        <CircleHelp aria-hidden className="size-5 max-[420px]:size-4" />
      </button>
      {/* Vad jag ska göra just nu. Korallröd när det är något jag ska göra. */}
      <p
        role="status"
        className={cn(
          'flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-3xl px-3 py-1 text-center font-heading text-base leading-tight font-bold whitespace-nowrap backdrop-blur-sm max-[420px]:min-h-9 max-[420px]:gap-1.5 max-[420px]:px-2 sm:text-lg lg:text-2xl',
          // Alltid ljus och lugn. Vems tur det är visar turkoppen.
          'bg-card/90 shadow-soft-sm',
        )}
      >
        {status.waitingFor && (
          <LobbyFigur playerId={status.waitingFor} avatar={state.players[status.waitingFor]?.avatar ?? ''} lively={false} className="shrink-0 text-2xl lg:text-3xl" />
        )}
        {/* Alltid en rad. På smala skärmar en kortare text (figuren visar vem). */}
        <span className="min-w-0 truncate max-[420px]:hidden">{status.text}</span>
        <span className="min-w-0 truncate min-[421px]:hidden">{status.short}</span>
        {status.waitingFor && <Dots />}
      </p>
      {/* Historiken ligger i menyn på smala skärmar. */}
      <div className="contents max-[420px]:hidden">{history}</div>
      <div className="shrink-0 max-[420px]:[&_button]:size-9">{sound}</div>
      <button
        type="button"
        aria-label="Meny"
        onClick={onMenu}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm max-[420px]:size-9"
      >
        <Menu aria-hidden className="size-5 max-[420px]:size-4" />
      </button>
    </div>
  )
}

// Statusradens text: vad jag ska göra, eller vem vi väntar på (waitingFor visar figuren och punkter som hoppar).
function statusText(
  table: TantTable,
  meId: string,
  name: (id: string) => string,
  bombShowing: boolean,
  canNope: boolean,
): { text: string; short: string; mine: boolean; waitingFor: string | null } {
  const say = (text: string, short: string, mine: boolean, waitingFor: string | null = null) => ({ text, short, mine, waitingFor })
  if (table.winner) {
    const text = bombShowing ? 'Exploderande tant!' : `${name(table.winner)} vinner!`
    return say(text, text, false)
  }
  // Den som är ute ser vems tur det är, som alla andra. Att man är ute står längst ner.
  const playing = !table.out.includes(meId)
  if (table.step === 'window') {
    if (canNope) return say('Säg Nope! om du vill stoppa kortet', 'Säg Nope?', true)
    // Nope!-chansen står bara vid nedräkningen. Här står bara vems tur det är.
    return table.current === meId && playing ? say('Din tur', 'Din tur', false) : say(`${name(table.current)}s tur`, 'har turen', false, table.current)
  }
  if (table.step === 'pick' && table.pick) {
    if (table.pick.by === meId) return say(`Välj ett kort ur ${name(table.pick.from)}s hand`, 'Välj ett kort', true)
    return say(`${name(table.pick.by)} väljer ett kort`, 'väljer ett kort', false, table.pick.by)
  }
  if (table.step === 'give' && table.favor) {
    if (table.favor.from === meId) return say(`Välj ett kort att ge ${name(table.favor.to)}`, `Ge ${name(table.favor.to)} ett kort`, true)
    return say(`${name(table.favor.from)} väljer ett kort`, 'väljer ett kort', false, table.favor.from)
  }
  if (table.current === meId && playing) {
    if (table.step === 'place') return say('Göm tanten i högen', 'Göm tanten', true)
    if (table.step === 'arrange') return say('Ordna de översta korten', 'Ordna korten', true)
    // Turerna kvar vid attack står på koppen.
    return say('Spela kort eller dra', 'Spela eller dra', true)
  }
  return say(`${name(table.current)} funderar`, 'funderar', false, table.current)
}

// Tre punkter som hoppar efter texten (står still med "minska rörelse").
function Dots() {
  return (
    <span aria-hidden className="ml-1 inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-current opacity-60 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  )
}

// Historiken bakom en liten knapp uppe till höger, med en siffra för händelser som kommit sedan man tittade senast.
function HistoryButton({ table, onOpen }: { table: TantTable; onOpen: () => void }) {
  const lastN = table.log.at(-1)?.n ?? 0
  const [seen, setSeen] = useState(lastN)
  const unread = table.log.filter((event) => event.n > seen).length
  return (
    <button
      type="button"
      aria-label={unread > 0 ? `Det som hänt, ${unread} nya` : 'Det som hänt'}
      onClick={() => {
        setSeen(lastN)
        onOpen()
      }}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm"
    >
      <ScrollText aria-hidden className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary-button px-1 text-[11px] font-bold text-primary-foreground tabular-nums">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

// Motspelarna i turordning, från den som kommer efter mig: figur, namn och en liten solfjäder med baksidor. Den som har
// tur lyser. Raden går att svepa när de inte får plats, och den som har tur scrollas fram.
// playingId = den som just spelat ett kort (Nope!-fönstret): platsen lyser.
function Opponents({ state, table, meId, playingId }: { state: GameState; table: TantTable; meId: string; playingId: string | null }) {
  const start = Math.max(0, table.order.indexOf(meId))
  const ids = [...table.order.slice(start + 1), ...table.order.slice(0, start)].filter((id) => id !== meId)
  const listRef = useRef<HTMLUListElement>(null)
  // Den som har tur, eller är mål för ett kort, rullas alltid fram (så att pilen pekar på en synlig plats).
  const focus = table.step === 'window' && table.pending?.target && table.pending.target !== meId ? table.pending.target : table.current
  useEffect(() => {
    const seat = listRef.current?.querySelector(`[data-seat="${CSS.escape(focus)}"]`)
    seat?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [focus])
  return (
    <ul
      ref={listRef}
      aria-label="Motspelarna"
      className="flex shrink-0 justify-center-safe gap-1.5 overflow-x-auto px-3 pt-1.5 pb-2 [scrollbar-width:none] max-[420px]:gap-1 max-[420px]:px-1.5"
    >
      {ids.map((id) => {
        const out = table.out.includes(id)
        const turn = table.current === id && !out && !table.winner
        return (
          <li key={id} data-seat={id} className="shrink-0">
            <Opponent state={state} id={id} out={out} turn={turn} playing={playingId === id} count={table.handCounts[id] ?? 0} narrow={ids.length > 4} />
          </li>
        )
      })}
    </ul>
  )
}

// narrow: med fler än fyra motspelare blir platserna smalare, så att fem får plats på 360 px.
function Opponent({
  state,
  id,
  out,
  turn,
  playing,
  count,
  narrow,
}: {
  state: GameState
  id: string
  out: boolean
  turn: boolean
  playing: boolean
  count: number
  narrow: boolean
}) {
  const [open, setOpen] = useState(false)
  const throws = useThrows()
  const wait = useThrowWait(throws?.lastThrowAt ?? null)
  const name = state.players[id]?.name ?? 'Någon'
  // Kort namn på smala skärmar: botarna har redan roboten, så "Bot-" behövs inte.
  const shortName = state.players[id]?.bot ? name.replace(/^Bot-/, '') : name
  const canThrow = !!throws?.allowed && throws.targets.some((target) => target.id === id)
  const seat = (
    <span
      className={cn(
        'relative flex items-center gap-1.5 rounded-full bg-card/85 py-0.5 pr-2.5 pl-0.5 shadow-soft-sm backdrop-blur-sm motion-safe:transition-[transform,background-color] motion-safe:duration-300 max-[420px]:max-w-[5.25rem] max-[420px]:gap-1 max-[420px]:pr-2',
        narrow ? 'max-w-32 md:max-w-40' : 'max-w-40 md:max-w-52',
        // Den som har tur är större och lyser (på en telefon utan att ta mer plats i sidled).
        turn && 'z-10 mx-1.5 scale-110 bg-coral-soft shadow-[0_0_18px_5px] shadow-primary/60 ring-3 ring-primary max-[420px]:mx-0 max-[420px]:scale-100',
        // Spelar just ett kort: platsen lyser gult medan kortet ligger i mitten.
        playing && 'z-10 bg-sun-soft shadow-[0_0_22px_8px] shadow-sun ring-4 ring-sun',
        out && 'opacity-45 grayscale',
      )}
    >
      <span className="relative shrink-0">
        <LobbyFigur playerId={id} avatar={state.players[id]?.avatar ?? ''} lively={false} className="text-3xl max-[420px]:text-2xl md:text-4xl" />
        {/* På smala skärmar sitter roboten som ett litet märke på figuren, så att namnet får plats. */}
        {state.players[id]?.bot && (
          <Bot aria-hidden className="absolute -top-0.5 -left-0.5 size-3.5 rounded-full bg-card p-px min-[421px]:hidden" />
        )}
      </span>
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="flex max-w-full items-center gap-0.5 text-xs font-bold md:text-sm">
          {/* En bot har en liten robot vid namnet. */}
          {state.players[id]?.bot && <Bot aria-label="Bot" className="size-3.5 shrink-0 max-[420px]:hidden" />}
          <span className="truncate max-[420px]:hidden">{name}</span>
          <span className="truncate text-[11px] min-[421px]:hidden">{shortName}</span>
        </span>
        {out ? <span className="text-[11px] font-semibold text-muted-foreground">Ute</span> : <MiniFan count={count} />}
      </span>
    </span>
  )
  const label = `${name}, ${out ? 'ute' : `${count} kort`}${turn ? ', har turen' : ''}`
  if (!canThrow) return <div aria-label={label}>{seat}</div>
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}. Kasta något`}
        className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        {seat}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3" side="bottom">
        <p className="text-center font-heading font-bold">{name}</p>
        <p className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {wait > 0 ? `Du kan kasta igen om ${wait} s` : 'Kasta något'}
        </p>
        <div className="mt-1 flex justify-center gap-1.5">
          {THROW_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={wait > 0}
              aria-label={`Kasta ${item.text} på ${name}`}
              className="flex h-11 w-10 items-center justify-center rounded-md border bg-card text-2xl shadow-soft-sm hover:bg-sun-soft disabled:opacity-40"
              onClick={() => {
                throws?.throwAt(id, item.id)
                setOpen(false)
              }}
            >
              <Emoji emoji={item.emoji} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Det bara jag vet om kort som bytt hand (vilket kort som togs från mig, vad jag tog eller fick), för historiken. Bara i
// fliken, och bara från det att bordet visades.
type Note = { n: number; text: string }
function useMyNotes(tantView: MyTantView | null, state: GameState): Note[] {
  const [notes, setNotes] = useState<Note[]>([])
  const lost = tantView?.lost ?? null
  const drew = tantView?.drew ?? null
  const [seen, setSeen] = useState(() => ({ lost: lost?.n ?? 0, drew: drew?.n ?? 0 }))
  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  const added: Note[] = []
  if (lost && lost.n > seen.lost) {
    added.push({ n: lost.n, text: lost.gift ? `Du gav ${cardName(lost.type)} till ${name(lost.to)}.` : `${name(lost.to)} tog ${cardName(lost.type)} från dig.` })
  }
  if (drew?.from && drew.n > seen.drew) {
    added.push({ n: drew.n, text: drew.gift ? `${name(drew.from)} gav dig ${cardName(drew.type)}.` : `Du tog ${cardName(drew.type)} från ${name(drew.from)}.` })
  }
  if ((lost?.n ?? 0) > seen.lost || (drew?.n ?? 0) > seen.drew) {
    setSeen({ lost: Math.max(seen.lost, lost?.n ?? 0), drew: Math.max(seen.drew, drew?.n ?? 0) })
    if (added.length > 0) setNotes((list) => [...list, ...added].slice(-40))
  }
  return notes
}

// En liten solfjäder med baksidor (högst fem) och antalet kort. Får spelaren ett kort studsar antalet och "+1" (eller
// "−1") syns en stund, även med "minska rörelse".
function MiniFan({ count }: { count: number }) {
  const shown = Math.min(5, count)
  const mid = (shown - 1) / 2
  const previous = useRef(count)
  const [change, setChange] = useState<{ n: number; diff: number } | null>(null)
  useEffect(() => {
    const diff = count - previous.current
    previous.current = count
    if (diff === 0) return
    setChange((c) => ({ n: (c?.n ?? 0) + 1, diff }))
    const timer = setTimeout(() => setChange(null), 1000)
    return () => clearTimeout(timer)
  }, [count])
  return (
    <span aria-hidden className="flex h-5 items-end gap-1">
      {/* Smala skärmar: ett enda kort och siffran, så att namnet får plats. */}
      {count > 0 && <TantBaksida sizes="16px" className="w-3 drop-shadow-sm min-[421px]:hidden" />}
      <span className="relative h-5 w-9 max-[420px]:hidden">
        {Array.from({ length: shown }, (_, i) => (
          <TantBaksida
            key={i}
            sizes="16px"
            className="absolute bottom-0 w-3.5 origin-bottom drop-shadow-sm"
            style={{ left: `${10 + (i - mid) * 5}px`, rotate: `${(i - mid) * 12}deg` }}
          />
        ))}
      </span>
      <span key={change?.n ?? 0} className={cn('relative text-xs font-bold tabular-nums', change && 'inline-block animate-pop')}>
        {count}
        {change && (
          <span
            className={cn(
              'absolute -top-3.5 left-2 rounded-full px-1 text-[11px] font-bold whitespace-nowrap shadow-soft-sm',
              change.diff > 0 ? 'bg-mint text-accent-foreground' : 'bg-destructive text-primary-foreground',
            )}
          >
            {change.diff > 0 ? `+${change.diff}` : `−${-change.diff}`}
          </span>
        )}
      </span>
    </span>
  )
}

// Slänghögen ligger bredvid draghögen, nästan lika stor, med de senaste korten åt lite olika håll (andelar av
// draghögens bredd). Tillsammans tar högarna så här många draghögsbredder.
const DISCARD_SCALE = 0.9
const PILE_GAP = 0.12
const PILES_WIDE = 1 + PILE_GAP + DISCARD_SCALE + 0.1
// På höga, smala skärmar ligger slänghögen en bit in bakom draghögen (andel av draghögens bredd), så att högarna kan
// växa och fylla höjden i stället för att begränsas av bredden.
const PILE_TUCK = 0.38
const PILES_WIDE_TIGHT = 1 + DISCARD_SCALE - PILE_TUCK + 0.1
// De översta korten i slänghögen ligger åt lite olika håll, som om de slängts dit (grader, översta sist).
const DISCARD_TILT = [-7, 4, 11]

// Draghögen och slänghögen fyller mitten av bordet. Draghögen är tjock som en riktig kortlek: tryck på den för att dra
// när det är min tur. Slänghögen bredvid visar de senaste korten, och är en tydlig plats på filten när den är tom.
function Piles({
  table,
  size,
  canDraw,
  onDraw,
  activity,
  avatar,
  tight = false,
}: {
  table: TantTable
  size: number
  // Slänghögen en bit bakom draghögen (höga, smala skärmar).
  tight?: boolean
  canDraw: boolean
  onDraw: () => void
  // Någon gömmer tanten, möblerar om eller tittar i högen: etiketten och en liten animation vid draghögen.
  activity: Activity | null
  avatar: string
}) {
  const sizes = `${size}px`
  const hiding = activity?.kind === 'hide'
  const discard = Math.round(size * DISCARD_SCALE)
  const layers = Math.min(6, Math.ceil(table.deckCount / 5))
  const shown = table.discardTop.slice(-3)
  const thickness = layers * Math.max(2, Math.round(size / 80))
  return (
    <div className="flex items-end justify-center" style={{ gap: tight ? 0 : Math.round(size * PILE_GAP) }}>
      {/* Draghögen studsar till när det blir min tur. Den ligger överst när slänghögen ligger en bit bakom. */}
      <div className={cn('relative z-10 flex flex-col items-center gap-1.5', canDraw && 'motion-safe:animate-hop')} style={{ width: size }}>
        <button
          type="button"
          disabled={!canDraw}
          onClick={onDraw}
          aria-label={canDraw ? `Dra ett kort. ${table.deckCount} kort i högen` : `Draghögen, ${table.deckCount} kort`}
          className={cn(
            'relative block w-full rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:cursor-default',
            canDraw && 'ring-4 ring-primary motion-safe:animate-turn-pulse',
          )}
          style={{ marginBottom: thickness }}
          data-tant-pile
        >
          {/* Min tur: ett sken runt högen som pulserar (står still med "minska rörelse"). */}
          {canDraw && (
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-[1.4rem] bg-primary/25 shadow-[0_0_40px_14px] shadow-primary/50 motion-safe:animate-light-pulse"
            />
          )}
          {/* Kortleken: baksidor förskjutna några pixlar, så att den ser tjock ut. När någon gömmer tanten fläktas den isär. */}
          {Array.from({ length: layers }, (_, i) => {
            const offset = ((layers - i) * thickness) / layers
            const fan = hiding ? (i - layers / 2) * size * 0.035 : 0
            return (
              <TantBaksida
                key={i}
                sizes={sizes}
                className="absolute inset-0 w-full motion-safe:transition-transform motion-safe:duration-300"
                style={{ transform: `translate(${offset + fan}px, ${offset}px) rotate(${hiding ? fan / 6 : 0}deg)` }}
              />
            )
          })}
          {table.deckCount > 0 ? (
            <TantBaksida sizes={sizes} className="relative w-full drop-shadow-md" />
          ) : (
            <span className="block aspect-[107/147] w-full rounded-lg border-2 border-dashed border-foreground/30" />
          )}
          {/* Antalet kort och tanter i högen. */}
          <span className="absolute -top-2.5 -left-2 z-10 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-background tabular-nums shadow-soft-sm md:text-sm">
            {table.deckCount} kort · {bombText(table)}
          </span>
          {/* Min tur: Dra! på själva högen. */}
          {canDraw && (
            <span className="absolute inset-x-0 bottom-[12%] z-10 flex justify-center">
              <span className="rounded-full bg-primary-button px-5 py-1 font-heading text-xl font-bold text-primary-foreground shadow-primary motion-safe:animate-dra-pulse md:text-3xl">
                Dra!
              </span>
            </span>
          )}
          <PileActivity kind={activity?.kind ?? null} size={size} />
          {activity && (
            <span className="pointer-events-none absolute inset-x-0 -bottom-3 z-20 flex justify-center">
              <WaitTag playerId={activity.playerId} avatar={avatar} text={activity.text} />
            </span>
          )}
        </button>
        {/* På smala skärmar står min plats (där turkoppen landar) här, och högen har redan antalet och Dra!. */}
        <span className="rounded-full bg-card/85 px-2.5 py-0.5 text-xs font-semibold shadow-soft-sm backdrop-blur-sm max-[420px]:invisible md:text-sm">
          Draghögen
        </span>
      </div>

      {/* Slänghögen tar inga tryck. */}
      <div
        aria-label={`Slänghögen, ${table.discardCount} kort`}
        className="pointer-events-none flex flex-col items-center gap-1.5"
        style={{ width: discard, marginLeft: tight ? -Math.round(size * PILE_TUCK) : 0 }}
      >
        <div className="relative aspect-[107/147] w-full" style={{ marginBottom: thickness }}>
          {/* Platsen på filten, så att slänghögen syns även när den är tom. */}
          <span className="absolute inset-0 rounded-lg bg-card/40 ring-2 ring-foreground/20 ring-inset" />
          {shown.map((type, i) => {
            const latest = i === shown.length - 1
            return (
              <div
                key={`${table.discardCount - shown.length + i}-${type}`}
                aria-hidden={!latest}
                className={cn('absolute inset-0 drop-shadow-lg', latest && 'motion-safe:animate-pop')}
                style={{ rotate: `${DISCARD_TILT[i + 3 - shown.length]}deg` }}
              >
                <TantKort type={type} size="small" sizes={`${discard}px`} className="w-full" />
              </div>
            )
          })}
        </div>
        <span className="rounded-full bg-card/85 px-2.5 py-0.5 text-xs font-semibold tabular-nums shadow-soft-sm backdrop-blur-sm md:text-sm">
          Slänghögen {table.discardCount}
        </span>
      </div>
    </div>
  )
}

// Bakgrundsmönstret i hela Exploderande Tanter (samma som i väntrummet).
const TANT_PATTERN = '/images/tantpanik/vantrum-monster.webp'

// "1 tant" eller "3 tanter", för etiketten på draghögen.
function bombText(table: TantTable): string {
  const bombs = bombsInDeck(table)
  return bombs === 1 ? '1 tant' : `${bombs} tanter`
}

// Hur länge en pratbubbla syns (ms), och hur många som får vänta på sin tur (de äldsta hoppas över).
const BUBBLE_MS = 2600
const BUBBLE_QUEUE = 3

// Det som händer vid bordet, en händelse i taget. quiet = det syns redan på annat sätt (Nope!-fönstret, en explosion,
// en popup eller ett väntebesked), så händelserna hoppas över. Det som fanns när bordet visades visas inte.
function useEventBubbles(log: TantEvent[], quiet: boolean): TantEvent | null {
  const seen = useRef(log.at(-1)?.n ?? 0)
  // Den första i kön är den som syns. Den tas bort när tiden gått.
  const [queue, setQueue] = useState<TantEvent[]>([])
  useEffect(() => {
    const fresh = log.filter((event) => event.n > seen.current)
    if (fresh.length === 0) return
    seen.current = fresh.at(-1)!.n
    if (quiet) return
    setQueue((list) => [list[0], ...[...list.slice(1), ...fresh].slice(-BUBBLE_QUEUE)].filter((event) => event !== undefined))
  }, [log, quiet])
  const shown = queue[0] ?? null
  useEffect(() => {
    if (!shown) return
    const timer = setTimeout(() => setQueue((list) => (list[0] === shown ? list.slice(1) : list)), BUBBLE_MS)
    return () => clearTimeout(timer)
  }, [shown])
  return quiet ? null : shown
}

// Vem händelsen handlar om: den spelare vars namn texten börjar med (det längsta namnet vinner, "Mia 2" före "Mia").
function eventPlayer(state: GameState, text: string): string | null {
  let best: string | null = null
  let length = 0
  for (const [id, player] of Object.entries(state.players)) {
    if (text.startsWith(player.name) && player.name.length > length) {
      best = id
      length = player.name.length
    }
  }
  return best
}

// En händelse som en stor pratbubbla med spelarens figur. Tonas in och ut (med "minska rörelse" utan rörelse).
function EventBubble({ event, state }: { event: TantEvent; state: GameState }) {
  const player = eventPlayer(state, event.text)
  return (
    <div
      role="status"
      className="relative flex max-w-[min(32rem,100%)] items-center gap-2.5 rounded-3xl bg-card/95 py-2 pr-4 pl-2 shadow-lift motion-safe:animate-pop"
    >
      {player && <LobbyFigur playerId={player} avatar={state.players[player]?.avatar ?? ''} className="shrink-0 text-4xl md:text-5xl" />}
      <p className="font-heading text-base leading-snug font-bold text-balance md:text-xl">{event.text}</p>
      {/* Pratbubblans spets, nedåt mot högarna. */}
      <span aria-hidden className="absolute -bottom-2 left-10 size-4 rotate-45 bg-card/95" />
    </div>
  )
}

// Hur länge utdelningen och banderollen vid matchstart varar (ms).
const DEAL_MS = 1500
const START_BANNER_MS = 1300

// Matchstart: korten delas ut från högen och flyger till varje spelare (och min hand), och sedan "[namn] börjar!" som
// en stor banderoll. Bara när inget har hänt än i matchen. Ett tryck hoppar över. Med "minska rörelse" bara banderollen.
function DealIntro({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  const fresh = table.lastAction === null && table.log.length === 1 && !table.winner
  const [stage, setStage] = useState<'deal' | 'banner' | 'done'>(() => (fresh ? (reducedMotionNow() ? 'banner' : 'deal') : 'done'))
  const [flights, setFlights] = useState<{ key: string; from: { x: number; y: number }; to: { x: number; y: number }; delay: number }[]>([])
  const [flying, setFlying] = useState(false)
  useLayoutEffect(() => {
    if (stage !== 'deal') return
    const pile = document.querySelector('[data-tant-pile]')?.getBoundingClientRect()
    if (!pile) return
    const from = { x: pile.left + pile.width / 2, y: pile.top + pile.height / 2 }
    const targets = table.order.map((id) => {
      const element = id === meId ? document.querySelector('[data-tant-hand]') : document.querySelector(`[data-seat="${CSS.escape(id)}"]`)
      const box = element?.getBoundingClientRect()
      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null
    })
    const list: typeof flights = []
    for (let round = 0; round < 3; round++) {
      targets.forEach((to, i) => {
        if (to) list.push({ key: `${round}-${i}`, from, to, delay: (round * targets.length + i) * (DEAL_MS * 0.6) / (3 * targets.length) })
      })
    }
    setFlights(list)
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setFlying(true)))
    const timer = setTimeout(() => setStage('banner'), DEAL_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
    // Bara en gång, när bordet visas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  useEffect(() => {
    if (stage !== 'banner') return
    const timer = setTimeout(() => setStage('done'), START_BANNER_MS)
    return () => clearTimeout(timer)
  }, [stage])
  if (stage === 'done') return null
  const starter = table.order[0]
  const width = 56
  return (
    <button type="button" aria-label="Hoppa över utdelningen" onClick={() => setStage('done')} className="fixed inset-0 z-[58] cursor-default">
      {stage === 'deal' &&
        flights.map((flight) => (
          <span
            key={flight.key}
            aria-hidden
            className="pointer-events-none fixed transition-[transform,opacity] duration-500 ease-out"
            style={{
              left: flight.from.x - width / 2,
              top: flight.from.y - (width * 147) / 107 / 2,
              width,
              transitionDelay: `${flight.delay}ms`,
              transform: flying ? `translate(${flight.to.x - flight.from.x}px, ${flight.to.y - flight.from.y}px) scale(0.5)` : 'none',
              opacity: flying ? 0.2 : 1,
            }}
          >
            <TantBaksida sizes={`${width}px`} className="w-full drop-shadow-lg" />
          </span>
        ))}
      {stage === 'banner' && (
        <span className="pointer-events-none fixed inset-x-0 top-[30%] flex justify-center px-2">
          <span className="flex items-center gap-3 rounded-full bg-card px-6 py-3 shadow-lift motion-safe:animate-pop md:px-10 md:py-5">
            <LobbyFigur playerId={starter} avatar={state.players[starter]?.avatar ?? ''} className="text-5xl md:text-7xl" />
            <span className="font-heading text-3xl font-bold whitespace-nowrap md:text-5xl">
              {starter === meId ? 'Du börjar!' : `${state.players[starter]?.name ?? 'Någon'} börjar!`}
            </span>
          </span>
        </span>
      )}
    </button>
  )
}
