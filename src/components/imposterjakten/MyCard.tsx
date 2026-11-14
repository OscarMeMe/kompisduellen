import { useState, type CSSProperties } from 'react'
import { CircleHelp, Eye, EyeOff, ShieldCheck, VenetianMask } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MyImposterCard } from '@/lib/imposterjakten'
import { fitWordSize } from '@/lib/ordstorlek'
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
  // Kortets färger i stilen Nattspanarna: krämvitt med lampgul kant, och korall för impostern.
  const paper = innocent ? 'border-sun bg-card' : 'border-primary bg-coral-soft'
  if (compact) {
    if (!shown) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-foreground bg-foreground px-3 py-1 text-background shadow-soft-sm sm:px-4 sm:py-2.5">
          <p className="font-heading text-sm font-bold whitespace-nowrap sm:text-base">Ditt kort är dolt</p>
          {toggle}
        </div>
      )
    }
    const role = tricky ? 'Kan det vara du?' : innocent ? 'Du är oskyldig.' : 'Du är imposter.'
    return (
      <div className={cn('space-y-1 rounded-lg border-[3px] px-3 py-1.5 shadow-soft-sm motion-safe:animate-pop sm:px-4 sm:py-2.5', paper)}>
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm font-bold">
            {tricky ? <CircleHelp className="size-4 shrink-0" aria-hidden /> : innocent ? <ShieldCheck className="size-4 shrink-0" aria-hidden /> : <VenetianMask className="size-4 shrink-0" aria-hidden />}
            {role}
            {card.category && <span className="font-normal text-muted-foreground">· {card.category}</span>}
          </p>
          {toggle}
        </div>
        {/* Ordet eller ledtråden på en egen rad, alltid helt synligt. Flera ord får bryta mellan orden, men ett ord bryts
            aldrig: texten krymper i stället (fitWordSize). */}
        <div className="[container-type:inline-size]">
          {card.role === 'imposter' ? (
            card.hint ? (
              <p className="leading-tight">
                <span className="block text-xs font-semibold text-muted-foreground">Ledtråd:</span>
                <FitWord text={card.hint} className="text-[length:min(1.25rem,var(--fit))]" />
              </p>
            ) : (
              <p className="font-heading text-xl leading-tight font-bold">Smält in!</p>
            )
          ) : (
            <FitWord text={card.word ?? ''} className="text-[length:min(1.5rem,var(--fit))]" />
          )}
        </div>
      </div>
    )
  }

  if (!shown) {
    return (
      <div className={cn('space-y-2 rounded-lg border-2 border-foreground bg-foreground text-background shadow-soft sm:space-y-3', compact ? 'p-4' : 'p-3 sm:p-6')}>
        <p className={cn('text-center font-heading font-bold', compact ? 'text-base' : 'text-xl')}>Ditt kort är dolt</p>
        {!compact && <p className="text-center text-sm opacity-75">Visa det när ingen annan tittar på din skärm.</p>}
        <div className="flex justify-center">{toggle}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-1.5 rounded-lg border-[3px] shadow-soft motion-safe:animate-pop sm:space-y-3',
        paper,
        compact ? 'p-4' : 'p-3 sm:p-6',
      )}
    >
      <p className="flex items-center justify-center gap-2 font-heading text-lg font-bold">
        {tricky ? <CircleHelp className="size-6 shrink-0" aria-hidden /> : innocent ? <ShieldCheck className="size-6" aria-hidden /> : <VenetianMask className="size-6" aria-hidden />}
        {tricky ? trickyQuestion : innocent ? 'Du är oskyldig.' : 'Du är imposter.'}
      </p>
      {card.role !== 'imposter' ? (
        <div className="text-center [container-type:inline-size]">
          <span className="block text-sm font-semibold text-muted-foreground">Ditt hemliga ord är:</span>
          <FitWord text={card.word ?? ''} className="text-[length:min(2.25rem,var(--fit))] sm:text-[length:min(3rem,var(--fit))]" />
        </div>
      ) : (
        <div className="space-y-1 text-center">
          <p className="font-semibold">Försök smälta in och lista ut ordet.</p>
          {card.hint && (
            <div className="[container-type:inline-size]">
              <span className="block text-sm font-semibold text-muted-foreground">Ledtråd:</span>
              <FitWord text={card.hint} className="text-[length:min(1.5rem,var(--fit))]" />
            </div>
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

// Ett ord eller några ord i rubrikstil som aldrig bryts mitt i ett ord: texten krymper så att det längsta ordet ryms på
// en rad i närmaste container. className sätter den största storleken, t.ex. text-[length:min(3rem,var(--fit))].
function FitWord({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn('block font-heading leading-tight font-bold [overflow-wrap:normal] [word-break:normal]', className)} style={{ '--fit': fitWordSize(text) } as CSSProperties}>
      {text}
    </span>
  )
}
