import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, Menu, ScrollText } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import type { TantViewProps } from '@/components/lobby/types'
import { TableAnimations, type Incoming } from '@/components/tantpanik/TantAnimationer'
import { TantHand } from '@/components/tantpanik/TantHand'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { HistoryDialog, MenuDialog, RulesDialog } from '@/components/tantpanik/TantMenyer'
import { FutureView, NopeVerdict, NopeWindow, PickCard, Place } from '@/components/tantpanik/TantSteg'
import { GivePopup } from '@/components/tantpanik/TantVal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReactions, useThrows } from '@/hooks/useReactions'
import { Konfetti } from '@/components/Konfetti'
import { loadMusicVolume, tantMusic } from '@/lib/tantmusik'
import { SoundControl } from '@/components/tantpanik/TantLjud'
import { loadSoundOn, playBullseye, playTurn, saveSoundOn } from '@/lib/ljud'
import { useThrowWait } from '@/hooks/useThrowWait'
import { THROW_ITEMS } from '@/lib/kast'
import type { GameState } from '@/lib/match'
import { bombsInDeck, waitingFor, type TantEvent, type TantTable } from '@/lib/tantpanik'
import { cn } from '@/lib/utils'

// Hur länge ett besked syns innan det försvinner (ms).
const NOTICE_MS = 2500

// Exploderande Tanter: hela matchen som ett kortbord som tar hela skärmen. Överst vad jag ska göra, sedan motspelarna,
// högarna i mitten, en rad med det senaste och min hand längst ner. Reglerna, menyn och historiken ligger bakom knappar.
// Prispallen efteråt är gemensam för alla spel.
export function TantpanikView({ state, me, isHost, clockOffset, tantView, onMove, onAbort, onLeave }: TantViewProps) {
  const table = state.tantpanik
  const [rules, setRules] = useState(false)
  const [menu, setMenu] = useState(false)
  const [history, setHistory] = useState(false)
  // Se framtiden ligger kvar tills jag trycker Klar: vilken titt jag redan stängt.
  const [dismissedPeek, setDismissedPeek] = useState<string | null>(null)
  const peekKey = tantView?.peek && table ? `${tantView.peek.join()}|${table.discardCount}|${table.current}` : null
  const popupOpen = !!table && hasPopup(table, tantView, me.id, peekKey !== null && peekKey !== dismissedPeek)
  // Gamla besked försvinner när en popup öppnas, och visas aldrig ovanpå den.
  const notice = useFleeting(tantView?.notice ?? null, popupOpen)
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
  const [pileRef, pileSize] = usePileSize()
  // Hur mycket handen ligger över bordets nederkant (px). Högarna lämnar plats för den.
  const [handOverlap, setHandOverlap] = useState(0)
  // Kortet jag just drog, medan det visas stort (show) och medan det glider ner till sin plats i handen (land).
  const [incoming, setIncoming] = useState<Incoming>(null)
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
  const [musicVolume, setMusicVolume] = useState(loadMusicVolume)
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
  useLayoutEffect(() => {
    const element = handBoxRef.current
    if (!element) return
    const measure = () => setHandTop(Math.max(0, window.innerHeight - element.getBoundingClientRect().top))
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
  const myTurn = inMatch && !out && !table.winner && table.current === me.id
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
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-background bg-repeat pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
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
            musicVolume={musicVolume}
            onMusicVolume={setMusicVolume}
          />
        }
        onRules={() => setRules(true)} onMenu={() => setMenu(true)} />
      <Opponents state={state} table={table} meId={me.id} />


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
            incoming={incoming}
            orderKey={`${me.id}:${table.order.join(',')}`}
          />
        ) : (
          <p className="mx-2 mb-3 rounded-md bg-card px-3 py-3 text-center text-sm font-semibold shadow-soft-sm">
            {!inMatch ? 'Du är med från nästa match.' : out ? 'Du är ute. Följ resten av matchen.' : 'Din hand kommer strax…'}
          </p>
        )}
      </div>

      {myTurn && (
        // Min tur: en ram som lyser runt hela skärmen. Den tar inga tryck.
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[35] rounded-[inherit] shadow-[inset_0_0_0_6px_var(--color-primary),inset_0_0_48px_8px_color-mix(in_oklch,var(--color-primary)_55%,transparent)] motion-safe:animate-light-pulse"
        />
      )}
      <TurnBanner state={state} table={table} meId={me.id} />
      <DealIntro state={state} table={table} meId={me.id} />
      {nopeOpen && (
        // Det spelade kortet stort mellan statusraden och handen, så att det syns även när handen tar mycket plats på en
        // telefon. Rutan tar inga tryck, så att Nope!-knappen och korten i handen går att trycka på.
        <div
          className="pointer-events-none fixed inset-x-0 top-16 z-[44] bg-foreground/35 px-2 pt-1 motion-safe:animate-fade lg:top-20"
          // Plats ovanför handen för kort som lyfts (t.ex. Nope!-kortet som hoppar upp).
          style={{ bottom: handTop + Math.round(handOverlap * 0.9) + 8 }}
        >
          <NopeWindow state={state} table={table} meId={me.id} clockOffset={clockOffset} canNope={canNope} />
        </div>
      )}
      {verdict && <NopeVerdict key={verdict.n} stopped={verdict.stopped} />}
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
      <MenuDialog open={menu} onOpenChange={setMenu} isHost={isHost} onAbort={onAbort} onLeave={onLeave} />
      <HistoryDialog open={history} onOpenChange={setHistory} table={table} />
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

// Den som just spelade Se framtiden (och inte blev stoppad), en stund efter att Nope!-fönstret stängts.
function usePeeker(table: TantTable | null): string | null {
  const pending = table?.step === 'window' ? table.pending : null
  const last = useRef<{ by: string; peek: boolean; stopped: boolean } | null>(null)
  const [peeker, setPeeker] = useState<string | null>(null)
  const open = pending !== null
  const nopes = pending?.nopes ?? 0
  useEffect(() => {
    if (open && pending) {
      last.current = { by: pending.by, peek: pending.kind === 'single' && pending.cards[0] === 'tjuvkika', stopped: nopes % 2 === 1 }
      return
    }
    const shown = last.current
    last.current = null
    if (!shown?.peek || shown.stopped) return
    setPeeker(shown.by)
    const timer = setTimeout(() => setPeeker(null), PEEK_TAG_MS)
    return () => clearTimeout(timer)
    // pending ändras med open och nopes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nopes])
  return peeker
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

// Hur länge banderollen syns när turen byts (ms).
const BANNER_MS = 1100

// När turen byts glider en stor banderoll över skärmen med figuren och "[namn]s tur!" eller "Din tur!". När det blir min
// tur vibrerar telefonen kort och ett ljud spelas. Med "minska rörelse" står banderollen still och tonas bara in.
function TurnBanner({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  const [banner, setBanner] = useState<{ n: number; id: string } | null>(null)
  const [slide, setSlide] = useState<'in' | 'mid' | 'out'>('in')
  const previous = useRef(table.current)
  const count = useRef(0)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const current = table.winner ? null : table.current
  useEffect(() => {
    if (!current || current === previous.current) return
    previous.current = current
    if (table.out.includes(current)) return
    count.current += 1
    const n = count.current
    setBanner({ n, id: current })
    setSlide('in')
    if (current === meId) {
      navigator.vibrate?.(120)
      if (soundOn) {
        tantMusic.duck()
        playTurn()
      }
    }
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setSlide('mid')))
    const leave = setTimeout(() => setSlide('out'), BANNER_MS - 300)
    const hide = setTimeout(() => setBanner((b) => (b?.n === n ? null : b)), BANNER_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(leave)
      clearTimeout(hide)
    }
    // Bara när turen byts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])
  if (!banner) return null
  const mine = banner.id === meId
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[18%] z-[58] flex justify-center overflow-hidden px-2">
      <div
        className={cn(
          'flex items-center gap-3 rounded-full px-6 py-3 shadow-lift motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-reduce:animate-fade md:px-10 md:py-5',
          mine ? 'bg-primary-button text-primary-foreground' : 'bg-card',
          slide === 'in' ? 'motion-safe:-translate-x-[120vw]' : slide === 'out' ? 'motion-safe:translate-x-[120vw]' : 'translate-x-0',
        )}
      >
        <LobbyFigur playerId={banner.id} avatar={state.players[banner.id]?.avatar ?? ''} className="text-5xl md:text-7xl" />
        <span className="font-heading text-3xl font-bold whitespace-nowrap md:text-5xl">
          {mine ? 'DIN TUR!' : `${state.players[banner.id]?.name ?? 'Någon'}s tur!`}
        </span>
      </div>
    </div>
  )
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
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      // Plats för texten under högarna, kortlekens tjocklek och handen som ligger över bordets nederkant.
      const style = getComputedStyle(element)
      const height = element.clientHeight - parseFloat(style.paddingBottom) - 40
      const byHeight = height * (107 / 147)
      const byWidth = (element.clientWidth - 24) / PILES_WIDE
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
  return [ref, size] as const
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
    <div className="flex shrink-0 items-center gap-1.5 px-2 py-1.5 lg:gap-2 lg:py-2">
      <button
        type="button"
        aria-label="Så spelas det"
        onClick={onRules}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm"
      >
        <CircleHelp aria-hidden className="size-5" />
      </button>
      {/* Vad jag ska göra just nu. Korallröd när det är något jag ska göra. */}
      <p
        role="status"
        className={cn(
          'flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-3xl px-3 py-1 text-center font-heading text-base leading-tight font-bold text-balance backdrop-blur-sm sm:text-lg lg:text-2xl',
          status.mine ? 'bg-primary-button text-primary-foreground shadow-primary' : 'bg-card/90 shadow-soft-sm',
        )}
      >
        {status.waitingFor && (
          <LobbyFigur playerId={status.waitingFor} avatar={state.players[status.waitingFor]?.avatar ?? ''} className="shrink-0 text-2xl lg:text-3xl" />
        )}
        <span className="min-w-0">
          {status.text}
          {status.waitingFor && <Dots />}
        </span>
      </p>
      {history}
      {sound}
      <button
        type="button"
        aria-label="Meny"
        onClick={onMenu}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm"
      >
        <Menu aria-hidden className="size-5" />
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
): { text: string; mine: boolean; waitingFor: string | null } {
  const turns = table.turnsLeft > 1 ? ` (${table.turnsLeft} turer kvar)` : ''
  if (table.winner) return { text: bombShowing ? 'Exploderande tant!' : `${name(table.winner)} vinner!`, mine: false, waitingFor: null }
  if (table.out.includes(meId)) return { text: 'Du är ute. Följ resten av matchen', mine: false, waitingFor: null }
  if (table.step === 'window') {
    if (canNope) return { text: 'Säg Nope! om du vill stoppa kortet', mine: true, waitingFor: null }
    return { text: 'Någon kan säga Nope!', mine: false, waitingFor: null }
  }
  if (table.step === 'pick' && table.pick) {
    if (table.pick.by === meId) return { text: `Välj ett kort ur ${name(table.pick.from)}s hand`, mine: true, waitingFor: null }
    return { text: `${name(table.pick.by)} väljer ett kort`, mine: false, waitingFor: table.pick.by }
  }
  if (table.step === 'give' && table.favor) {
    if (table.favor.from === meId) return { text: `Välj ett kort att ge ${name(table.favor.to)}`, mine: true, waitingFor: null }
    return { text: `${name(table.favor.from)} väljer ett kort`, mine: false, waitingFor: table.favor.from }
  }
  if (table.current === meId) {
    if (table.step === 'place') return { text: 'Göm tanten i högen', mine: true, waitingFor: null }
    if (table.step === 'arrange') return { text: 'Ordna de översta korten', mine: true, waitingFor: null }
    return { text: `Din tur! Spela kort eller dra från högen${turns}`, mine: true, waitingFor: null }
  }
  return { text: `${name(table.current)} funderar`, mine: false, waitingFor: table.current }
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
function Opponents({ state, table, meId }: { state: GameState; table: TantTable; meId: string }) {
  const start = Math.max(0, table.order.indexOf(meId))
  const ids = [...table.order.slice(start + 1), ...table.order.slice(0, start)].filter((id) => id !== meId)
  const current = useRef<HTMLLIElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [table.current])
  return (
    <ul aria-label="Motspelarna" className="flex shrink-0 justify-center-safe gap-1.5 overflow-x-auto px-3 pt-1.5 pb-2 [scrollbar-width:none]">
      {ids.map((id) => {
        const out = table.out.includes(id)
        const turn = table.current === id && !out && !table.winner
        return (
          <li key={id} ref={turn ? current : undefined} data-seat={id} className="shrink-0">
            <Opponent state={state} id={id} out={out} turn={turn} count={table.handCounts[id] ?? 0} narrow={ids.length > 4} />
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
  count,
  narrow,
}: {
  state: GameState
  id: string
  out: boolean
  turn: boolean
  count: number
  narrow: boolean
}) {
  const [open, setOpen] = useState(false)
  const throws = useThrows()
  const wait = useThrowWait(throws?.lastThrowAt ?? null)
  const name = state.players[id]?.name ?? 'Någon'
  const canThrow = !!throws?.allowed && throws.targets.some((target) => target.id === id)
  const seat = (
    <span
      className={cn(
        'relative flex items-center gap-1.5 rounded-full bg-card/85 py-0.5 pr-2.5 pl-0.5 shadow-soft-sm backdrop-blur-sm motion-safe:transition-[transform,background-color] motion-safe:duration-300',
        narrow ? 'max-w-32 md:max-w-40' : 'max-w-40 md:max-w-52',
        // Den som har tur är större och lyser.
        turn && 'z-10 mx-1.5 scale-110 bg-coral-soft shadow-[0_0_18px_5px] shadow-primary/60 ring-3 ring-primary',
        out && 'opacity-45 grayscale',
      )}
    >
      <LobbyFigur playerId={id} avatar={state.players[id]?.avatar ?? ''} className="shrink-0 text-3xl md:text-4xl" />
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="max-w-full truncate text-xs font-bold md:text-sm">{name}</span>
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

// En liten solfjäder med baksidor (högst fem) och antalet kort.
function MiniFan({ count }: { count: number }) {
  const shown = Math.min(5, count)
  const mid = (shown - 1) / 2
  return (
    <span aria-hidden className="flex h-5 items-end gap-1">
      <span className="relative h-5 w-9">
        {Array.from({ length: shown }, (_, i) => (
          <TantBaksida
            key={i}
            sizes="16px"
            className="absolute bottom-0 w-3.5 origin-bottom drop-shadow-sm"
            style={{ left: `${10 + (i - mid) * 5}px`, rotate: `${(i - mid) * 12}deg` }}
          />
        ))}
      </span>
      <span className="text-xs font-bold tabular-nums">{count}</span>
    </span>
  )
}

// Slänghögen ligger bredvid draghögen, nästan lika stor, med de senaste korten åt lite olika håll (andelar av
// draghögens bredd). Tillsammans tar högarna så här många draghögsbredder.
const DISCARD_SCALE = 0.9
const PILE_GAP = 0.12
const PILES_WIDE = 1 + PILE_GAP + DISCARD_SCALE + 0.1
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
}: {
  table: TantTable
  size: number
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
    <div className="flex items-end justify-center" style={{ gap: Math.round(size * PILE_GAP) }}>
      {/* Draghögen studsar till när det blir min tur. */}
      <div className={cn('flex flex-col items-center gap-1.5', canDraw && 'motion-safe:animate-hop')} style={{ width: size }}>
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
              <span className="rounded-full bg-primary-button px-5 py-1 font-heading text-xl font-bold text-primary-foreground shadow-primary md:text-3xl">
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
        <span className="rounded-full bg-card/85 px-2.5 py-0.5 text-xs font-semibold shadow-soft-sm backdrop-blur-sm md:text-sm">Draghögen</span>
      </div>

      {/* Slänghögen tar inga tryck. */}
      <div aria-label={`Slänghögen, ${table.discardCount} kort`} className="pointer-events-none flex flex-col items-center gap-1.5" style={{ width: discard }}>
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
