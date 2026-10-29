import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

// Frågan innan värden avbryter en pågående match. Alla går tillbaka till väntrummet, och matchen räknas inte.
export function AbortMatchDialog({
  open,
  onStay,
  onAbort,
}: {
  open: boolean
  onStay: () => void
  onAbort: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent className="gap-5 sm:max-w-sm" showCloseButton={false}>
        <div className="space-y-2 text-center">
          <DialogTitle className="text-2xl leading-tight font-bold">Avbryta matchen?</DialogTitle>
          <DialogDescription className="text-base text-foreground">
            Alla går tillbaka till väntrummet. Matchen räknas inte i kvällens ställning.
          </DialogDescription>
        </div>
        <DialogFooter className="grid gap-2 sm:grid-cols-2">
          <Button size="lg" onClick={onStay}>
            Fortsätt spela
          </Button>
          <Button size="lg" variant="outline" onClick={onAbort}>
            Avbryt matchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
