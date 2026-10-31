import type { ReactNode } from 'react'
import { SPLAT_SHIELD } from '@/lib/splatt'

// Korten på handen. På mobilen en rad att bläddra i sidled, på större skärmar ett rutnät.
// Varje kort läggs i en HandSlot.
export function Hand({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul
      {...SPLAT_SHIELD}
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4"
    >
      {children}
    </ul>
  )
}

export function HandSlot({ children }: { children: ReactNode }) {
  return <li className="w-40 shrink-0 snap-start sm:w-auto">{children}</li>
}
