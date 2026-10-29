import { useCountUp } from '@/hooks/useCountUp'
import { formatSek, roundSek } from '@/lib/belopp'

// Ett pris som räknas upp till sitt värde på ungefär en sekund. Skärmläsare får det färdiga priset direkt.
// Används i exempelrundan och i facit i Gissa priset.
export function CountingPrice({ target }: { target: number }) {
  const value = useCountUp(target, 1000)
  return (
    <>
      {/* Avrundas som priset (ören under en krona, annars hela kronor), så att det aldrig står 100 öre på vägen. */}
      <span aria-hidden>{formatSek(roundSek(value))}</span>
      <span className="sr-only">{formatSek(target)}</span>
    </>
  )
}
