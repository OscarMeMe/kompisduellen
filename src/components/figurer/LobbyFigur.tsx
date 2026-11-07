import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { useThrows } from '@/hooks/useReactions'
import { findBlob } from '@/lib/figurer'

// En spelares figur i väntrummet. En blobb har sin egen rörelse och personlighet, och plattas till när den träffas av
// ett kast. asleep = Sjusovaren har somnat, look = Ögat tittar dit något nyss hände. gaze = blicken följer muspekaren
// (useGazeFollow). Emoji-figurerna ser ut som förut:
// emojiClassName gäller bara dem.
export function LobbyFigur({
  playerId,
  avatar,
  className,
  emojiClassName,
  delay,
  asleep = false,
  look = 0,
  gaze = false,
  lively = true,
}: {
  playerId: string
  avatar: string
  className?: string
  emojiClassName?: string
  delay?: number
  asleep?: boolean
  look?: -1 | 0 | 1
  gaze?: boolean
  // Figurens egen rörelse (t.ex. Blygis som duckar). Av där figuren är liten och ska stå still, som vid ett bord.
  lively?: boolean
}) {
  const hit = useThrows()?.hits[playerId]
  const blob = findBlob(avatar)
  if (!blob) return <Emoji emoji={avatar} className={emojiClassName ?? className} />
  return (
    <Figur
      figure={blob}
      mood={hit === undefined ? 'vantar' : 'traffad'}
      animated
      lively={lively}
      asleep={asleep && hit === undefined}
      look={look}
      gaze={gaze}
      restartKey={hit}
      delay={hit === undefined ? delay : undefined}
      className={className}
    />
  )
}
