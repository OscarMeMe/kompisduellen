import { useGameMusic } from '@/hooks/useGameMusic'
import type { MusicLevel } from '@/lib/tantmusik'

// Imposterjaktens musik i väntrummet och på slutskärmen (level="lobby"), bara när Imposterjakten är valt. Under matchen
// spelar spelplanen själv matchens spår. Musiken fortsätter utan avbrott mellan vyerna.
export function ImposterMusik({ level }: { level: MusicLevel }) {
  useGameMusic('imposter', level)
  return null
}
