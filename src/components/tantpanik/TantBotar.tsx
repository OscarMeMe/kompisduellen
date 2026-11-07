import { Bot, Plus, X } from 'lucide-react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { Button } from '@/components/ui/button'
import { BOT_LEVEL_NAMES, BOT_LEVELS, MAX_BOTS, type BotLevel } from '@/lib/tantbot'
import { cn } from '@/lib/utils'

export type BotRow = { id: string; name: string; avatar: string; level: BotLevel }

// Botarna i Exploderande Tanters väntrum (bara värden ser valen): Lägg till bot, svårighet per bot och ta bort.
// Med en eller flera botar går det att spela ensam.
export function TantBotar({
  bots,
  canAdd,
  onAdd,
  onRemove,
  onLevel,
}: {
  bots: BotRow[]
  // Plats för en bot till (högst MAX_BOTS, och inte fler spelare än spelet klarar).
  canAdd: boolean
  onAdd: () => void
  onRemove: (id: string) => void
  onLevel: (id: string, level: BotLevel) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">Botar</p>
          <p className="text-sm text-muted-foreground">Spela mot datorn, även ensam. Högst {MAX_BOTS} botar.</p>
        </div>
        <Button variant="outline" className="h-11" disabled={!canAdd} onClick={onAdd}>
          <Plus aria-hidden />
          Lägg till bot
        </Button>
      </div>
      {bots.length > 0 && (
        <ul className="space-y-1.5">
          {bots.map((bot) => (
            <li key={bot.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1.5">
              <span className="relative">
                <LobbyFigur playerId={bot.id} avatar={bot.avatar} className="text-3xl" />
                <Bot aria-hidden className="absolute -right-1 -bottom-1 size-4 rounded-full bg-card p-0.5 shadow-soft-sm" />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{bot.name}</span>
              <span role="group" aria-label={`Svårighet för ${bot.name}`} className="flex gap-1">
                {BOT_LEVELS.map((level) => (
                  <Button
                    key={level}
                    size="sm"
                    variant={bot.level === level ? 'default' : 'outline'}
                    aria-pressed={bot.level === level}
                    className={cn('h-9 px-2.5')}
                    onClick={() => onLevel(bot.id, level)}
                  >
                    {BOT_LEVEL_NAMES[level]}
                  </Button>
                ))}
              </span>
              <Button size="icon" variant="ghost" aria-label={`Ta bort ${bot.name}`} className="size-9" onClick={() => onRemove(bot.id)}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
