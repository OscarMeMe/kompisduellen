import { useState, type FormEvent } from 'react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { findEmoji } from '@/lib/emoji'
import { AVATARS, loadPlayer, savePlayer, type Player } from '@/lib/player'
import { cn } from '@/lib/utils'

type PlayerSetupProps = {
  submitLabel: string
  onDone: (player: Player) => void
}

// Namn och avatar för gäster. Sparas i webbläsaren så man slipper skriva in det igen.
export function PlayerSetup({ submitLabel, onDone }: PlayerSetupProps) {
  const saved = loadPlayer()
  const [name, setName] = useState(saved?.name ?? '')
  // En sparad figur som inte längre finns att välja byts mot en slumpad.
  const [avatar, setAvatar] = useState(() =>
    saved && AVATARS.includes(saved.avatar) ? saved.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)],
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onDone(savePlayer(name, avatar))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="player-name" className="text-sm font-bold">
          Vad heter du?
        </Label>
        <Input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ditt namn"
          maxLength={20}
          autoComplete="nickname"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">Välj en figur</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAvatar(option)}
              aria-label={`Välj ${findEmoji(option)?.label ?? option}`}
              aria-pressed={avatar === option}
              className={cn(
                'grid aspect-square place-items-center rounded-lg text-2xl transition sm:text-3xl',
                avatar === option ? 'scale-105 bg-sun ring-2 ring-primary' : 'bg-muted/70 hover:bg-muted',
              )}
            >
              <Emoji emoji={option} />
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={!name.trim()}>
        {submitLabel}
      </Button>
    </form>
  )
}
