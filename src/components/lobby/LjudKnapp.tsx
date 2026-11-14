import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLayout } from '@/hooks/useLayout'
import { useMusicVolume } from '@/hooks/useMusicVolume'
import { IMPOSTER_GAME } from '@/lib/imposterjakten'
import { useReactions } from '@/hooks/useReactions'
import { loadEffectsVolume, loadSoundOn, playPop, saveSoundOn, setEffectsVolume } from '@/lib/ljud'
import { TANT_GAME } from '@/lib/tantpanik'
import { tantMusic } from '@/lib/tantmusik'
import { cn } from '@/lib/utils'

// Under så här mycket räknas volymen som låg (ikonen med en våg).
const LOW = 0.5

// Ljudknappen i lobbyn: samma knapp uppe till höger i sidhuvudet i väntrummet och alla spelvyer (en portal till platsen
// i Layout, så att den kan läsa ljudet i ReactionsProvider). Musikreglaget finns bara i spel med musik.
export function LobbySound({ game }: { game: string }) {
  const { headerSlot } = useLayout()
  const reactions = useReactions()
  if (!headerSlot) return null
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  return createPortal(
    <SoundControl
      soundOn={soundOn}
      onSoundOn={(on) => (reactions ? reactions.setSoundOn(on) : saveSoundOn(on))}
      music={game === TANT_GAME || game === IMPOSTER_GAME}
    />,
    headerSlot,
  )
}

// Högtalarikonen: en liten popover med reglage för ljudeffekter och (i spel med musik) musik, 0–100 %, och "Stäng av
// allt". Ikonen visar läget: av, lågt eller normalt. Volymerna sparas och gäller hela sajten. Släpper man ljudreglaget
// spelas ett kort testljud. soundOn är ljudet på eller av (ReactionsProvider, sparat i kd-ljud).
export function SoundControl({ soundOn, onSoundOn, music }: { soundOn: boolean; onSoundOn: (on: boolean) => void; music: boolean }) {
  const musicVolume = useMusicVolume()
  const [effects, setEffects] = useState(loadEffectsVolume)
  const shownMusic = music ? musicVolume : 0
  const off = !soundOn || (effects === 0 && shownMusic === 0)
  const low = !off && Math.max(effects, shownMusic) < LOW
  const Icon = off ? VolumeX : low ? Volume1 : Volume2
  const label = off ? 'Ljudet är av' : low ? 'Ljudet är lågt' : 'Ljudet är på'

  function changeEffects(value: number) {
    setEffects(value)
    setEffectsVolume(value)
    if (!soundOn && value > 0) onSoundOn(true)
  }
  function changeMusic(value: number) {
    tantMusic.setVolume(value)
    if (!soundOn && value > 0) onSoundOn(true)
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label}. Ändra volymen`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-soft-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        <Icon aria-hidden className={cn('size-5', off && 'text-muted-foreground')} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-4">
        <VolumeSlider
          label="Ljudeffekter"
          value={soundOn ? effects : 0}
          onChange={changeEffects}
          // Ett kort testljud när man släpper reglaget.
          onRelease={() => soundOn && playPop()}
        />
        {music && <VolumeSlider label="Musik" value={soundOn ? musicVolume : 0} onChange={changeMusic} />}
        <Button variant="outline" className="w-full" onClick={() => onSoundOn(!soundOn)}>
          {soundOn ? 'Stäng av allt' : 'Slå på ljudet'}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function VolumeSlider({
  label,
  value,
  onChange,
  onRelease,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  onRelease?: () => void
}) {
  const percent = Math.round(value * 100)
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-sm font-semibold">
        {label}
        <span className="text-muted-foreground tabular-nums">{percent} %</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        className="h-8 w-full accent-primary"
      />
    </label>
  )
}
