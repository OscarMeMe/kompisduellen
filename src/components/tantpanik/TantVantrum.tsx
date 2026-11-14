import { useEffect } from 'react'
import { useMusicVolume } from '@/hooks/useMusicVolume'
import { useReactions } from '@/hooks/useReactions'
import { loadSoundOn } from '@/lib/ljud'
import { tantMusic } from '@/lib/tantmusik'

// Bakgrundsmönstret i väntrummet (1024 × 1024, sömlöst), och hur stort det visas.
const PATTERN = '/images/tantpanik/vantrum-monster.webp'
const PATTERN_SIZE = '512px 512px'

// Exploderande Tanters väntrum: mönstret som bakgrund på hela sidan och musiken på låg volym (den fortsätter in i
// matchen). Volymen ställs med ljudknappen uppe till höger (LobbySound). Visas bara när Exploderande Tanter är valt, och
// allt tas bort när man lämnar.
export function TantVantrum() {
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const musicVolume = useMusicVolume()

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
    tantMusic.setSet('tant')
    tantMusic.setLevel('lobby')
    tantMusic.setWanted(wanted)
  }, [wanted])
  useEffect(() => () => tantMusic.setWanted(false), [])

  return null
}
