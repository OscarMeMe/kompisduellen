import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Info } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { playersLabel, type GameInfo } from '@/lib/games'
import { cn } from '@/lib/utils'

// Små förhandsvisningar med egen karaktär för varje spel. De är bara dekoration (göms för skärmläsare), och texten i dem
// är påhittad för att visa idén, inte riktiga rundor eller spelare.
const PREVIEWS: Record<string, ReactNode> = {
  'gissa-priset': (
    <div className="-rotate-3 rounded-md border bg-card px-5 py-2 shadow-soft-sm">
      <p className="font-heading text-3xl font-bold tabular-nums">??? kr</p>
    </div>
  ),
  narmast: (
    <div className="w-full max-w-[14rem] px-2">
      <div className="relative h-2 rounded-full bg-card/80">
        <span className="absolute top-1/2 left-[22%] size-4 -translate-y-1/2 rounded-full bg-sky shadow-soft-sm" />
        <span className="absolute top-1/2 left-[78%] size-4 -translate-y-1/2 rounded-full bg-mint shadow-soft-sm" />
        <span className="absolute top-1/2 left-[56%] size-6 -translate-x-1/4 -translate-y-1/2 rounded-full border-4 border-primary bg-card shadow-soft-sm" />
      </div>
      <div className="mt-2 flex justify-between font-heading text-sm font-bold text-muted-foreground">
        <span>1</span>
        <span>100</span>
      </div>
    </div>
  ),
  kortkaos: (
    <div className="flex items-center">
      <div className="-mr-3 -rotate-6 rounded-md bg-foreground px-4 py-3 whitespace-nowrap text-background shadow-soft-sm">
        <p className="font-heading text-sm leading-tight font-bold">Jag älskar</p>
        <p className="font-heading text-sm font-bold">____</p>
      </div>
      <div className="rotate-6 rounded-md border bg-card px-3 py-3 whitespace-nowrap shadow-soft-sm">
        <p className="font-heading text-sm leading-tight font-bold">Farsans strumpor</p>
      </div>
    </div>
  ),
}

type SpelKortProps = {
  game: GameInfo
  // Spelet som rekommenderas först. Det är ett redaktionellt val, inget påstående om hur populärt det är.
  recommended?: boolean
  // Kortet lyser upp en kort stund när besökaren tryckt på Välj spel.
  highlight?: boolean
  onShowRules: () => void
}

// Ett spelkort på startsidan: förhandsvisning, namn, spelarantal och känsla, kort beskrivning och två tydliga knappar.
// Kortet är inte en enda stor klickyta, så att reglerna och Skapa lobby inte konkurrerar.
export function SpelKort({ game, recommended = false, highlight = false, onShowRules }: SpelKortProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-soft',
        highlight && 'motion-safe:animate-pop ring-4 ring-primary/40',
      )}
    >
      <div className={cn('relative flex h-28 items-center justify-center', game.color)}>
        <div aria-hidden className="flex w-full items-center justify-center pt-6">
          {PREVIEWS[game.id]}
        </div>
        {recommended && (
          <span className="absolute top-3 left-3 rounded-full border bg-card px-3 py-1 text-sm font-bold">Börja här</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">
            {[playersLabel(game), game.feel].filter(Boolean).join(' · ')}
          </p>
          <h3 className="flex items-center gap-2 text-xl leading-tight">
            <Emoji emoji={game.emoji} className="text-2xl" />
            {game.name}
          </h3>
        </div>
        <p className="leading-snug text-muted-foreground">{game.tagline}</p>
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Button variant="link" className="h-11 w-fit px-0 text-muted-foreground" onClick={onShowRules}>
            <Info aria-hidden />
            Så spelar man
          </Button>
          <Button asChild size="lg" variant={recommended ? 'default' : 'outline'} className="w-full">
            <Link to={`/skapa?spel=${game.id}`}>
              Skapa lobby
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
