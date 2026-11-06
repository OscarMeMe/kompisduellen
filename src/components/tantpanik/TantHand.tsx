import { useEffect, useMemo, useState } from 'react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { Solfjader } from '@/components/tantpanik/Solfjader'
import { TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import type { GameState } from '@/lib/match'
import { nextSelection, selectionLabel, sortHand } from '@/lib/solfjader'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { isCombo, needsTarget, REQUESTABLE, validTargets, type TantCard, type TantMove, type TantTable } from '@/lib/tantpanik'
import { CARDS, NOPE_SECONDS, cardName, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Min hand: en solfjäder längst ner på skärmen. Tryck på ett kort så hoppar det fram med hela texten och en stor knapp.
// Tantkort (och kort med samma namn) kan väljas flera, och hoppar då fram tillsammans som par eller tretal. Tryck utanför
// för att lägga tillbaka. När någon spelat ett kort och jag har Nope! dyker en stor knapp upp nära tummen.
// giving = Tjänst: jag väljer ett kort att ge bort.
export function TantHand({
  state,
  table,
  meId,
  hand,
  giving,
  clockOffset,
  onMove,
}: {
  state: GameState
  table: TantTable
  meId: string
  hand: TantCard[]
  giving: boolean
  clockOffset: number
  onMove: (move: TantMove) => void
}) {
  const cards = useMemo(() => sortHand(hand), [hand])
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState<string | null>(null)
  const [request, setRequest] = useState<CardType | null>(null)
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

  function tap(id: string) {
    setSelected((list) => (giving ? (list[0] === id ? [] : [id]) : nextSelection(cards, list, id)))
    setTarget(null)
    setRequest(null)
  }
  function close() {
    setSelected([])
    setTarget(null)
    setRequest(null)
  }
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
            className="fixed inset-0 z-30 bg-foreground/30 motion-safe:animate-fade"
            onClick={close}
          />
          <section
            aria-label="Valda kort"
            {...SPLAT_SHIELD}
            className="fixed inset-x-0 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-40 mx-auto max-h-[calc(100dvh-11rem)] w-full max-w-md overflow-y-auto px-3"
          >
            <div className="space-y-3 rounded-lg bg-card p-3 shadow-lift">
              <div className="flex justify-center gap-2">
                {chosen.map((card) => (
                  // Ett kort visas förstorat, så att bildens regeltext går att läsa. Par och tretal står bredvid varandra.
                  <TantKort
                    key={card.id}
                    type={card.type}
                    size={chosen.length === 1 ? 'zoom' : 'large'}
                    className={cn('motion-safe:animate-pop', chosen.length === 3 && 'w-24 sm:w-28')}
                  />
                ))}
              </div>
              <Choice
                state={state}
                table={table}
                meId={meId}
                types={types}
                giving={giving}
                myTurn={myTurn}
                nopeLevel={pending && chosen.length === 1 && types[0] === 'nadu' && nope ? pending.nopes : null}
                target={target}
                request={request}
                onTarget={setTarget}
                onRequest={setRequest}
                onPlay={() => send({ type: 'tPlay', cards: chosen.map((card) => card.id), target, request })}
                onGive={() => send({ type: 'tGive', card: chosen[0].id })}
                onNope={(level) => send({ type: 'tNope', card: chosen[0].id, level })}
              />
            </div>
          </section>
        </>
      )}

      {nope && pending && (
        <NopeButton
          key={`${pending.by}-${pending.cards.join()}-${pending.nopes}`}
          deadline={state.deadline}
          clockOffset={clockOffset}
          onNope={() => send({ type: 'tNope', card: nope.id, level: pending.nopes })}
        />
      )}

      {/* Handen längst ner. Kast landar aldrig här (SPLAT_SHIELD). */}
      <section
        aria-label={`Din hand, ${cards.length} kort`}
        {...SPLAT_SHIELD}
        className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-background via-background/95 to-background/0 px-2 pt-3 pb-[env(safe-area-inset-bottom)]"
      >
        {!popped && myTurn && (
          <div className="mx-auto mb-1 max-w-sm px-2">
            <Button size="lg" className="w-full" onClick={() => send({ type: 'tDraw' })}>
              Dra ett kort och avsluta turen
            </Button>
          </div>
        )}
        {!popped && giving && <p className="mb-1 text-center font-semibold">Tryck på kortet du vill ge bort.</p>}
        {cards.length === 0 ? (
          <p className="mx-auto mb-4 max-w-sm rounded-md bg-muted px-3 py-3 text-center text-sm text-muted-foreground">
            Du har inga kort. Du drar ändå på din tur.
          </p>
        ) : (
          <Solfjader cards={cards} selected={chosen.map((card) => card.id)} glow={nope ? [nope.id] : []} onTap={tap} />
        )}
      </section>
    </>
  )
}

// Den stora Nope!-knappen nära tummen, med en ring som visar tiden kvar. Telefonen vibrerar kort när den dyker upp.
// Ett tryck spelar kortet direkt.
function NopeButton({ deadline, clockOffset, onNope }: { deadline: number | null; clockOffset: number; onNope: () => void }) {
  const { progress } = useCountdown(deadline, clockOffset, NOPE_SECONDS)
  const [sent, setSent] = useState(false)
  useEffect(() => {
    navigator.vibrate?.(80)
  }, [])
  if (sent) return null
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <button
      type="button"
      {...SPLAT_SHIELD}
      onClick={() => {
        setSent(true)
        onNope()
      }}
      className="fixed right-3 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-50 flex size-28 items-center justify-center rounded-full bg-primary-button font-heading text-xl font-bold text-primary-foreground shadow-primary outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:animate-pop motion-safe:active:scale-95"
    >
      <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" className="stroke-primary-foreground/25" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="stroke-sun motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-linear"
        />
      </svg>
      <span className="relative">Nope!</span>
    </button>
  )
}

// Vad de valda korten gör: mål, kortet man ber om och den stora knappen.
function Choice({
  state,
  table,
  meId,
  types,
  giving,
  myTurn,
  nopeLevel,
  target,
  request,
  onTarget,
  onRequest,
  onPlay,
  onGive,
  onNope,
}: {
  state: GameState
  table: TantTable
  meId: string
  types: CardType[]
  giving: boolean
  myTurn: boolean
  nopeLevel: number | null
  target: string | null
  request: CardType | null
  onTarget: (id: string) => void
  onRequest: (type: CardType) => void
  onPlay: () => void
  onGive: () => void
  onNope: (level: number) => void
}) {
  if (giving) {
    return (
      <Button size="lg" className="w-full" onClick={onGive}>
        Ge bort {cardName(types[0])}
      </Button>
    )
  }
  if (nopeLevel !== null) {
    return (
      <Button size="lg" className="w-full" onClick={() => onNope(nopeLevel)}>
        Nope!
      </Button>
    )
  }
  const label = selectionLabel(types)
  const kind = CARDS[types[0]].kind
  if (!label) {
    const text =
      types.length > 1
        ? types.every((type) => type === 'vild')
          ? 'Lägg till en riktig tant, så blir det ett par eller tretal.'
          : 'De här korten går inte att spela tillsammans.'
        : kind === 'nope'
          ? 'Nope! spelar du när någon annan precis spelat ett kort.'
          : kind === 'defuse'
            ? 'Desarmera används av sig själv när du drar en exploderande tant.'
            : kind === 'trap'
              ? 'Fällan gör inget ensam. Den slår igen om någon stjäl den från dig.'
              : 'Tryck på fler likadana kort (eller en Vild tant) för ett par eller tretal.'
    return <p className="text-center text-sm font-semibold">{text}</p>
  }
  if (!myTurn) return <p className="text-center text-sm font-semibold">Du kan spela när det är din tur.</p>

  const combo = types.length > 1 && isCombo(types)
  const wantsTarget = combo || needsTarget(types[0])
  const targets = validTargets(table, meId, combo || types[0] === 'tjanst')
  const triple = types.length === 3
  const ready = (!wantsTarget || target !== null) && (!triple || request !== null)

  return (
    <div className="space-y-3">
      {combo && (
        <p className="text-center text-sm font-semibold">
          {triple ? 'Be en spelare om ett visst kort. Har den det får du det.' : 'Ta ett slumpat kort från en spelare.'}
        </p>
      )}
      {wantsTarget &&
        (targets.length === 0 ? (
          <p className="text-center text-sm font-semibold text-primary">Ingen går att välja just nu.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-bold">
              {combo ? 'Från vem?' : types[0] === 'tjanst' ? 'Vem ska ge dig ett kort?' : 'Vem får turerna?'}
            </p>
            <div className="flex flex-wrap gap-2">
              {targets.map((id) => (
                <Button
                  key={id}
                  variant="outline"
                  aria-pressed={target === id}
                  className={cn(target === id && 'border-primary bg-coral-soft')}
                  onClick={() => onTarget(id)}
                >
                  <LobbyFigur playerId={id} avatar={state.players[id]?.avatar ?? ''} className="text-xl" />
                  {state.players[id]?.name}
                  <span className="text-xs font-normal text-muted-foreground">{table.handCounts[id]} kort</span>
                </Button>
              ))}
            </div>
          </div>
        ))}
      {triple && (
        <div className="space-y-1.5">
          <p className="text-sm font-bold">Vilket kort ber du om?</p>
          <div className="flex flex-wrap gap-1.5">
            {REQUESTABLE.map((type) => (
              <Button
                key={type}
                variant="outline"
                aria-pressed={request === type}
                className={cn(request === type && 'border-primary bg-coral-soft')}
                onClick={() => onRequest(type)}
              >
                <span aria-hidden>{CARDS[type].symbol}</span>
                {cardName(type)}
              </Button>
            ))}
          </div>
        </div>
      )}
      <Button size="lg" className="w-full" disabled={!ready} onClick={onPlay}>
        {label}
      </Button>
    </div>
  )
}
