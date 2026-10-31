import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// En stämpel som slås ned snett, t.ex. "BLUFFAREN" (animate-stamp). Det stämpeln landar på kan få
// motion-safe:animate-stamp-shake, en liten skakning precis när stämpeln träffar. Med "minska rörelse" tonas den in.
export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block -rotate-12 rounded-md border-4 border-destructive px-3 py-1 font-heading text-2xl font-bold tracking-widest text-destructive uppercase motion-safe:animate-stamp motion-reduce:animate-fade',
        className,
      )}
    >
      {children}
    </span>
  )
}
