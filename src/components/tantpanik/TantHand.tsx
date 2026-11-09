import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { MySeat } from '@/components/tantpanik/TurKopp'
import { Solfjader } from '@/components/tantpanik/Solfjader'
import type { Incoming } from '@/components/tantpanik/TantAnimationer'
import { TantKort } from '@/components/tantpanik/TantKort'
import { RequestPopup, TargetPopup } from '@/components/tantpanik/TantVal'
import { Button } from '@/components/ui/button'
import type { GameState } from '@/lib/match'
import { hasFinePointer } from '@/lib/device'
import { arrangeHand, cardHint, nextSelection, selectionLabel, sortHand } from '@/lib/solfjader'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { isCombo, needsTarget, validTargets, type TantCard, type TantMove, type TantTable } from '@/lib/tantpanik'
import { cardName, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Min hand: en solfjäder längst ner på skärmen. Tryck på ett kort så hoppar det fram med hela texten och en stor knapp.
// Tantkort (och kort med samma namn) kan väljas flera, och hoppar då fram tillsammans som par eller tretal. Tryck utanför
// för att lägga tillbaka. Har jag Nope! när någon spelat ett kort lyfts mina Nope!-kort (knappen står i Nope!-fönstret).
// Behöver kortet en spelare (eller ett kort, för tretal) öppnas en stor popup för valet.
export function TantHand({
  state,
  table,
  meId,
  hand,
  onMove,
  onOverlap,
  incoming = null,
  orderKey,
  dimmed = false,
  raised = false,
  freshId = null,
  onFreshSeen,
}: {
  state: GameState
  table: TantTable
  meId: string
  hand: TantCard[]
  clockOffset: number
  onMove: (move: TantMove) => void
  onOverlap?: (px: number) => void
  // Kortet jag just drog. Medan det visas stort har det ingen plats i handen. När det glider ner gör de andra plats,
  // men kortet syns först när det landat.
  incoming?: Incoming
  // Var min ordning av handen sparas (en per lobby), så att den finns kvar mellan turerna och efter en omladdning.
  orderKey: string
  // Inte min tur: handen är lätt dämpad och ligger lite lägre.
  dimmed?: boolean
  // Min tur (koppen är hos mig): handen glider upp lite och lyser mjukt.
  raised?: boolean
  // Kortet jag nyss fick (markerat "NY"), och att jag tryckt på det.
  freshId?: string | null
  onFreshSeen?: () => void
}) {
  const [order, setOrder] = useHandOrder(orderKey, hand)
  const arranged = useMemo(() => arrangeHand(hand, order), [hand, order])
  const cards = incoming?.phase === 'show' ? arranged.filter((card) => card.id !== incoming.id) : arranged
  const hiddenId = incoming?.phase === 'land' ? incoming.id : null
  // Handens höjd följer kortens storlek. De valda korten och Nope!-knappen ligger precis ovanför den.
  const handRef = useRef<HTMLElement>(null)
  const handHeight = useHeight(handRef)
  // Ett valt kort lyfts i handen (en fjärdedel av kortets höjd), så de förstorade korten ligger ovanför det.
  const popupBottom = Math.round(handHeight * 1.25) + 4
  const zoomWidth = useZoomWidth()
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<string | null>(null)
  // Popupen som är öppen: välj spelare eller (tretal) välj kort.
  const [asking, setAsking] = useState<'target' | 'request' | null>(null)
  // Valda kort som inte längre finns på handen (stulna, givna) räknas inte.
  const chosen = selected.map((id) => cards.find((card) => card.id === id)).filter((card) => card !== undefined)
  const types = chosen.map((card) => card.type)
  const myTurn = table.step === 'turn' && table.current === meId
  const popped = chosen.length > 0

  // Nope!: bara när ett kort väntar och jag har ett. Ingen annan ser att jag har det.
  const pending = table.step === 'window' ? table.pending : null
  // Knappen visas inte för den som själv gjorde det senaste i kedjan (spelade kortet eller sa det senaste Nope!).
  const ownLatest = pending !== null && (pending.lastNopeBy ?? pending.by) === meId
  const nope = pending && !ownLatest && !table.out.includes(meId) ? cards.find((card) => card.type === 'nadu') : undefined

  // Under Nope!-fönstret: alla mina Nope!-kort, som hoppar upp och lyser. De andra korten blir gråa.
  const nopeIds = nope ? cards.filter((card) => card.type === 'nadu').map((card) => card.id) : []
  // Ett kort väntar och jag kan inte säga Nope! (inget kort): alla mina kort blir gråa, så att det syns direkt.
  const noNope = pending !== null && !ownLatest && !table.out.includes(meId) && !nope && cards.length > 0

  function tap(id: string) {
    if (id === freshId) onFreshSeen?.()
    // Ett tryck på ett Nope!-kort när det går att säga Nope! spelar det direkt, som den stora knappen.
    if (nope && pending && nopeIds.includes(id)) {
      send({ type: 'tNope', card: id, level: pending.nopes, play: pending.n })
      return
    }
    // Inte min tur: ett tryck förstorar bara kortet. Inget lyfts eller läggs ihop till par, så att det aldrig ser ut som
    // att kortet spelas.
    setSelected((list) => (myTurn ? nextSelection(cards, list, id) : list.length === 1 && list[0] === id ? [] : [id]))
    setTarget(null)
    setAsking(null)
  }
  function close() {
    setSelected([])
    setTarget(null)
    setAsking(null)
  }
  const combo = types.length > 1 && isCombo(types)
  const triple = types.length === 3 && combo
  const wantsTarget = chosen.length > 0 && (combo || needsTarget(types[0]))
  function play(targetId: string | null, request: CardType | null = null) {
    send({ type: 'tPlay', cards: chosen.map((card) => card.id), target: targetId, request })
  }
  const targetOptions = wantsTarget
    ? validTargets(table, meId, combo || types[0] === 'tjanst').map((id) => ({
        id,
        name: state.players[id]?.name ?? 'Någon',
        avatar: state.players[id]?.avatar ?? '',
        count: table.handCounts[id] ?? 0,
      }))
    : []
  const targetTitle = triple
    ? 'Vem ber du om ett kort?'
    : combo
      ? 'Vem tar du ett kort från?'
      : types[0] === 'tjanst'
        ? 'Vem ska ge dig ett kort?'
        : 'Vem får två turer?'
  const targetName = target ? (state.players[target]?.name ?? 'Någon') : ''
  function send(move: TantMove) {
    onMove(move)
    close()
  }

  return (
    <>
      {popped && (
        <>
          {/* Tryck utanför för att lägga tillbaka korten. Solfjädern ligger ovanpå, så att fler kort går att välja. */}
          <button
            type="button"
            aria-label="Lägg tillbaka korten"
            className="fixed inset-0 z-30 bg-foreground/45 motion-safe:animate-fade"
            onClick={close}
          />
          <section
            aria-label="Valda kort"
            {...SPLAT_SHIELD}
            // Från skärmens överkant ned till handen och det lyfta kortet i den, så att inget överlappar. Rutan själv tar
            // inga tryck, så att ett tryck bredvid kortet lägger tillbaka det.
            className="pointer-events-none fixed inset-x-0 z-40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
            style={{
              bottom: `calc(${popupBottom}px + env(safe-area-inset-bottom))`,
              height: `calc(100dvh - ${popupBottom}px - env(safe-area-inset-bottom))`,
            }}
          >
            {/* Bara kortbilden, stor och med en mjuk skugga, så att texten går att läsa. Den krymper när platsen inte räcker,
                så att valen och knappen under den alltid syns. */}
            <div className="flex h-full flex-col justify-end gap-2.5">
              <ZoomedCards key={chosen.map((card) => card.id).join()} cards={chosen} zoomWidth={zoomWidth} />
              <div className="pointer-events-auto mx-auto flex w-full max-w-md shrink-0 flex-col">
                <Choice
                  types={types}
                  myTurn={myTurn}
                  noTargets={wantsTarget && targetOptions.length === 0}
                  nopeLevel={pending && chosen.length === 1 && types[0] === 'nadu' && nope ? pending.nopes : null}
                  onPlay={() => (wantsTarget ? setAsking('target') : play(null))}
                  onNope={(level) => send({ type: 'tNope', card: chosen[0].id, level, play: pending?.n })}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {popped && asking === 'target' && (
        <TargetPopup
          title={targetTitle}
          players={targetOptions}
          onBack={() => setAsking(null)}
          onPick={(id) => {
            if (triple) {
              setTarget(id)
              setAsking('request')
            } else play(id)
          }}
        />
      )}
      {popped && asking === 'request' && target && (
        <RequestPopup
          title={`Vilket kort vill du ha från ${targetName}?`}
          onBack={() => setAsking('target')}
          onPick={(type) => play(target, type)}
        />
      )}


      {/* Handen längst ner. Kast landar aldrig här (SPLAT_SHIELD). */}
      <section
        ref={handRef}
        aria-label={`Din hand, ${cards.length} kort`}
        {...SPLAT_SHIELD}
        className="relative z-40 px-2"
      >
        {/* Min plats, där turkoppen landar. På mobil precis ovanför handens vänstra hörn, på dator till vänster om handen i
            höjd med korten, med en egen plats så att den aldrig ligger över dem. */}
        <MySeat
          state={state}
          meId={meId}
          turn={table.current === meId && !table.winner}
          raised={raised}
          className="absolute bottom-full left-2 z-50 mb-1 sm:top-1/2 sm:bottom-auto sm:mb-0 sm:-translate-y-1/2"
        />
        {cards.length === 0 ? (
          <p className="mx-auto mb-4 max-w-sm rounded-md bg-muted px-3 py-3 text-center text-sm text-muted-foreground">
            Du har inga kort. Du drar ändå på din tur.
          </p>
        ) : (
          <>
            {/* Ordnar handen: likadana kort bredvid varandra, med grupperna i en ny slumpad ordning varje gång. På dator till höger om handen i höjd med korten,
                med en egen plats så att den aldrig ligger över dem. På mobil precis ovanför handens högra hörn. */}
            {/* Dold medan Nope!-fönstret är öppet, så att den aldrig ligger vid nedräkningen. */}
            {cards.length > 1 && !pending && (
              <button
                type="button"
                aria-label="Sortera handen"
                title="Sortera handen"
                onClick={() => setOrder(sortHand(hand, Math.random).map((card) => card.id))}
                className="absolute right-1 bottom-full z-50 mb-1 flex flex-col items-center gap-0.5 sm:top-1/2 sm:right-2 sm:bottom-auto sm:mb-0 sm:-translate-y-1/2"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-card/90 shadow-soft-sm backdrop-blur-sm hover:bg-card sm:size-11">
                  <ArrowDownUp aria-hidden className="size-4 sm:size-5" />
                </span>
                <span className="hidden rounded-full bg-card/85 px-1.5 text-[11px] font-semibold sm:block">Sortera</span>
              </button>
            )}
            {/* Platsen till höger om handen är knappens och till vänster min plats, så solfjädern blir smalare på dator. */}
            <div className="sm:mr-16 sm:ml-28 md:ml-32">
              <Solfjader
                cards={cards}
                selected={myTurn ? chosen.map((card) => card.id) : []}
                glow={nopeIds}
                hiddenId={hiddenId}
                freshId={freshId}
                onTap={tap}
                onReorder={setOrder}
                onOverlap={onOverlap}
                dimmed={dimmed}
                raised={raised}
                grayAll={noNope}
              />
              {noNope && (
                <p className="pointer-events-none absolute inset-x-0 bottom-3 z-50 mx-auto w-fit rounded-full bg-foreground/90 px-4 py-1.5 text-center font-heading text-sm font-bold text-background shadow-soft-sm motion-safe:animate-pop sm:text-base">
                  Du har inget Nope!
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </>
  )
}

// Vinklarna (grader) och förskjutningen i sidled (andel av kortets bredd) när två eller tre kort visas omlott.
const FAN_ANGLES: Record<number, number[]> = { 1: [0], 2: [-6, 6], 3: [-8, 0, 8] }
const FAN_SHIFT = 0.2

// De valda korten, stora och med en mjuk skugga. Ett par eller tretal ligger omlott och korsar varandra lite, som kort
// man håller upp i handen. Det översta går att läsa helt, och ett tryck på ett annat lägger det överst. Korten glider
// ut från en hög när de visas (med "minska rörelse" ligger de direkt på plats).
function ZoomedCards({ cards, zoomWidth }: { cards: TantCard[]; zoomWidth: number }) {
  const [front, setFront] = useState(cards.length - 1)
  const [spread, setSpread] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSpread(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const count = cards.length
  const angles = FAN_ANGLES[count] ?? FAN_ANGLES[3]
  const mid = (count - 1) / 2
  // Kortet krymper så att även de förskjutna korten får plats i bredd.
  const widthShare = 1 + FAN_SHIFT * 2 * mid
  return (
    <div className="flex min-h-0 flex-1 items-end justify-center">
      <div
        className={cn('relative aspect-[107/147]', count > 1 ? 'h-[92%]' : 'h-full')}
        style={{ maxHeight: Math.round(zoomWidth * (147 / 107)), maxWidth: `calc(100% / ${widthShare})` }}
      >
        {cards.map((card, i) => {
          const isFront = i === front
          const shift = spread ? (i - mid) * FAN_SHIFT * 100 : 0
          const angle = spread ? angles[i] : 0
          return (
            <button
              key={card.id}
              type="button"
              aria-label={isFront ? undefined : `Visa ${cardName(card.type)} överst`}
              aria-hidden={isFront || undefined}
              tabIndex={isFront ? -1 : 0}
              onClick={() => setFront(i)}
              className={cn(
                'pointer-events-auto absolute inset-0 origin-bottom outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out',
                isFront ? 'cursor-default' : 'cursor-pointer',
              )}
              style={{ zIndex: isFront ? count + 1 : i, transform: `translateX(${shift}%) rotate(${angle}deg)` }}
            >
              <TantKort
                type={card.type}
                size="zoom"
                sizes={`${zoomWidth}px`}
                className="size-full drop-shadow-[0_18px_28px_rgb(0_0_0/0.4)] motion-safe:animate-fade"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Hur brett ett valt kort visas: på dator cirka 60 % av skärmens höjd (minst 360 px brett), på mobil hela bredden.
// Kortet krymper ändå om platsen ovanför handen inte räcker.
function useZoomWidth(): number {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const measure = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  if (hasFinePointer() || size.width >= 768) return Math.round(Math.max(360, size.height * 0.6 * (107 / 147)))
  return size.width - 24
}

// Min ordning av handen, bara hos mig (sessionStorage). Första gången sorteras handen och den ordningen sparas, så att
// kort jag får sedan hamnar längst till höger. En sparad ordning utan något av handens kort är från en tidigare match
// med samma turordning (kortens id är nya i varje match), och då sorteras handen på nytt.
function useHandOrder(key: string, hand: TantCard[]): [string[], (ids: string[]) => void] {
  const storageKey = `kd-tant-hand:${key}`
  const [order, setOrderState] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
      const mine = Array.isArray(saved) && saved.every((id) => typeof id === 'string') && saved.some((id) => hand.some((card) => card.id === id))
      if (mine) return saved
    } catch {
      // Ingen sparad ordning.
    }
    const sorted = sortHand(hand, Math.random).map((card) => card.id)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(sorted))
    } catch {
      // Utan lagring gäller ordningen bara tills sidan laddas om.
    }
    return sorted
  })
  function setOrder(ids: string[]) {
    setOrderState(ids)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(ids))
    } catch {
      // Utan lagring gäller ordningen bara tills sidan laddas om.
    }
  }
  return [order, setOrder]
}

// Höjden på ett element, som följer med när den ändras.
function useHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(180)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return height
}

// Hjälptexter under det förstorade kortet: en liten mörk etikett, så att den syns mot bordet.
const LABEL =
  'mx-auto w-fit max-w-full rounded-full bg-foreground/90 px-3 py-1.5 text-center text-sm font-semibold text-background shadow-soft-sm'

// Vad de valda korten gör: en hjälptext, eller den stora knappen. Behövs en spelare eller ett kort öppnas en popup.
function Choice({
  types,
  myTurn,
  noTargets,
  nopeLevel,
  onPlay,
  onNope,
}: {
  types: CardType[]
  myTurn: boolean
  // Korten behöver en annan spelare med kort på handen (par, tretal, Tjänst), och ingen har några.
  noTargets: boolean
  nopeLevel: number | null
  onPlay: () => void
  onNope: (level: number) => void
}) {
  if (nopeLevel !== null) {
    return (
      <Button size="lg" className="w-full" onClick={() => onNope(nopeLevel)}>
        Nope!
      </Button>
    )
  }
  const label = selectionLabel(types)
  if (!label) return <p className={LABEL}>{cardHint(types)}</p>
  if (!myTurn) return <p className={LABEL}>Bara förstorat. Du kan spela när det är din tur.</p>
  if (noTargets) return <p className={LABEL}>Ingen annan har några kort just nu.</p>
  return (
    <Button size="lg" className="w-full" onClick={onPlay}>
      {label}
    </Button>
  )
}
