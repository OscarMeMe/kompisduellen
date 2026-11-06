import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  bombCount,
  KAOS_MIN_PLAYERS,
  LEVEL_NAMES,
  levelFor,
  TANT_LEVELS,
  type TantLevel,
  type TantSettings,
} from '@/lib/tantpanik'
import { cn } from '@/lib/utils'

// Svårigheten i väntrummet: Normal, Svår (en tant till) eller Kaos (två till, minst fem spelare). Värden väljer, och
// alla ser hur många tanter det blir med så många som är här just nu. Valet låses när matchen startar.
export function TantSvarighet({
  settings,
  players,
  isHost,
  onChange,
}: {
  settings: TantSettings
  players: number
  isHost: boolean
  onChange: (settings: Partial<TantSettings>) => void
}) {
  const chosen = settings.level ?? 'normal'
  const used = levelFor(chosen, players)
  const bombs = bombCount(Math.max(2, players), chosen)
  const hint = (level: TantLevel) =>
    level === 'normal' ? 'En tant färre än antalet spelare' : level === 'svar' ? 'En tant till' : `Två tanter till, minst ${KAOS_MIN_PLAYERS} spelare`
  const note =
    chosen === 'kaos' && used !== 'kaos'
      ? `Kaos kräver minst ${KAOS_MIN_PLAYERS} spelare. Med ${players} blir det Svår: ${bombs} tanter i högen.`
      : `${LEVEL_NAMES[used]}: ${bombs} ${bombs === 1 ? 'tant' : 'tanter'} i högen med ${Math.max(2, players)} spelare.`

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p id="tant-svarighet" className="font-bold">
            Svårighet
          </p>
          <p className="text-sm text-muted-foreground">{hint(chosen)}</p>
        </div>
        <div role="group" aria-labelledby="tant-svarighet" className="flex flex-wrap gap-1.5 sm:gap-2">
          {TANT_LEVELS.map((level) => {
            const active = level === chosen
            const locked = level === 'kaos' && players < KAOS_MIN_PLAYERS && !active
            return (
              <Button
                key={level}
                variant={active ? 'default' : 'outline'}
                aria-pressed={active}
                disabled={!isHost || locked}
                className={cn('h-11 min-w-16 px-3 text-base sm:px-4', !isHost && 'disabled:opacity-100')}
                onClick={() => onChange({ level })}
              >
                {active && <Check aria-hidden />}
                {LEVEL_NAMES[level]}
              </Button>
            )
          })}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  )
}
