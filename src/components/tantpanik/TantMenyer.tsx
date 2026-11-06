import { LogOut, Undo2 } from 'lucide-react'
import { ReactionBar } from '@/components/lobby/Reactions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TANT_HOW_TO, type TantTable } from '@/lib/tantpanik'
import { CARDS, CARD_TYPES } from '@/lib/tantpanik-kort'

// Rutorna bakom bordets knappar: reglerna (?), menyn (≡) och historiken (loggraden).

export function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Så spelas det</DialogTitle>
          <DialogDescription>{TANT_HOW_TO}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {CARD_TYPES.map((type) => (
            <li key={type} className="flex gap-2">
              <span aria-hidden className="w-6 shrink-0 text-center">
                {CARDS[type].symbol}
              </span>
              <span>
                <span className="font-bold">{CARDS[type].name}:</span> {CARDS[type].rule ?? CARDS[type].text}
              </span>
            </li>
          ))}
          <li className="pt-1 text-muted-foreground">
            Två kort med samma namn tar ett slumpat kort från någon. Tre lika låter dig be om ett visst kort. En Vild tant kan ersätta en
            tant i paret eller tretalet. Sist kvar vinner.
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// Menyn: reaktioner och ljud, Lämna lobbyn och (för värden) Avbryt matchen.
export function MenuDialog({
  open,
  onOpenChange,
  isHost,
  onAbort,
  onLeave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isHost: boolean
  onAbort: () => void
  onLeave: () => void
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
export function HistoryDialog({ open, onOpenChange, table }: { open: boolean; onOpenChange: (open: boolean) => void; table: TantTable }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Det som hänt</DialogTitle>
          <DialogDescription>De senaste händelserna, nyast överst.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-1.5 text-sm">
          {[...table.log].reverse().map((event, i) => (
            <li key={event.n} className={i === 0 ? 'font-semibold' : 'text-muted-foreground'}>
              {event.text}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
