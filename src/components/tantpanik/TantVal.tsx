import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { sortHand } from '@/lib/solfjader'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { REQUESTABLE, type TantCard } from '@/lib/tantpanik'
import { cardName, type CardType } from '@/lib/tantpanik-kort'
import { cn } from '@/lib/utils'

// Regeln i Exploderande Tanter: varje gång jag ska välja något kommer en stor popup i mitten av skärmen. Den dimmar
// bordet bakom, har en tydlig rubrik och stora kort eller knappar. Inga besked eller rutor ligger ovanpå den (z-[60]).
export function ValPopup({
  title,
  children,
  actions,
  onBack,
  label,
  panel = false,
}: {
  title: string
  // Allt i en ljus ruta i mitten, med rubriken inne i rutan (t.ex. Göm tanten).
  panel?: boolean
  children: ReactNode
  // Den stora knappen (eller knapparna) längst ner.
  actions?: ReactNode
  // Tillbaka till förra steget, t.ex. från valet av spelare till kortet.
  onBack?: () => void
  label?: string
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
      {...SPLAT_SHIELD}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-foreground/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] motion-safe:animate-fade"
    >
      {panel ? (
        <div className="flex max-h-full min-h-0 w-full max-w-4xl flex-col gap-3 rounded-lg bg-card p-4 shadow-lift md:p-6">
          <h2 className="text-center font-heading text-xl leading-tight font-bold md:text-2xl">{title}</h2>
          <div className="flex min-h-0 shrink flex-col items-center gap-3 overflow-y-auto">{children}</div>
          {actions && <div className="mx-auto flex w-full max-w-lg shrink-0 flex-col gap-2">{actions}</div>}
        </div>
      ) : (
        <>
          <h2 className="max-w-3xl text-center font-heading text-2xl leading-tight font-bold text-background drop-shadow md:text-3xl">
            {title}
          </h2>
          <div className="flex min-h-0 w-full max-w-5xl shrink flex-col items-center overflow-y-auto">{children}</div>
        </>
      )}
      {!panel && (actions || onBack) && (
        <div className="flex w-full max-w-md shrink-0 flex-col gap-2">
          {actions}
          {onBack && (
            <Button variant="outline" size="lg" className="w-full" onClick={onBack}>
              <ArrowLeft aria-hidden />
              Tillbaka
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export type TargetOption = { id: string; name: string; avatar: string; count: number }

// Välj spelare (Tjänst, Riktad attack, par, tretal): en stor knapp med figur, namn och antal kort för varje motspelare.
export function TargetPopup({
  title,
  players,
  onPick,
  onBack,
}: {
  title: string
  players: TargetOption[]
  onPick: (id: string) => void
  onBack: () => void
}) {
  return (
    <ValPopup title={title} onBack={onBack}>
      {players.length === 0 ? (
        <p className="rounded-lg bg-card px-4 py-3 font-semibold">Ingen går att välja just nu.</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-3 p-1">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onPick(player.id)}
              className="flex w-36 flex-col items-center gap-1 rounded-lg border-2 border-transparent bg-card px-3 pt-3 pb-2.5 shadow-lift outline-none hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:hover:-translate-y-1 motion-safe:active:scale-95 md:w-44"
            >
              <LobbyFigur playerId={player.id} avatar={player.avatar} className="text-6xl md:text-7xl" />
              <span className="w-full truncate text-center font-heading text-lg font-bold">{player.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{player.count} kort</span>
            </button>
          ))}
        </div>
      )}
    </ValPopup>
  )
}

// Tretal: vilket kort jag vill ha, som stora kortbilder att trycka på.
export function RequestPopup({ title, onPick, onBack }: { title: string; onPick: (type: CardType) => void; onBack: () => void }) {
  return (
    <ValPopup title={title} onBack={onBack}>
      <div className="grid w-full grid-cols-3 gap-2 p-1 sm:grid-cols-4 md:grid-cols-6 md:gap-3">
        {REQUESTABLE.map((type) => (
          <button
            key={type}
            type="button"
            aria-label={`Be om ${cardName(type)}`}
            onClick={() => onPick(type)}
            className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:hover:-translate-y-1 motion-safe:active:scale-95"
          >
            <TantKort type={type} size="zoom" sizes="(min-width: 768px) 160px, 30vw" className="w-full drop-shadow-lg" />
          </button>
        ))}
      </div>
    </ValPopup>
  )
}

// Tjänst: någon ber mig om ett kort. Min hand visas stort. Ett tryck lyfter kortet, och knappen ger bort det.
export function GivePopup({ toName, hand, onGive }: { toName: string; hand: TantCard[]; onGive: (id: string) => void }) {
  const cards = sortHand(hand)
  const [chosen, setChosen] = useState<string | null>(null)
  const [screen, setScreen] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const measure = () => setScreen({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const card = cards.find((other) => other.id === chosen)
  // Så stora som möjligt, i en eller två rader beroende på hur många kort det är.
  const rows = cards.length > 4 ? 2 : 1
  const perRow = Math.ceil(cards.length / rows)
  const byWidth = (Math.min(screen.width, 1024) - 24 - 8 * (perRow - 1)) / Math.max(1, perRow)
  const byHeight = ((screen.height - 230) / rows) * (107 / 147) - 8
  const width = Math.round(Math.max(64, Math.min(byWidth, byHeight, 240)))
  return (
    <ValPopup
      title={`${toName} ber dig om en tjänst! Välj ett kort att ge.`}
      actions={
        <Button size="lg" className="w-full" disabled={!card} onClick={() => card && onGive(card.id)}>
          {card ? `Ge ${cardName(card.type)}` : 'Tryck på ett kort'}
        </Button>
      }
    >
      <div className="flex flex-wrap justify-center gap-2 px-1 pt-5 pb-1">
        {cards.map((other) => (
          <button
            key={other.id}
            type="button"
            aria-pressed={chosen === other.id}
            aria-label={cardName(other.type)}
            onClick={() => setChosen(other.id)}
            className={cn(
              'rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-150',
              chosen === other.id && '-translate-y-4 ring-4 ring-primary',
            )}
            style={{ width }}
          >
            <TantKort type={other.type} size="zoom" sizes={`${width}px`} className="w-full drop-shadow-lg" />
          </button>
        ))}
      </div>
    </ValPopup>
  )
}
