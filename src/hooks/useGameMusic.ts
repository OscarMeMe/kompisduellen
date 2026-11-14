import { useEffect } from 'react'
import { useMusicVolume } from '@/hooks/useMusicVolume'
import { useReactions } from '@/hooks/useReactions'
import { loadSoundOn } from '@/lib/ljud'
import { tantMusic, type MusicLevel, type MusicSet } from '@/lib/tantmusik'

// Spelar ett spels musik så länge komponenten visas: väntrummets spår eller matchens (level). Följer ljudknappen och
// musikreglaget. Byts vyn mot en annan som också vill ha musik fortsätter den utan avbrott, och spåren tonas över i
// varandra.
export function useGameMusic(set: MusicSet, level: MusicLevel) {
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const volume = useMusicVolume()
  const wanted = soundOn && volume > 0
  useEffect(() => {
    tantMusic.setSet(set)
    tantMusic.setLevel(level)
    tantMusic.setWanted(wanted)
  }, [set, level, wanted])
  useEffect(() => () => tantMusic.setWanted(false), [])
}
