import { Link } from 'react-router'
import { gameIdentity } from '@/components/SpelIdentitet'
import { SpelIkon } from '@/components/SpelIkon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { playersLabel, type GameInfo } from '@/lib/games'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

// Förklaringen som kommer upp när man klickar på ett spel på startsidan: en bild, en rolig mening
// och kort hur spelet går till. Spel utan intro i games.ts visar sin tagline och sitt howTo. Spel med ett eget paket
// (SpelIdentitet) visar sin logga i spelets färger i stället för emojin, och har knappen, siffrorna och etiketten i dem.
export function GameIntroDialog({
  game,
  open,
  onOpenChange,
}: {
  game: GameInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!game) return null
  const rules = rulesFor(game.id)
  const howTo = cardRulesFor(game.id)?.howTo ?? rules.howTo(rules.guessSeconds)
  const identity = gameIdentity(game.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Rutan blir aldrig högre än skärmen: då skrollar innehållet i den. */}
      <DialogContent className={cn('max-h-[calc(100dvh-1.5rem)] gap-5 overflow-y-auto sm:max-w-md', identity && cn('gap-4 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-card/90 [&>[data-slot=dialog-close]]:text-foreground', identity.frame))}>
        {identity ? (
          identity.band('-mx-6 -mt-6 h-28 shrink-0')
        ) : (
          <div className={cn('-mx-6 -mt-6 flex justify-center rounded-t-lg py-6', game.color)}>
            <SpelIkon game={{ emoji: game.intro?.emoji ?? game.emoji, icon: game.icon }} className="animate-pop text-7xl" />
          </div>
        )}
        <div className="space-y-2 text-center">
          <DialogTitle className={cn('text-2xl leading-tight font-bold', identity?.heading)}>{game.name}</DialogTitle>
          <DialogDescription className="text-base text-balance text-foreground">
            {game.intro?.pitch ?? game.tagline}
          </DialogDescription>
        </div>
        {game.intro ? (
          <ol className="space-y-2">
            {game.intro.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold', identity?.step ?? 'bg-muted')}>
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-snug text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="leading-snug text-muted-foreground">{howTo}</p>
        )}
        {identity ? (
          <p className={cn('mx-auto rounded-full px-3 py-1 text-center text-sm font-bold', identity.chip)}>👥 {playersLabel(game)}</p>
        ) : (
          <p className="text-center text-sm font-semibold text-muted-foreground">👥 {playersLabel(game)}</p>
        )}
        {/* Knapparna ligger fast längst ned i rutan, så att Skapa lobby syns även när texten skrollar. */}
        <div className="sticky -bottom-6 -mx-6 -mb-6 grid gap-2 bg-inherit px-6 pt-3 pb-6 sm:grid-flow-col sm:auto-cols-fr">
          {rules.soloPractice && (
            <Button asChild size="lg" variant="outline">
              <Link to={`/skapa?spel=${game.id}&testa=1`}>Testa själv</Link>
            </Button>
          )}
          <Button asChild size="lg" className={identity?.button}>
            <Link to={`/skapa?spel=${game.id}`}>Skapa lobby</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
