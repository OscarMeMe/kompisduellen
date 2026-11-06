import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { findBlob, type Mood } from '@/lib/figurer'

// En spelares figur med en viss min, t.ex. vid Imposterjaktens bord och på prispallen. En blobb byter min och rör sig
// en gång när minen byts (aldrig hela tiden, så att tio figurer inte blir tunga på en mobil). Andra figurer visas som
// vanligt med Emoji.
export function MoodFigur({ avatar, mood, className }: { avatar: string; mood: Mood; className?: string }) {
  const blob = findBlob(avatar)
  if (!blob) return <Emoji emoji={avatar} className={className} />
  return <Figur figure={blob} mood={mood} animated={mood !== 'vantar'} className={className} />
}
