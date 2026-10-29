import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

// Frågan innan man lämnar lobbyn, så att ingen hoppar ur av misstag.
// host: värden, som lämnar över till någon annan så att lobbyn finns kvar.
// guest: en deltagare, som kan komma tillbaka med koden.
// practice: ensam i en provomgång (Testa själv).
export type LeaveKind = 'host' | 'guest' | 'practice'

export function LeaveLobbyDialog({
  open,
  kind,
  code,
  nextHost,
  onStay,
  onLeave,
}: {
  open: boolean
  kind: LeaveKind
  code: string
  // Den som tar över som värd.
  nextHost?: string
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent className="gap-5 sm:max-w-sm" showCloseButton={false}>
        <div className="space-y-2 text-center">
          <DialogTitle className="text-2xl leading-tight font-bold">
            {kind === 'practice' ? 'Vill du avsluta provrundan?' : 'Vill du lämna lobbyn?'}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {kind === 'practice'
              ? 'Provrundan räknas inte, så inget går förlorat.'
              : kind === 'guest'
                ? `Du kan komma tillbaka med koden ${code} och fortsätta där du var.`
                : nextHost
                  ? `${nextHost} tar över som värd och lobbyn finns kvar.`
                  : 'En annan spelare tar över som värd och lobbyn finns kvar.'}
          </DialogDescription>
        </div>
        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={onStay}>
            {kind === 'practice' ? 'Fortsätt spela' : 'Stanna kvar'}
          </Button>
          <Button size="lg" variant="outline" onClick={onLeave}>
            {kind === 'practice' ? 'Avsluta' : 'Lämna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
