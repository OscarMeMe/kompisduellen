import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Stjarnstank } from '@/components/Stjarnstank'
import { TantBaksida, TantKort } from '@/components/tantpanik/TantKort'
import { useReactions } from '@/hooks/useReactions'
import { loadSoundOn, playBoom } from '@/lib/ljud'
import type { GameState } from '@/lib/match'
import type { MyTantView, TantTable } from '@/lib/tantpanik'
import { cardName, type CardType } from '@/lib/tantpanik-kort'

// Hur länge det dragna kortet visas stort innan det åker ner till handen, och hur länge tanten visas (ms).
const SHOW_MS = 1200
const BOMB_MS = 2200
const TO_HAND_MS = 450
const FLY_MS = 600
// Kommer mitt kort mer än så här långt efter att alla sett att jag drog, visas det inte (ms).
const LATE_MS = 3000

type Show = { n: number; kind: 'mine'; type: CardType } | { n: number; kind: 'bomb'; player: string; saved: boolean }
type Flight = { n: number; style: CSSProperties }

// Det som händer vid bordet, som animationer ovanpå det. Ett kort jag drar glider upp från högen, vänds och syns stort
// bara för mig, och åker sedan ner till handen. Ett tryck var som helst lägger det i handen direkt. När någon annan
// drar glider en baksida från högen till den spelarens plats. En exploderande tant vänds för alla, bordet skakar och
// det smäller. Inget visas ovanpå ett kort som väntar på Nope!. Med "minska rörelse" visas kortet utan rörelser.
// onShake = bordet ska skaka (numret ändras varje gång).
export function TableAnimations({
  state,
  table,
  meId,
  tantView,
  onShake,
}: {
  state: GameState
  table: TantTable
  meId: string
  tantView: MyTantView | null
  onShake: (n: number) => void
}) {
  const [show, setShow] = useState<Show | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [flights, setFlights] = useState<Flight[]>([])
  // Det som redan fanns när bordet visades animeras inte (t.ex. efter en omladdning).
  const seen = useRef(table.lastAction?.n ?? 0)
  // Ett eget drag som syns i läget innan mitt kort kommit fram: numret och när det hände.
  const waitingMine = useRef<{ n: number; at: number } | null>(null)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const blocked = table.step === 'window'

  // En ny händelse vid bordet.
  const action = table.lastAction
  useEffect(() => {
    if (!action || action.n <= seen.current) return
    seen.current = action.n
    if (action.kind === 'draw' && action.player === meId) {
      waitingMine.current = { n: action.n, at: Date.now() }
    } else if (action.kind === 'draw') {
      const flight = flyToSeat(action.n, action.player)
      if (flight) {
        setFlights((list) => [...list, flight])
        setTimeout(() => setFlights((list) => list.filter((f) => f.n !== flight.n)), FLY_MS + 50)
      }
    } else if (action.kind === 'bomb') {
      setLeaving(false)
      setShow({ n: action.n, kind: 'bomb', player: action.player, saved: !!action.saved })
      if (!reducedMotion()) setTimeout(() => onShake(action.n), 450)
      if (soundOn) setTimeout(playBoom, 450)
    }
    // soundOn och onShake ska inte starta om en händelse.
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
    setShow({ n: drew.n, kind: 'mine', type: drew.type })
  }, [drew])

  // Kortet visas en stund och åker sedan ner till handen (tanten tonas bort).
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => setLeaving(true), show.kind === 'mine' ? SHOW_MS : BOMB_MS)
    return () => clearTimeout(timer)
  }, [show])
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(
      () => {
        setShow(null)
        setLeaving(false)
      },
      reducedMotion() ? 0 : TO_HAND_MS,
    )
    return () => clearTimeout(timer)
  }, [leaving])

  const name = (id: string) => state.players[id]?.name ?? 'Någon'
  return (
    <>
      {flights.map((flight) => (
        <div key={flight.n} aria-hidden className="pointer-events-none fixed z-30 motion-safe:animate-tant-fly" style={flight.style}>
          <TantBaksida sizes="144px" className="w-full drop-shadow-lg" />
        </div>
      ))}
      {/* Ett kort som väntar på Nope! döljs aldrig. */}
      {show && !blocked && (
        <div
          role="status"
          className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-3 bg-foreground/45 px-4 motion-safe:animate-fade"
          onClick={() => setLeaving(true)}
        >
          <div key={show.n} className={leaving && show.kind === 'mine' ? 'motion-safe:animate-tant-to-hand' : ''} style={toHandStyle()}>
            <div className="perspective-[1400px]">
              <div className="relative transform-3d motion-safe:animate-tant-reveal" style={fromPileStyle()}>
                <div className="backface-hidden">
                  <TantKort
                    type={show.kind === 'mine' ? show.type : 'tant'}
                    size="zoom"
                    sizes="min(82vw, 420px)"
                    className="w-[min(82vw,calc((100dvh-10rem)*107/147),420px)]"
                  />
                </div>
                <div aria-hidden className="absolute inset-0 rotate-y-180 backface-hidden">
                  <TantBaksida sizes="420px" className="size-full" />
                </div>
                {show.kind === 'bomb' && <Stjarnstank delay={450} />}
              </div>
            </div>
          </div>
          <p
            className={
              'rounded-full bg-card px-4 py-2 text-center font-heading text-lg font-bold shadow-soft ' +
              (leaving ? 'opacity-0 transition-opacity duration-200' : 'motion-safe:animate-pop')
            }
          >
            {show.kind === 'mine'
              ? `Du drog ${cardName(show.type)}`
              : show.player === meId
                ? show.saved
                  ? 'Exploderande tant! Desarmera räddade dig.'
                  : 'Exploderande tant! Du är ute.'
                : show.saved
                  ? `${name(show.player)} drog en exploderande tant! Desarmera räddade ${name(show.player)}.`
                  : `${name(show.player)} drog en exploderande tant och är ute!`}
          </p>
        </div>
      )}
    </>
  )
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function center(element: Element | null): { x: number; y: number } | null {
  if (!element) return null
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

// Kortet startar på högen: avståndet från skärmens mitt till högen.
function fromPileStyle(): CSSProperties {
  const pile = center(document.querySelector('[data-tant-pile]'))
  if (!pile) return {}
  return { '--from-x': `${pile.x - innerWidth / 2}px`, '--from-y': `${pile.y - innerHeight / 2}px` } as CSSProperties
}

// Kortet åker ner till handen: avståndet från skärmens mitt till handen.
function toHandStyle(): CSSProperties {
  const hand = center(document.querySelector('[data-tant-hand]'))
  return { '--to-y': `${(hand ? hand.y : innerHeight) - innerHeight / 2}px` } as CSSProperties
}

// En baksida som glider från högen till en motspelares plats.
function flyToSeat(n: number, player: string): Flight | null {
  if (reducedMotion()) return null
  const pile = document.querySelector('[data-tant-pile]')?.getBoundingClientRect()
  const seat = center(document.querySelector(`[data-seat="${CSS.escape(player)}"]`))
  if (!pile || !seat) return null
  return {
    n,
    style: {
      left: pile.left,
      top: pile.top,
      width: pile.width,
      '--tx': `${seat.x - (pile.left + pile.width / 2)}px`,
      '--ty': `${seat.y - (pile.top + pile.height / 2)}px`,
    } as CSSProperties,
  }
}
