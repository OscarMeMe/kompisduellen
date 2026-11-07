import { useId } from 'react'
import { DrawnBack, DrawnFront } from '@/components/figurer/Kroppar'
import { Face } from '@/components/figurer/Miner'
import { Tantklanning, Vinnarkrona } from '@/components/figurer/Tantklanning'
import { MOOD_MOTION, type BlobFigure, type Mood } from '@/lib/figurer'
import { cn } from '@/lib/utils'

const SIZE = 200

function Picture({ src }: { src: string }) {
  return <image href={src} x="0" y="0" width={SIZE} height={SIZE} />
}

// En blobb i tre lager: bakre lagret (kropp och prylar), minen och främre lagret (prylar över minen). Ett lager är
// antingen ritat i kod eller en bild, och minen är samma i båda fallen. Storleken följer textstorleken, som Emoji.
// animated = figuren rör sig efter sin min. restartKey = ett nytt värde startar om rörelsen.
// lively = figurens egen rörelse och personlighet i väntrummet (i stället för andningen). asleep = Sjusovaren sover.
// look = Ögat tittar åt vänster (-1) eller höger (1). gaze = pupillerna följer --gaze-x och --gaze-y (se Miner).
export function Figur({
  figure,
  mood = 'vantar',
  animated = false,
  lively = false,
  asleep = false,
  look = 0,
  gaze = false,
  restartKey,
  delay,
  dress = false,
  crown = false,
  className,
}: {
  figure: BlobFigure
  mood?: Mood
  animated?: boolean
  lively?: boolean
  asleep?: boolean
  look?: -1 | 0 | 1
  gaze?: boolean
  restartKey?: number
  // Hur långt in i rörelsen figuren börjar (s), så att flera figurer inte rör sig som en enda.
  delay?: number
  // Vinnarklänningen (den som vann senast i lobbyn) och vinnarkronan (slutskärmen i Exploderande Tanter).
  dress?: boolean
  crown?: boolean
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { body } = figure
  const tilt = figure.frontTilt?.[mood]
  // Personligheten gäller bara när figuren väntar i väntrummet. Bara den sömniga (Sjusovaren) kan somna, och då andas
  // den bara lugnt.
  const lifelike = animated && lively && mood === 'vantar'
  asleep = asleep && figure.traits?.sleepy === true
  const motion = !animated ? undefined : lifelike ? (asleep ? MOOD_MOTION.vantar : figure.idle) : MOOD_MOTION[mood]
  const front = body.kind === 'png' ? body.frontSrc && <Picture src={body.frontSrc} /> : <DrawnFront figure={figure} lively={lifelike && !asleep} />

  return (
    <svg
      key={`${mood}-${restartKey ?? 0}-${asleep ? 'sover' : 'vaken'}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={figure.name}
      // Kroppens rörelse ligger på själva svg-elementet och inte på en grupp inuti, så att webbläsaren kan flytta hela
      // bilden utan att rita om den varje bildruta. Det håller tio figurer lätta på en mobil.
      className={cn('inline-block size-[1.2em] shrink-0 origin-[50%_90%] overflow-visible align-[-0.25em] select-none', motion, className)}
      style={delay === undefined ? undefined : { animationDelay: `${-delay}s` }}
    >
      <g>
        <g data-lager="bak">
          {body.kind === 'png' ? <Picture src={body.src} /> : <DrawnBack figure={figure} uid={uid} lively={lifelike && !asleep} />}
        </g>
        <g data-lager="min">
          <Face mood={mood} figure={figure} animated={animated} lively={lifelike} asleep={lifelike && asleep} look={look} gaze={gaze} />
        </g>
        <g data-lager="fram" transform={tilt && `translate(${tilt.x} ${tilt.y}) rotate(${tilt.rotate} 100 108)`}>
          {front}
        </g>
        {dress && <Tantklanning />}
        {crown && <Vinnarkrona />}
        {/* Sjusovaren sover: ett z som stiger och tonas bort, om och om igen. */}
        {lifelike && asleep && (
          <text x="150" y="58" className="fill-foreground font-heading text-[34px] font-bold motion-safe:animate-blob-zzz" aria-hidden>
            z
          </text>
        )}
      </g>
    </svg>
  )
}
