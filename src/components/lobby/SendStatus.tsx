import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Delivery } from '@/lib/leverans'
import { SPLAT_SHIELD } from '@/lib/splatt'

// Visas bara när mitt drag eller min gissning inte verkar komma fram: en diskret rad medan det skickas igen, och ett
// tydligt besked med en knapp när försöken tagit slut. Ligger över spelvyn och flyttar inget.
export function SendStatus({ delivery, onRetry }: { delivery: Delivery; onRetry: () => void }) {
  if (delivery === 'ok') return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4">
      {delivery === 'sending' ? (
        <p role="status" className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground shadow-soft-sm">
          <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
          Skickar…
        </p>
      ) : (
        <div
          {...SPLAT_SHIELD}
          role="alert"
          className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-card py-2 pr-2 pl-4 font-semibold shadow-soft motion-safe:animate-pop"
        >
          Kunde inte skicka.
          <Button onClick={onRetry}>Tryck igen</Button>
        </div>
      )}
    </div>
  )
}
