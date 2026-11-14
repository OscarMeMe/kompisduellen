import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Stjarnstank } from '@/components/Stjarnstank'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { useReactions } from '@/hooks/useReactions'
import { useSkipGuard } from '@/hooks/useSkipGuard'
import { BOMB_RESULT_MS, BOMB_SKIP_AFTER_MS, skipDelay } from '@/lib/hoppaover'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { Stamp } from '@/components/Stamp'
import { loadSoundOn, playBoom } from '@/lib/ljud'
import { playTantSound } from '@/lib/tantljud'
import { tantMusic } from '@/lib/tantmusik'
import { cn } from '@/lib/utils'
import type { GameState } from '@/lib/match'
import type { MyTantView, TantTable } from '@/lib/tantpanik'
import { cardName, type CardType } from '@/lib/tantpanik-kort'

// Hur länge det dragna kortet visas stort innan det åker ner till handen, och hur länge tanten visas (ms).
const SHOW_MS = 2000
// Explosionen: när det smäller (ms efter att kortet börjat vändas), när Desarmera landar och när allt är klart.
const BOOM_AT = 450
const DEFUSE_AT = 1350
const OUT_AT = 1150
const BOMB_SAVED_MS = 3000
const BOMB_OUT_MS = 2700
const TO_HAND_MS = 450
const FLY_MS = 480
// Kommer mitt kort mer än så här långt efter att alla sett att jag drog, visas det inte (ms).
const LATE_MS = 3000

// Kortet jag just fick, medan det visas stort (show: det har ingen plats i handen än) och medan det glider ner till sin
// plats (land: de andra korten gör plats, men det syns först när det landat).
export type Incoming = { id: string; phase: 'show' | 'land' } | null

type Show = { n: number; kind: 'mine'; type: CardType; id: string | null; from: string | null; gift: boolean }
type Bomb = { n: number; player: string; saved: boolean }
// En baksida (face null) eller ett kort som flyger från en plats till en annan.
type Flight = { n: number; left: number; top: number; width: number; dx: number; dy: number; face: CardType | null }
type Waiting = { n: number; at: number }

// Det som händer vid bordet, som animationer ovanpå det.
// - Ett kort jag drar lyfts från högen, vänds upp mot mig och syns stort. Sedan krymper det och glider ner till sin
//   plats längst till höger i handen, medan de andra korten gör plats. Ett tryck hoppar över.
// - Ett kort jag tar från någon (par, tretal, tjänst) gör samma sak, men börjar vid den spelarens plats.
// - Ett kort som tas från mig lyfts ur handen och flyger till den som tog det.
// - Alla andra ser en baksida flyga: från högen när någon drar, och mellan platserna när ett kort byter hand.
// - En exploderande tant vänds för alla, bordet skakar och det smäller.
// Inget visas ovanpå ett kort som väntar på Nope!. Med "minska rörelse" visas kortet utan rörelser.
// onShake = bordet ska skaka (numret ändras varje gång). onIncoming = kortet jag fick, för handen.
export function TableAnimations({
  state,
  table,
  meId,
  tantView,
  onShake,
  onIncoming,
  onBomb,
}: {
  state: GameState
  table: TantTable
  meId: string
  tantView: MyTantView | null
  onShake: (n: number) => void
  onIncoming: (incoming: Incoming) => void
  // En explosion visas just nu (då väntar t.ex. Göm tanten och firandet av vinnaren).
  onBomb: (showing: boolean) => void
}) {
  const [show, setShow] = useState<Show | null>(null)
  const [bomb, setBomb] = useState<Bomb | null>(null)
  // Tantsnaran slog igen: ägaren (player) och tjuven (from).
  const [trap, setTrap] = useState<{ n: number; player: string; from: string } | null>(null)
  // Ett kort som någon tog från mig (inte ett jag gav med Tjänst): en stor ruta med kortet och vem som tog det.
  const [stolen, setStolen] = useState<{ n: number; type: CardType; by: string } | null>(null)
  useEffect(() => {
    onBomb(bomb !== null || trap !== null)
    // onBomb ändras inte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomb, trap])
  const [leaving, setLeaving] = useState(false)
  // Var kortet ska landa i handen (transform), när det glider ner.
  const [landing, setLanding] = useState<CSSProperties | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  // Det som redan fanns när bordet visades animeras inte (t.ex. efter en omladdning).
  const seen = useRef(table.lastAction?.n ?? 0)
  // Ett eget drag som syns i läget innan mitt kort kommit fram: numret och när det hände.
  const waitingMine = useRef<Waiting | null>(null)
  const waitingLost = useRef<Waiting | null>(null)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const blocked = table.step === 'window'

  function addFlight(flight: Flight | null) {
    if (!flight) return
    setFlights((list) => [...list, flight])
    setTimeout(() => setFlights((list) => list.filter((f) => f.n !== flight.n)), FLY_MS + 50)
  }

  // En ny händelse vid bordet.
  const action = table.lastAction
  useEffect(() => {
    if (!action || action.n <= seen.current) return
    seen.current = action.n
    const now = { n: action.n, at: Date.now() }
    if ((action.kind === 'draw' || action.kind === 'take') && action.player === meId) {
      waitingMine.current = now
    } else if (action.kind === 'take' && action.from === meId) {
      waitingLost.current = now
    } else if (action.kind === 'draw') {
      addFlight(fly(action.n, document.querySelector('[data-tant-pile]'), seatOf(action.player), null))
    } else if (action.kind === 'take' && action.from) {
      addFlight(fly(action.n, seatOf(action.from), seatOf(action.player), null))
    } else if (action.kind === 'bomb') {
      setBomb({ n: action.n, player: action.player, saved: !!action.saved })
    } else if (action.kind === 'trap' && action.from) {
      setTrap({ n: action.n, player: action.player, from: action.from })
    }
    // Bara när en ny händelse kommer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, meId])

  // Mitt kort kommer i mitt eget meddelande, ibland strax efter läget.
  const drew = tantView?.drew ?? null
  useEffect(() => {
    const waiting = waitingMine.current
    if (!drew || !waiting || drew.n !== waiting.n) return
    waitingMine.current = null
    if (Date.now() - waiting.at > LATE_MS) return
    setLeaving(false)
    setLanding(null)
    setShow({ n: drew.n, kind: 'mine', type: drew.type, id: drew.id ?? null, from: drew.from ?? null, gift: !!drew.gift })
    if (drew.id) onIncoming({ id: drew.id, phase: 'show' })
    // onIncoming ändras inte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drew])

  // Ett kort som togs från mig flyger från handen till den som tog det.
  const lost = tantView?.lost ?? null
  useEffect(() => {
    const waiting = waitingLost.current
    if (!lost || !waiting || lost.n !== waiting.n) return
    waitingLost.current = null
    if (Date.now() - waiting.at > LATE_MS) return
    addFlight(fly(lost.n, document.querySelector('[data-tant-hand]'), seatOf(lost.to), lost.type))
    if (!lost.gift) setStolen({ n: lost.n, type: lost.type, by: lost.to })
  }, [lost])

  // Klart: kortet ligger i handen (eller tanten är borta).
  function finish() {
    setShow(null)
    setLeaving(false)
    setLanding(null)
    onIncoming(null)
  }
  // Ett tryck hoppar över, men aldrig ett tryck som var på väg när kortet visades (t.ex. trycket på Dra!).
  const showGuard = useSkipGuard(finish, undefined, show?.n ?? null)

  // Kortet visas en stund och glider sedan ner till handen (tanten tonas bort).
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => setLeaving(true), SHOW_MS)
    return () => clearTimeout(timer)
  }, [show])
  useEffect(() => {
    if (!leaving || !show) return
    if (reducedMotion()) {
      finish()
      return
    }
    let frame = 0
    if (show.id) {
      const id = show.id
      onIncoming({ id, phase: 'land' })
      // Platsen i handen finns först när handen ritats om med kortet (osynligt) på sin plats.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setLanding(landingStyle(cardRef.current, id)))
      })
    }
    const timer = setTimeout(finish, TO_HAND_MS + 60)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
    // finish och onIncoming ändras inte på något sätt som spelar roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  return (
    <>
      {flights.map((flight) => (
        <FlyingCard key={flight.n} flight={flight} />
      ))}
      {bomb && (
        <BombShow
          key={bomb.n}
          bomb={bomb}
          meId={meId}
          name={name(bomb.player)}
          avatar={state.players[bomb.player]?.avatar ?? ''}
          soundOn={soundOn}
          last={!!state.tantpanik?.winner}
          onShake={() => onShake(bomb.n)}
          onDone={() => setBomb((current) => (current?.n === bomb.n ? null : current))}
        />
      )}
      {trap && (
        <TrapShow
          key={trap.n}
          text={
            trap.from === meId
              ? `Det var en Tantsnara! ${name(trap.player)} väljer kort ur din hand.`
              : trap.player === meId
                ? `${name(trap.from)} gick i din fälla!`
                : `${name(trap.from)} gick i ${name(trap.player)}s fälla!`
          }
          soundOn={soundOn}
          onShake={() => onShake(trap.n)}
          onDone={() => setTrap((current) => (current?.n === trap.n ? null : current))}
        />
      )}
      {stolen && !bomb && !trap && (
        <StolenShow
          key={stolen.n}
          type={stolen.type}
          name={name(stolen.by)}
          playerId={stolen.by}
          avatar={state.players[stolen.by]?.avatar ?? ''}
          onDone={() => setStolen((current) => (current?.n === stolen.n ? null : current))}
        />
      )}
      {/* Ett kort som väntar på Nope! döljs aldrig. */}
      {show && !blocked && !bomb && (
        <div
          role="status"
          className={
            'fixed inset-0 z-[59] flex flex-col items-center justify-center gap-3 px-4 transition-colors duration-300 ' +
            (leaving ? 'bg-transparent' : 'bg-foreground/45 motion-safe:animate-fade')
          }
          // Ett tryck hoppar över animationen: mitt kort hamnar direkt i handen.
          {...showGuard}
        >
          <div
            key={show.n}
            ref={cardRef}
            style={landing ?? undefined}
          >
            <div className="perspective-[1400px]">
              <div className="relative transform-3d motion-safe:animate-tant-reveal" style={fromStyle(show)}>
                <div className="backface-hidden">
                  {/* Lika stort som när man förstorar ett kort, men så att texten under får plats. */}
                  <TantKort
                    type={show.type}
                    size="zoom"
                    sizes={`${shownWidth()}px`}
                    className="drop-shadow-[0_18px_28px_rgb(0_0_0/0.4)]"
                    style={{ width: shownWidth() }}
                  />
                </div>
                <div aria-hidden className="absolute inset-0 rotate-y-180 backface-hidden">
                  <TantBaksida sizes="420px" className="size-full" />
                </div>
              </div>
            </div>
          </div>
          <p
            className={
              'rounded-full bg-card px-5 py-2 text-center font-heading text-2xl font-bold shadow-soft md:text-3xl ' +
              (leaving ? 'opacity-0 transition-opacity duration-200' : 'motion-safe:animate-pop')
            }
          >
            {show.from
              ? show.gift
                ? `Du fick ${cardName(show.type)} av ${name(show.from)}!`
                : `Du tog ${cardName(show.type)} från ${name(show.from)}!`
              : `Du drog: ${cardName(show.type)}`}
          </p>
        </div>
      )}
    </>
  )
}

// Hur brett det dragna kortet visas: som förstoringen (cirka 60 % av skärmhöjden på dator, minst 360 px brett, och
// hela bredden på mobil), men så att texten under kortet får plats.
function shownWidth(): number {
  const wide = window.innerWidth >= 768 || window.matchMedia?.('(pointer: fine)').matches
  const wanted = wide ? Math.max(360, window.innerHeight * 0.6 * (107 / 147)) : window.innerWidth - 24
  return Math.round(Math.min(wanted, window.innerWidth - 24, (window.innerHeight - 170) * (107 / 147)))
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function center(element: Element | null): { x: number; y: number } | null {
  if (!element) return null
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

// En motspelares plats vid bordet, eller min hand om det är jag.
function seatOf(player: string): Element | null {
  return document.querySelector(`[data-seat="${CSS.escape(player)}"]`) ?? document.querySelector('[data-tant-hand]')
}

// Kortet startar på högen, eller vid platsen för den jag tog det från: avståndet från skärmens mitt dit.
function fromStyle(show: Show | null): CSSProperties {
  const start = center(show?.from ? seatOf(show.from) : document.querySelector('[data-tant-pile]'))
  if (!start) return {}
  return { '--from-x': `${start.x - innerWidth / 2}px`, '--from-y': `${start.y - innerHeight / 2}px` } as CSSProperties
}

// Kortet krymper och glider till sin plats i handen, med samma lutning som de andra korten där.
function landingStyle(card: HTMLElement | null, id: string): CSSProperties | null {
  const target = document.querySelector(`[data-hand-card="${CSS.escape(id)}"]`) as HTMLElement | null
  if (!card || !target) return null
  const from = card.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const rotate = Number(target.dataset.rotate ?? 0)
  // Platsen utan lutning: knappens bredd är kortets bredd.
  const scale = target.offsetWidth / from.width
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  return {
    transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg) scale(${scale})`,
    transition: `transform ${TO_HAND_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  }
}

// Ett kort (eller en baksida) som lyfts från en plats och sveper i en båge till en annan, där det krymper och landar.
function fly(n: number, fromElement: Element | null, toElement: Element | null, face: CardType | null): Flight | null {
  if (reducedMotion() || !fromElement) return null
  const from = fromElement.getBoundingClientRect()
  const to = center(toElement)
  if (!to) return null
  // Stort och tydligt: som ett kort i handen, men aldrig större än det det kommer från.
  const width = Math.min(140, Math.max(84, from.width * 0.7))
  const height = width * (147 / 107)
  const left = from.left + from.width / 2 - width / 2
  const top = from.top + from.height / 2 - height / 2
  return { n, face, left, top, width, dx: to.x - (left + width / 2), dy: to.y - (top + height / 2) }
}

// Kortet i luften. Bågen ritas med Web Animations: upp och över, och ned i spelarens lilla solfjäder.
function FlyingCard({ flight }: { flight: Flight }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element?.animate) return
    const lift = Math.min(140, 60 + Math.abs(flight.dx) * 0.15)
    // Mellan två platser överst (ungefär samma höjd) går bågen nedåt över bordet, annars uppåt.
    const sideways = Math.abs(flight.dy) < 80 && flight.top < window.innerHeight * 0.35
    const midY = sideways ? lift : Math.min(0, flight.dy) * 0.5 - lift
    const animation = element.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${flight.dx * 0.5}px, ${midY}px) scale(0.85) rotate(-10deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${flight.dx}px, ${flight.dy}px) scale(0.28) rotate(8deg)`, opacity: 0.9 },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)', fill: 'forwards' },
    )
    return () => animation.cancel()
  }, [flight])
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed z-[48]" style={{ left: flight.left, top: flight.top, width: flight.width }}>
      {flight.face ? (
        <TantKort type={flight.face} size="small" sizes="144px" className="w-full drop-shadow-[0_10px_18px_rgb(0_0_0/0.35)]" />
      ) : (
        <TantBaksida sizes="144px" className="w-full drop-shadow-[0_10px_18px_rgb(0_0_0/0.35)]" />
      )}
    </div>
  )
}

// En exploderande tant, för alla: kortet lyfts från högen och vänds stort i mitten, skärmen blinkar och skakar, det
// smäller och BOOM! slås ned. Med Desarmera flyger Desarmera-kortet upp (ur min hand, eller från spelarens plats) och
// smäller ned ovanpå tanten med "Räddad!". Utan blir skärmen grå, och spelarens figur får en smäll och blir grå. Ett
// tryck hoppar över, men tidigast efter 1,5 s, och resultatet syns alltid i minst en sekund (hoppaover.ts). Med "minska
// rörelse" blinkar och skakar inget, men texterna, ordningen och tiderna är desamma.
function BombShow({
  bomb,
  meId,
  name,
  avatar,
  soundOn,
  last,
  onShake,
  onDone,
}: {
  bomb: Bomb
  meId: string
  name: string
  avatar: string
  soundOn: boolean
  // Matchens sista explosion: vinnarens jubel kommer strax efter, så trombonen spelas inte.
  last: boolean
  onShake: () => void
  onDone: () => void
}) {
  const [stage, setStage] = useState<'reveal' | 'boom' | 'after'>('reveal')
  const [flash, setFlash] = useState(false)
  // Desarmera-kortet: startar vid handen eller spelarens plats och landar på tanten.
  const [defuse, setDefuse] = useState<'away' | 'landed' | null>(null)
  const [defuseFrom] = useState(() => {
    const start = center(bomb.player === meId ? document.querySelector('[data-tant-hand]') : seatOf(bomb.player))
    return start ? { x: start.x - innerWidth / 2, y: start.y - innerHeight / 2 } : { x: 0, y: innerHeight / 2 }
  })
  const reduced = reducedMotion()
  const mine = bomb.player === meId
  // Ett tryck hoppar över, men inte de första BOMB_SKIP_AFTER_MS och aldrig ett tryck som var på väg när explosionen
  // visades. Även då står tanten och resultatet ("Räddad!", "exploderade!") kvar i minst BOMB_RESULT_MS, så att ingen
  // missar att den exploderat. Tiderna är desamma med "minska rörelse".
  const startedRef = useRef(0)
  const skippingRef = useRef(false)
  const skipGuard = useSkipGuard(() => {
    if (skippingRef.current) return
    skippingRef.current = true
    const elapsed = performance.now() - startedRef.current
    setTimeout(onDone, skipDelay(elapsed, bomb.saved ? DEFUSE_AT : OUT_AT, BOMB_RESULT_MS))
  }, BOMB_SKIP_AFTER_MS)
  useEffect(() => {
    startedRef.current = performance.now()
    const timers = [
      setTimeout(() => {
        setStage('boom')
        // Musiken tystnar helt en stund vid smällen.
        tantMusic.silence(1000)
        if (soundOn) playBoom()
        if (!reduced) {
          onShake()
          setFlash(true)
          setTimeout(() => setFlash(false), 90)
        }
      }, BOOM_AT),
      setTimeout(
        () => {
          setStage('after')
          if (bomb.saved) {
            setDefuse('away')
            requestAnimationFrame(() => requestAnimationFrame(() => setDefuse('landed')))
            if (soundOn)
              setTimeout(() => {
                // Lättnaden är drygt 2 s lång.
                tantMusic.duck(2000)
                playTantSound('desarmera')
              }, 350)
          }
          // Ute: en sorglig trombon (knappt 4 s).
          if (!bomb.saved && soundOn && !last) {
            tantMusic.duck(3500)
            playTantSound('utslagen')
          }
        },
        bomb.saved ? DEFUSE_AT : OUT_AT,
      ),
      setTimeout(onDone, bomb.saved ? BOMB_SAVED_MS : BOMB_OUT_MS),
    ]
    return () => timers.forEach(clearTimeout)
    // En gång per explosion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const out = !bomb.saved && stage === 'after'
  const text = bomb.saved
    ? stage === 'after'
      ? mine
        ? 'Räddad! Desarmera räddade dig.'
        : `${name} är räddad av Desarmera!`
      : mine
        ? 'Du drog en exploderande tant!'
        : `${name} drog en exploderande tant!`
    : stage === 'after'
      ? mine
        ? 'Du exploderade!'
        : `${name} exploderade!`
      : mine
        ? 'Du drog en exploderande tant!'
        : `${name} drog en exploderande tant!`

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-0 z-[56] flex flex-col items-center justify-center gap-3 px-3 transition-[background-color,backdrop-filter] duration-500',
        out ? 'bg-foreground/70 backdrop-grayscale' : 'bg-foreground/55',
      )}
      {...skipGuard}
    >
      {/* Skärmen blinkar till när det smäller. */}
      <div aria-hidden className={cn('pointer-events-none fixed inset-0 bg-background transition-opacity duration-300', flash ? 'opacity-90 duration-0' : 'opacity-0')} />
      <div className="relative">
        <div className="perspective-[1400px]">
          <div className={cn('relative transform-3d motion-safe:animate-tant-reveal', out && 'grayscale')} style={fromStyle(null)}>
            <div className="backface-hidden">
              <TantKort
                type="tant"
                size="zoom"
                sizes="min(90vw, 560px)"
                className="w-[min(88vw,calc((100dvh-11rem)*107/147),560px)] drop-shadow-[0_0_40px_rgb(220_40_40/0.7)]"
              />
            </div>
            <div aria-hidden className="absolute inset-0 rotate-y-180 backface-hidden">
              <TantBaksida sizes="560px" className="size-full" />
            </div>
            {stage !== 'reveal' && <Stjarnstank />}
          </div>
        </div>
        {/* BOOM! över kortet när det smäller. */}
        {stage !== 'reveal' && !(bomb.saved && stage === 'after') && (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <Stamp className="bg-card/90 text-6xl md:text-8xl">Boom!</Stamp>
          </span>
        )}
        {/* Desarmera flyger upp och smäller ned ovanpå tanten. */}
        {defuse && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[12%] z-20 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
            style={{
              transform:
                defuse === 'away' && !reduced
                  ? `translate(${defuseFrom.x}px, ${defuseFrom.y}px) scale(0.3) rotate(-20deg)`
                  : 'translate(0, 0) scale(1) rotate(-6deg)',
            }}
          >
            <TantKort type="fika" size="zoom" sizes="420px" className="size-full drop-shadow-[0_18px_28px_rgb(0_0_0/0.5)]" />
            {defuse === 'landed' && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Stamp className="border-accent-foreground bg-card/90 text-5xl text-accent-foreground md:text-7xl">Räddad!</Stamp>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {out && (
          // Figuren får en smäll och blir grå.
          <span className="grayscale motion-safe:animate-stamp-shake">
            <LobbyFigur playerId={bomb.player} avatar={avatar} className="text-5xl md:text-6xl" />
          </span>
        )}
        <p className="rounded-full bg-card px-5 py-2 text-center font-heading text-xl font-bold shadow-soft motion-safe:animate-pop md:text-2xl" key={stage}>
          {text}
        </p>
      </div>
    </div>
  )
}

// Hur länge smällen när Tantsnaran slår igen visas (ms).
const TRAP_MS = 1800

// Någon tog ett kort från mig: en stor ruta med kortet och "[namn] tog [kort] från dig!", medan kortet flyger från min hand
// till den spelarens plats. Ett tryck stänger den.
const STOLEN_MS = 2400
function StolenShow({
  type,
  name,
  playerId,
  avatar,
  onDone,
}: {
  type: CardType
  name: string
  playerId: string
  avatar: string
  onDone: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, STOLEN_MS)
    return () => clearTimeout(timer)
    // En gång per stöld.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Ett tryck stänger rutan, men aldrig ett tryck som var på väg när den visades.
  const skipGuard = useSkipGuard(onDone)
  return (
    <div
      role="status"
      className="pointer-events-auto fixed inset-x-3 top-1/2 z-[55] mx-auto flex max-w-sm -translate-y-1/2 flex-col items-center gap-2 rounded-3xl border-4 border-destructive bg-card px-4 py-4 text-center shadow-lift motion-safe:animate-pop"
      {...skipGuard}
    >
      <p className="flex items-center gap-2 font-heading text-xl leading-tight font-bold sm:text-2xl">
        <LobbyFigur playerId={playerId} avatar={avatar} className="shrink-0 text-4xl" />
        <span>
          {name} tog <span className="text-destructive">{cardName(type)}</span> från dig!
        </span>
      </p>
      <TantKort type={type} size="large" sizes="160px" className="w-32 drop-shadow-lg sm:w-40" />
    </div>
  )
}

// Tantsnaran slår igen, för alla: fällan visas stort mitt på skärmen, SNAP! slås ned, bordet skakar och det smäller. Ett
// tryck hoppar över. Med "minska rörelse" skakar inget.
function TrapShow({ text, soundOn, onShake, onDone }: { text: string; soundOn: boolean; onShake: () => void; onDone: () => void }) {
  useEffect(() => {
    tantMusic.silence(700)
    if (soundOn) playBoom()
    if (!reducedMotion()) onShake()
    const timer = setTimeout(onDone, TRAP_MS)
    return () => clearTimeout(timer)
    // En gång per fälla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Ett tryck hoppar över, men aldrig ett tryck som var på väg när fällan visades.
  const skipGuard = useSkipGuard(onDone)
  return (
    <div role="status" className="fixed inset-0 z-[56] flex flex-col items-center justify-center gap-3 bg-foreground/55 px-3 motion-safe:animate-fade" {...skipGuard}>
      <div className="relative">
        <TantKort type="snara" size="zoom" sizes="320px" className="w-[min(70vw,calc((100dvh-12rem)*107/147),320px)] drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)] motion-safe:animate-pop" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Stamp className="bg-card/90 text-6xl md:text-8xl">Snap!</Stamp>
        </span>
      </div>
      <p className="rounded-full bg-card px-5 py-2 text-center font-heading text-xl font-bold shadow-soft motion-safe:animate-pop md:text-2xl">{text}</p>
    </div>
  )
}
