import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { SpelIkon } from '@/components/SpelIkon'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import { GAMES, playersLabel, type GameInfo } from '@/lib/games'
import { loadSoundOn, playCountdownTick } from '@/lib/ljud'
import { REMATCH_SECONDS, tooManyPlayers, type CountdownKind } from '@/lib/match'
import { cn } from '@/lib/utils'

// Delar som väntrummen har gemensamt: spelvalet, Så spelas det och nedräkningen före en match.

// Värdens val av spel: det valda först och de andra under. onlySelected = bara det valda (de andra bakom Byt spel).
// players = alla i lobbyn, för raden om att spelet kräver fler eller färre.
export function SpelVal({ game, players, onlySelected, onChoose }: { game: GameInfo; players: number; onlySelected: boolean; onChoose: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {GAMES.filter((g) => g.playable && (!onlySelected || g.id === game.id))
        .sort((a, b) => Number(b.id === game.id) - Number(a.id === game.id))
        .map((option) => {
          const selected = option.id === game.id
          // Spelet kräver fler spelare än de som är med nu. Det går att välja, men startknappen väntar.
          const tooFew = players < option.minPlayers
          const tooManyHere = tooManyPlayers(option.id, players)
          return (
            <Button
              key={option.id}
              variant="outline"
              aria-pressed={selected}
              onClick={() => onChoose(option.id)}
              className={cn('h-auto justify-start gap-3 rounded-lg border-2 p-4 text-left whitespace-normal', selected ? 'border-primary bg-coral-soft' : 'bg-card')}
            >
              <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-md text-2xl', option.color)}>
                <SpelIkon game={option} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-base font-bold">{option.name}</span>
                <span className="block text-sm font-normal text-muted-foreground">{option.tagline}</span>
                <span className={cn('mt-1 block text-xs font-semibold', tooFew || tooManyHere ? 'text-primary' : 'text-muted-foreground')}>
                  👥 {playersLabel(option)}
                  {tooFew && (players === 1 ? ' · Du är själv här just nu' : ` · ni är ${players} just nu`)}
                  {tooManyHere && ` · ni är ${players} just nu`}
                </span>
              </span>
              {selected && <Check className="size-5 shrink-0 text-primary" aria-label="Valt" />}
            </Button>
          )
        })}
    </div>
  )
}

// Så spelas det: hur spelet går till och hur poängen räknas, för spelet som är valt just nu. Hopfällt för alla.
export function HowToPlay({ howTo, scoringDetails }: { howTo: string; scoringDetails: string[] }) {
  return (
    <details className="rounded-lg border bg-card px-4 text-sm shadow-soft-sm">
      {/* Hela raden är tryckbar, minst 44 px hög. */}
      <summary className="-mx-4 cursor-pointer px-4 py-3 font-semibold">Så spelas det</summary>
      <div className="space-y-2 pb-3 text-muted-foreground">
        <p>{howTo}</p>
        <ul className="list-disc space-y-1 pl-5">
          {scoringDetails.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </details>
  )
}

// Nedräkning före en match (första starten eller revansch): alla ser samma tal, och matchen startar av sig själv.
// Värden kan avbryta. En revansch tar över hela skärmen och hörs (följer ljudknappen), så att ingen missar den.
export function RematchCountdown({
  at,
  kind,
  rule,
  clockOffset,
  isHost,
  onCancel,
}: {
  at: number
  kind: CountdownKind
  rule: string
  clockOffset: number
  isHost: boolean
  onCancel: () => void
}) {
  const { secondsLeft } = useCountdown(at, clockOffset, REMATCH_SECONDS)
  const rematch = kind !== 'first'
  const shown = Math.max(1, secondsLeft)
  useEffect(() => {
    if (rematch && loadSoundOn()) playCountdownTick(shown)
  }, [rematch, shown])
  const box = (
    <section
      className={cn(
        'space-y-2 rounded-lg border-2 border-primary bg-coral-soft p-5 text-center shadow-soft animate-pop',
        rematch && 'w-full max-w-md space-y-3 p-8',
      )}
      aria-live="polite"
    >
      <p className={cn('font-heading font-bold', rematch ? 'text-4xl sm:text-5xl' : 'text-lg')}>
        {kind === 'first' ? 'Nu kör vi!' : 'Revansch!'}
      </p>
      <p
        className={cn('font-heading font-bold text-primary tabular-nums', rematch ? 'text-8xl sm:text-9xl' : 'text-6xl')}
        aria-label={`Startar om ${secondsLeft} sekunder`}
      >
        {/* Varje siffra poppar in för sig. */}
        <span key={shown} className="inline-block motion-safe:animate-pop">
          {shown}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        {kind === 'first' ? rule : 'Samma spel och samma inställningar. Gör er redo!'}
      </p>
      {isHost && (
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
      )}
    </section>
  )
  if (!rematch) return box
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">{box}</div>
}
