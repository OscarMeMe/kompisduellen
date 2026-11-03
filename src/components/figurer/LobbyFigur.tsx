import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { useThrows } from '@/hooks/useReactions'
import { findBlob } from '@/lib/figurer'

// En spelares figur i väntrummet. En blobb väntar och plattas till när den träffas av ett kast. Emoji-figurerna ser ut
// som förut: emojiClassName gäller bara dem.
export function LobbyFigur({
  playerId,
  avatar,
  className,
  emojiClassName,
  delay,
}: {
  playerId: string
  avatar: string
  className?: string
  emojiClassName?: string
  delay?: number
}) {
  const hit = useThrows()?.hits[playerId]
  const blob = findBlob(avatar)
  if (!blob) return <Emoji emoji={avatar} className={emojiClassName ?? className} />
  return <Figur figure={blob} mood={hit === undefined ? 'vantar' : 'traffad'} animated restartKey={hit} delay={hit === undefined ? delay : undefined} className={className} />
}
