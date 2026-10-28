import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

// Frågan till värden innan hen lämnar lobbyn. Lämnar värden avslutas lobbyn för alla, så det ska aldrig ske av misstag.
export function LeaveLobbyDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent className="gap-5 sm:max-w-sm" showCloseButton={false}>
        <div className="space-y-2 text-center">
          <DialogTitle className="text-2xl leading-tight font-bold">Vill du lämna lobbyn?</DialogTitle>
          <DialogDescription className="text-base text-foreground">Den avslutas för alla.</DialogDescription>
        </div>
        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={onStay}>
            Stanna kvar
          </Button>
          <Button size="lg" variant="outline" onClick={onLeave}>
            Lämna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
