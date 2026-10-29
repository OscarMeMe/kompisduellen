import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

// Frågan till värden innan hen lämnar lobbyn. Lämnar värden tar någon annan över, så att lobbyn finns kvar.
// I en provomgång (Testa själv) frågar den i stället om provrundan ska avslutas.
export function LeaveLobbyDialog({
  open,
  practice = false,
  nextHost,
  onStay,
  onLeave,
}: {
  open: boolean
  practice?: boolean
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
            {practice ? 'Vill du avsluta provrundan?' : 'Vill du lämna lobbyn?'}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {practice
              ? 'Provrundan räknas inte, så inget går förlorat.'
              : nextHost
                ? `${nextHost} tar över som värd och lobbyn finns kvar.`
                : 'En annan spelare tar över som värd och lobbyn finns kvar.'}
          </DialogDescription>
        </div>
        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={onStay}>
            {practice ? 'Fortsätt spela' : 'Stanna kvar'}
          </Button>
          <Button size="lg" variant="outline" onClick={onLeave}>
            {practice ? 'Avsluta' : 'Lämna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
