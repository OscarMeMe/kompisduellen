import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { REPORT_REASONS, reportQuestion, type ReportReason } from '@/lib/rapport'

// "Rapportera fel" i Gissa prisets facit: en liten grå länk som inte stör spelet. Ett tryck öppnar några orsaker, och
// valet skickas som en händelse i statistiken (rapport.ts) med frågans id. Bara en rapport per fråga och flik.
export function RapporteraFel({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(() => wasReported(itemId))
  function send(reason: ReportReason) {
    reportQuestion(itemId, reason)
    markReported(itemId)
    setSent(true)
    setTimeout(() => setOpen(false), 1400)
  }
  return (
    <div className="flex justify-end">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="min-h-8 rounded-sm px-1.5 text-[11px] text-muted-foreground/80 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          {sent ? 'Tack för rapporten' : 'Rapportera fel'}
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-60 p-3">
          {sent ? (
            <p className="text-sm font-semibold">Tack! Vi kollar på frågan.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Vad är fel med frågan?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => send(reason.id)}
                    className="min-h-10 rounded-md border bg-card px-2 text-sm font-semibold hover:bg-muted"
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

const KEY = 'kd-rapporterat'

function wasReported(itemId: string): boolean {
  try {
    return (JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[]).includes(itemId)
  } catch {
    return false
  }
}

function markReported(itemId: string) {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[]
    sessionStorage.setItem(KEY, JSON.stringify([...list, itemId].slice(-50)))
  } catch {
    // Utan lagring kan samma fråga rapporteras igen efter en omladdning, och det gör inget.
  }
}
