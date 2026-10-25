import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <Label htmlFor="player-name" className="text-base">
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
          className="h-14 rounded-2xl bg-white text-lg"
        />
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">Välj en figur</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAvatar(option)}
              aria-label={`Välj ${option}`}
              aria-pressed={avatar === option}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl border-2 bg-white text-3xl transition-transform hover:scale-105',
                avatar === option ? 'border-primary bg-violet-50 ring-4 ring-primary/20' : 'border-transparent',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" className="h-14 rounded-2xl text-lg" disabled={!name.trim()}>
        {submitLabel}
      </Button>
    </form>
  )
}
