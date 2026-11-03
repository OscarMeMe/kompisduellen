import { useId } from 'react'
import { DrawnBack, DrawnFront } from '@/components/figurer/Kroppar'
import { Face } from '@/components/figurer/Miner'
import { MOOD_MOTION, type BlobFigure, type Mood } from '@/lib/figurer'
import { cn } from '@/lib/utils'

const SIZE = 200

function Picture({ src }: { src: string }) {
  return <image href={src} x="0" y="0" width={SIZE} height={SIZE} />
}

// En blobb i tre lager: bakre lagret (kropp och prylar), minen och främre lagret (prylar över minen). Ett lager är
// antingen ritat i kod eller en bild, och minen är samma i båda fallen. Storleken följer textstorleken, som Emoji.
// animated = figuren rör sig efter sin min. restartKey = ett nytt värde startar om rörelsen.
export function Figur({
  figure,
  mood = 'vantar',
  animated = false,
  restartKey,
  delay,
  className,
}: {
  figure: BlobFigure
  mood?: Mood
  animated?: boolean
  restartKey?: number
  // Hur långt in i rörelsen figuren börjar (s), så att flera figurer inte rör sig som en enda.
  delay?: number
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { body } = figure
  const tilt = figure.frontTilt?.[mood]
  const front = body.kind === 'png' ? body.frontSrc && <Picture src={body.frontSrc} /> : <DrawnFront figure={figure} />

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={figure.name}
      className={cn('inline-block size-[1.2em] shrink-0 overflow-visible align-[-0.25em] select-none', className)}
    >
      <g
        key={`${mood}-${restartKey ?? 0}`}
        className={cn('origin-[100px_180px] [transform-box:view-box]', animated && MOOD_MOTION[mood])}
        style={delay === undefined ? undefined : { animationDelay: `${-delay}s` }}
      >
        <g data-lager="bak">{body.kind === 'png' ? <Picture src={body.src} /> : <DrawnBack figure={figure} uid={uid} />}</g>
        <g data-lager="min">
          <Face mood={mood} figure={figure} animated={animated} />
        </g>
        <g data-lager="fram" transform={tilt && `translate(${tilt.x} ${tilt.y}) rotate(${tilt.rotate} 100 108)`}>
          {front}
        </g>
      </g>
    </svg>
  )
}
