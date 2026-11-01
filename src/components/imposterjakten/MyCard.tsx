import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, VenetianMask } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MyImposterCard } from '@/lib/imposterjakten'
import { cn } from '@/lib/utils'

// Mitt kort i Imposterjakten. Det är dolt från början, så att grannen inte ser, och kan visas och döljas igen när som
// helst under omgången. Rollen syns med text och symbol, inte bara med färg. compact = en enda rad, vid bordet, så att
// bordet och knapparna får plats utan scrollning.
// inRound = jag är med i omgången. Den som anslöt mitt i en omgång väntar till nästa.
export function MyCard({ mine, inRound, compact = false }: { mine: MyImposterCard | null; inRound: boolean; compact?: boolean }) {
  const [shown, setShown] = useState(false)

  if (!inRound) {
    return (
      <p className="rounded-lg border bg-card p-5 text-center font-semibold text-muted-foreground shadow-soft">
        Du är med från nästa omgång.
      </p>
    )
  }
  if (!mine) {
    return <p className="rounded-lg border bg-card p-5 text-center text-muted-foreground shadow-soft">Ditt kort är på väg…</p>
  }
  const card = mine.card
  if (!card) {
    return (
      <p className="rounded-lg border bg-card p-5 text-center font-semibold text-muted-foreground shadow-soft">
        Du är med från nästa omgång.
      </p>
    )
  }

  const toggle = (
    <Button variant="outline" size={compact ? 'default' : 'lg'} className={cn(!compact && 'w-full')} onClick={() => setShown(!shown)}>
      {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      {shown ? 'Dölj kortet' : 'Visa mitt kort'}
    </Button>
  )

  const innocent = card.role === 'oskyldig'
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-2.5 shadow-soft-sm',
          !shown ? 'border-foreground bg-foreground text-background' : innocent ? 'border-accent bg-mint-soft' : 'border-primary bg-coral-soft',
        )}
      >
        {!shown ? (
          <p className="font-heading font-bold">Ditt kort är dolt</p>
        ) : (
          <div className="min-w-0 text-left motion-safe:animate-pop">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              {innocent ? <ShieldCheck className="size-4" aria-hidden /> : <VenetianMask className="size-4" aria-hidden />}
              {innocent ? 'Du är oskyldig.' : 'Du är imposter.'}
              {card.category && <span className="font-normal text-muted-foreground">· {card.category}</span>}
            </p>
            <p className="truncate font-heading text-xl leading-tight font-bold">
              {innocent ? card.word : card.hint ? `Ledtråd: ${card.hint}` : 'Smält in!'}
            </p>
          </div>
        )}
        {toggle}
      </div>
    )
  }

  if (!shown) {
    return (
      <div className={cn('space-y-3 rounded-lg border-2 border-foreground bg-foreground text-background shadow-soft', compact ? 'p-4' : 'p-6')}>
        <p className={cn('text-center font-heading font-bold', compact ? 'text-base' : 'text-xl')}>Ditt kort är dolt</p>
        {!compact && <p className="text-center text-sm opacity-75">Visa det när ingen annan tittar på din skärm.</p>}
        <div className="flex justify-center">{toggle}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border-2 shadow-soft motion-safe:animate-pop',
        innocent ? 'border-accent bg-mint-soft' : 'border-primary bg-coral-soft',
        compact ? 'p-4' : 'p-6',
      )}
    >
      <p className="flex items-center justify-center gap-2 font-heading text-lg font-bold">
        {innocent ? <ShieldCheck className="size-6" aria-hidden /> : <VenetianMask className="size-6" aria-hidden />}
        {innocent ? 'Du är oskyldig.' : 'Du är imposter.'}
      </p>
      {innocent ? (
        <p className="text-center">
          <span className="block text-sm font-semibold text-muted-foreground">Ditt hemliga ord är:</span>
          <span className={cn('block font-heading font-bold break-words', compact ? 'text-3xl' : 'text-4xl sm:text-5xl')}>
            {card.word}
          </span>
        </p>
      ) : (
        <div className="space-y-1 text-center">
          <p className="font-semibold">Försök smälta in och lista ut ordet.</p>
          {card.hint && (
            <p>
              <span className="text-sm font-semibold text-muted-foreground">Ledtråd: </span>
              <span className="font-heading text-2xl font-bold">{card.hint}</span>
            </p>
          )}
        </div>
      )}
      {card.category && (
        <p className="text-center text-sm">
          <span className="font-semibold text-muted-foreground">Kategori: </span>
          <span className="font-bold">{card.category}</span>
        </p>
      )}
      <div className="flex justify-center">{toggle}</div>
    </div>
  )
}
