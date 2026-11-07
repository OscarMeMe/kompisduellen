import { useState } from 'react'
import { LogOut, ScrollText, Undo2 } from 'lucide-react'
import { TantKort } from '@/components/tantpanik/TantKort'
import { ReactionBar } from '@/components/lobby/Reactions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TANT_HOW_TO, type TantTable } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES, type CardType } from '@/lib/tantpanik-kort'

// Rutorna bakom bordets knappar: reglerna (?), menyn (≡) och historiken (loggraden).

export function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [zoomed, setZoomed] = useState<CardType | null>(null)
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Så spelas det</DialogTitle>
          <DialogDescription>{TANT_HOW_TO}</DialogDescription>
        </DialogHeader>
        {/* Varje kort med en liten bild av kortet. Ett tryck på bilden visar kortet stort. */}
        <ul className="space-y-2.5 text-sm">
          {CARD_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Visa ${CARDS[type].name} större`}
                onClick={() => setZoomed(type)}
                className="w-15 shrink-0 cursor-zoom-in rounded-md outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
              >
                <TantKort type={type} size="small" sizes="64px" className="w-full drop-shadow-md" />
              </button>
              <span>
                <span className="font-bold">{CARDS[type].name}:</span> {CARDS[type].rule ?? CARDS[type].text}
              </span>
            </li>
          ))}
          <li className="pt-1 text-muted-foreground">
            Två kort med samma namn låter dig välja ett av någons kort, med baksidan upp. Tre lika låter dig be om ett visst kort. En Vild tant kan ersätta en
            tant i paret eller tretalet. Tantsnaran kan aldrig ingå i ett par eller tretal. Sist kvar vinner.
          </li>
        </ul>
        {/* Krediten för musiken (se docs/ljud-licenser.md). */}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Musik: ”Happy” av{' '}
          <a href="https://soundcloud.com/rezoner" target="_blank" rel="noreferrer" className="underline">
            Rezoner
          </a>
        </p>
      </DialogContent>
    </Dialog>
    {/* Det förstorade kortet ovanpå reglerna. */}
    <Dialog open={zoomed !== null} onOpenChange={(next) => !next && setZoomed(null)}>
      <DialogContent className="justify-items-center border-0 bg-transparent p-0 shadow-none" onClick={() => setZoomed(null)}>
        <DialogTitle className="sr-only">{zoomed ? CARDS[zoomed].name : 'Kortet'}</DialogTitle>
        {zoomed && <TantKort type={zoomed} size="zoom" className="drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]" />}
      </DialogContent>
    </Dialog>
    </>
  )
}

// Menyn: reaktioner och ljud, Lämna lobbyn och (för värden) Avbryt matchen.
export function MenuDialog({
  open,
  onOpenChange,
  isHost,
  onAbort,
  onLeave,
  onHistory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isHost: boolean
  onAbort: () => void
  onLeave: () => void
  // Historiken, som ligger här på smala skärmar (annars en egen knapp överst).
  onHistory: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meny</DialogTitle>
          <DialogDescription>Reaktioner, ljud och att lämna matchen.</DialogDescription>
        </DialogHeader>
        <ReactionBar />
        <div className="space-y-2">
          <Button variant="outline" size="lg" className="w-full min-[421px]:hidden" onClick={onHistory}>
            <ScrollText aria-hidden />
            Det som hänt
          </Button>
          {isHost && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                onOpenChange(false)
                onAbort()
              }}
            >
              <Undo2 aria-hidden />
              Avbryt matchen
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              onLeave()
            }}
          >
            <LogOut aria-hidden />
            Lämna lobbyn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Allt som hänt i matchen, nyast överst.
export function HistoryDialog({
  open,
  onOpenChange,
  table,
  mine = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: TantTable
  // Det bara jag vet (vilket kort som togs från mig eller som jag fick), på rätt plats bland händelserna.
  mine?: { n: number; text: string }[]
}) {
  const oldest = table.log[0]?.n ?? 0
  const events = [...table.log.map((event) => ({ ...event, own: false })), ...mine.filter((note) => note.n >= oldest).map((note) => ({ ...note, own: true }))].sort(
    (a, b) => a.n - b.n || Number(a.own) - Number(b.own),
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Det som hänt</DialogTitle>
          <DialogDescription>De senaste händelserna, nyast överst.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-1.5 text-sm">
          {events.reverse().map((event, i) => (
            <li
              key={`${event.own ? 'm' : 'e'}${event.n}`}
              className={event.own ? 'font-semibold text-destructive' : i === 0 ? 'font-semibold' : 'text-muted-foreground'}
            >
              {event.text}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
