import { useId } from 'react'
import { Arms } from '@/components/figurer/Armar'
import { DrawnBack, DrawnFront, PictureCheeks, PictureFront, PictureShadow } from '@/components/figurer/Kroppar'
import { Face } from '@/components/figurer/Miner'
import { Tantklanning, Vinnarkrona } from '@/components/figurer/Tantklanning'
import { MOOD_MOTION, type BlobFigure, type Mood } from '@/lib/figurer'
import { cn } from '@/lib/utils'

const SIZE = 200
// Hur mycket ansiktet flyttas upp och klänningen ned på en figur som bild med tantklänningen.
const DRESS_FACE_LIFT = 8
const DRESS_DROP = 12

function Picture({ src }: { src: string }) {
  return <image href={src} x="0" y="0" width={SIZE} height={SIZE} />
}

// En blobb i tre lager: bakre lagret (kropp och prylar), minen och främre lagret (prylar över minen). Kroppen är en bild
// (public/figurer/) eller ritad i kod, och minen är samma i båda fallen. På en bild ritas ansiktet (kinderna, minen och
// glasögonen) på figurens egen ansiktsplacering (face). Storleken följer textstorleken, som Emoji. small = den lilla
// bilden, för emoji-storlek.
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
  small = false,
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
  small?: boolean
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
  const sleeping = lifelike && asleep
  const png = body.kind === 'png'
  // Ansiktets placering på bilden: ansiktets mitt (100, 118 i minernas koordinater) flyttas till face och skalas.
  const face = png ? figure.face : undefined
  // Med tantklänningen på flyttas ansiktet lite uppåt och klänningen lite nedåt, så att kragen inte täcker munnen.
  const faceY = face ? face.y - (dress ? DRESS_FACE_LIFT : 0) : 0
  const faceTransform = face ? `translate(${face.x} ${faceY}) scale(${face.scale}) translate(-100 -118)` : undefined
  const tiltTransform = tilt && `translate(${tilt.x} ${tilt.y}) rotate(${tilt.rotate} 100 108)`
  const front = png ? (
    <>
      <PictureFront figure={figure} mood={mood} lively={lifelike && !asleep} />
      {body.frontSrc && <Picture src={body.frontSrc} />}
    </>
  ) : (
    <DrawnFront figure={figure} mood={mood} lively={lifelike && !asleep} asleep={sleeping} />
  )

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
          {png ? (
            <>
              <PictureShadow uid={uid} />
              <Picture src={small && body.smallSrc ? body.smallSrc : body.src} />
            </>
          ) : (
            <DrawnBack figure={figure} uid={uid} lively={lifelike && !asleep} asleep={sleeping} />
          )}
        </g>
        {/* Mun och linjer följer textfärgen: ljusa på de mörka figurerna (lightFace). */}
        <g
          data-lager="min"
          transform={faceTransform}
          className={figure.traits?.lightFace ? 'text-[var(--figur-ansikte-ljus)]' : 'text-foreground'}
        >
          {png && <PictureCheeks figure={figure} uid={uid} />}
          <Face mood={mood} figure={figure} animated={animated} lively={lifelike} asleep={lifelike && asleep} look={look} gaze={gaze} />
        </g>
        <g data-lager="fram" transform={[faceTransform, tiltTransform].filter(Boolean).join(' ') || undefined}>
          {front}
        </g>
        {dress && (png ? <g transform={`translate(0 ${DRESS_DROP})`}><Tantklanning /></g> : <Tantklanning />)}
        {/* Armarna följer minen och ligger överst, så att de kan hålla för ansiktet. En kropp som bild har egna armar. */}
        <g data-lager="armar">{body.kind === 'svg' && <Arms figure={figure} mood={mood} lively={lifelike && !asleep} />}</g>
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
