import { useState } from 'react'
import { CircleHelp, Eye, EyeOff, ShieldCheck, VenetianMask } from 'lucide-react'
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
    <Button variant="outline" size={compact ? 'default' : 'lg'} className={cn('text-foreground hover:text-foreground', !compact && 'w-full')} onClick={() => setShown(!shown)}>
      {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      {shown ? 'Dölj kortet' : 'Visa mitt kort'}
    </Button>
  )

  const tricky = card.role === 'lurig'
  // Lurig ser likadant ut för alla, så att ingen ser på färgen vem som är impostern.
  const innocent = card.role !== 'imposter'
  const trickyQuestion = 'En av er har ett annat ord. Kan det vara du?'
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-1 shadow-soft-sm sm:px-4 sm:py-2.5',
          !shown ? 'border-foreground bg-foreground text-background' : innocent ? 'border-accent bg-mint-soft' : 'border-primary bg-coral-soft',
        )}
      >
        {!shown ? (
          <p className="font-heading text-sm font-bold whitespace-nowrap sm:text-base">Ditt kort är dolt</p>
        ) : (
          <div className="min-w-0 text-left motion-safe:animate-pop">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              {tricky ? <CircleHelp className="size-4 shrink-0" aria-hidden /> : innocent ? <ShieldCheck className="size-4" aria-hidden /> : <VenetianMask className="size-4" aria-hidden />}
              {tricky ? 'Kan det vara du?' : innocent ? 'Du är oskyldig.' : 'Du är imposter.'}
              {card.category && <span className="font-normal text-muted-foreground">· {card.category}</span>}
            </p>
            <p className="truncate font-heading text-xl leading-tight font-bold">
              {card.role === 'imposter' ? (card.hint ? `Ledtråd: ${card.hint}` : 'Smält in!') : card.word}
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
        {tricky ? <CircleHelp className="size-6 shrink-0" aria-hidden /> : innocent ? <ShieldCheck className="size-6" aria-hidden /> : <VenetianMask className="size-6" aria-hidden />}
        {tricky ? trickyQuestion : innocent ? 'Du är oskyldig.' : 'Du är imposter.'}
      </p>
      {card.role !== 'imposter' ? (
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
