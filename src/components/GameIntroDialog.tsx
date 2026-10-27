import { Link } from 'react-router'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { playersLabel, type GameInfo } from '@/lib/games'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

// Förklaringen som kommer upp när man klickar på ett spel på startsidan: en bild, en rolig mening
// och kort hur spelet går till. Spel utan intro i games.ts visar sin tagline och sitt howTo.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <div className={cn('-mx-6 -mt-6 flex justify-center rounded-t-lg py-6', game.color)}>
          <Emoji emoji={game.intro?.emoji ?? game.emoji} className="animate-pop text-7xl" />
        </div>
        <div className="space-y-2 text-center">
          <DialogTitle className="text-2xl leading-tight font-bold">{game.name}</DialogTitle>
          <DialogDescription className="text-base text-balance text-foreground">
            {game.intro?.pitch ?? game.tagline}
          </DialogDescription>
        </div>
        {game.intro ? (
          <ol className="space-y-2">
            {game.intro.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-heading text-sm font-bold">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-snug text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="leading-snug text-muted-foreground">{howTo}</p>
        )}
        <p className="text-center text-sm font-semibold text-muted-foreground">👥 {playersLabel(game)}</p>
        <div className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
          {rules.soloPractice && (
            <Button asChild size="lg" variant="outline">
              <Link to={`/skapa?spel=${game.id}&testa=1`}>Testa själv</Link>
            </Button>
          )}
          <Button asChild size="lg">
            <Link to={`/skapa?spel=${game.id}`}>Spela nu</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
