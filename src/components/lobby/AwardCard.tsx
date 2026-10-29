import {
  Banknote,
  Brain,
  Coffee,
  Flag,
  Hourglass,
  Medal,
  Mountain,
  PiggyBank,
  Rocket,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Highlight, HighlightId } from '@/lib/hojdpunkter'
import { cn } from '@/lib/utils'

// Ikon och färg på medaljen för varje utmärkelse.
const MEDALS: Record<HighlightId, { icon: LucideIcon; color: string }> = {
  'sista-rundan': { icon: Flag, color: 'bg-coral-soft' },
  fulltraff: { icon: Target, color: 'bg-mint' },
  'langst-ifran': { icon: Rocket, color: 'bg-sky' },
  tankelasare: { icon: Brain, color: 'bg-lilac' },
  snalast: { icon: PiggyBank, color: 'bg-sun' },
  slosaren: { icon: Banknote, color: 'bg-mint' },
  comeback: { icon: TrendingUp, color: 'bg-sky' },
  'start-till-mal': { icon: Trophy, color: 'bg-sun' },
  'moralisk-segrare': { icon: Medal, color: 'bg-lilac' },
  stabilast: { icon: Mountain, color: 'bg-sky' },
  'sista-sekunden': { icon: Hourglass, color: 'bg-coral-soft' },
  blixten: { icon: Zap, color: 'bg-sun' },
  'var-ar-du': { icon: Coffee, color: 'bg-lilac' },
}

// En utmärkelse efter matchen, som en liten medalj med titel och text.
export function AwardCard({ highlight }: { highlight: Highlight }) {
  const { icon: Icon, color } = MEDALS[highlight.id]
  return (
    <li className="group flex items-start gap-4 rounded-lg border bg-card p-4 shadow-soft-sm animate-pop">
      <span
        aria-hidden
        className={cn(
          'grid size-14 shrink-0 place-items-center rounded-full shadow-soft-sm outline-2 -outline-offset-[6px] outline-foreground/15 outline-dashed motion-safe:group-hover:animate-wiggle',
          color,
        )}
      >
        <Icon className="size-7" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Utmärkelse</span>
        <span className="block font-heading text-lg leading-tight font-bold">{highlight.title}</span>
        <span className="block text-sm break-words">{highlight.text}</span>
      </span>
    </li>
  )
}
