import type { TimeWarning } from '@/lib/tidvarning'
import { cn } from '@/lib/utils'

// En tunn korallröd ram runt hela spelvyn, innanför skärmkanten, när tiden håller på att ta slut. Den tonas in vid
// varning och pulserar en gång per sekund när det är kritiskt (ny key varje sekund startar om pulsen). Med "minska
// rörelse" står ramen still. Ramen ligger över allt men går inte att klicka på, och flyttar inget.
export function TimeWarningFrame({ warning, secondsLeft }: { warning: TimeWarning; secondsLeft: number }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed z-40 rounded-lg border-[3px] border-primary opacity-0 motion-safe:transition-opacity motion-safe:duration-500',
        'top-[max(0.375rem,env(safe-area-inset-top))] right-[max(0.375rem,env(safe-area-inset-right))] bottom-[max(0.375rem,env(safe-area-inset-bottom))] left-[max(0.375rem,env(safe-area-inset-left))]',
        warning !== 'normal' && 'opacity-100',
      )}
    >
      {warning === 'kritisk' && (
        <div key={secondsLeft} className="absolute -inset-[3px] rounded-lg motion-safe:animate-frame-pulse" />
      )}
    </div>
  )
}
