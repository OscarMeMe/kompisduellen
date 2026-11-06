import { useEffect, useState } from 'react'
import { SoundControl } from '@/components/tantpanik/TantLjud'
import { useReactions } from '@/hooks/useReactions'
import { loadSoundOn, saveSoundOn } from '@/lib/ljud'
import { loadMusicVolume, tantMusic } from '@/lib/tantmusik'

// Bakgrundsmönstret i väntrummet (1024 × 1024, sömlöst), och hur stort det visas.
const PATTERN = '/images/tantpanik/vantrum-monster.webp'
const PATTERN_SIZE = '512px 512px'

// Exploderande Tanters väntrum: mönstret som bakgrund på hela sidan, musiken på låg volym (den fortsätter in i matchen)
// och volymknappen nere till höger. Visas bara när Exploderande Tanter är valt, och allt tas bort när man lämnar.
export function TantVantrum() {
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const [musicVolume, setMusicVolume] = useState(loadMusicVolume)

  // Mönstret på hela sidan. Korten i väntrummet är ogenomskinliga, så texten syns tydligt.
  useEffect(() => {
    const body = document.body.style
    const before = { image: body.backgroundImage, size: body.backgroundSize, repeat: body.backgroundRepeat }
    body.backgroundImage = `url(${PATTERN})`
    body.backgroundSize = PATTERN_SIZE
    body.backgroundRepeat = 'repeat'
    return () => {
      body.backgroundImage = before.image
      body.backgroundSize = before.size
      body.backgroundRepeat = before.repeat
    }
  }, [])

  const wanted = soundOn && musicVolume > 0
  useEffect(() => {
    tantMusic.setLevel('lobby')
    tantMusic.setWanted(wanted)
  }, [wanted])
  useEffect(() => () => tantMusic.setWanted(false), [])

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40">
      <SoundControl
        soundOn={soundOn}
        onSoundOn={(on) => (reactions ? reactions.setSoundOn(on) : saveSoundOn(on))}
        musicVolume={musicVolume}
        onMusicVolume={setMusicVolume}
      />
    </div>
  )
}
