import type { ReactNode } from 'react'
import type { BlobFigure, Mood } from '@/lib/figurer'

// De sju minerna. De är samma för alla figurer och ritas i kroppens koordinater (200 × 200). Ögonen är stora, blanka
// och sitter på samma plats i alla miner (EYE_X, EYE_Y), så att prylar som glasögon alltid passar. Munnen sitter under
// ögonen (runt MOUTH_Y). Ögat (cyclops) har ett enda stort öga mitt i ansiktet, och då ritas varje min med det ögat och
// ett ögonbryn i stället för två, och munnen lite längre ned.
const EYE_Y = 106
const EYE_X = [70, 130] as const
const EYE_R = 25
// Ögats enda öga är så här mycket större än ett vanligt.
const CYCLOPS_SCALE = 1.6
// Hur mycket längre ned munnen sitter hos Ögat.
const CYCLOPS_MOUTH = 10

type Eyes = { xs: readonly number[]; scale: number; cyclops: boolean }

function eyesFor(figure: BlobFigure): Eyes {
  return figure.traits?.cyclops ? { xs: [100], scale: CYCLOPS_SCALE, cyclops: true } : { xs: EYE_X, scale: 1, cyclops: false }
}

const LINE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Stroke({ d, width = 7 }: { d: string; width?: number }) {
  return <path d={d} {...LINE} strokeWidth={width} className="stroke-current" />
}

// Munnen och det som hör till den. Hos Ögat flyttas den ned, under det stora ögat.
function Mouth({ eyes, children }: { eyes: Eyes; children: ReactNode }) {
  return eyes.cyclops ? <g transform={`translate(0 ${CYCLOPS_MOUTH})`}>{children}</g> : <>{children}</>
}

// Öppna ögon: vitt, en stor pupill och två ljuspunkter (en stor och en liten) som följer pupillen. look flyttar
// pupillerna åt sidan och lid är ögonlockets färg när ögonen är halvstängda. pupilClass = en rörelse för pupillerna
// (Ögat som sveper med blicken i väntrummet).
function OpenEyes({
  eyes,
  r = EYE_R,
  pupil = 12,
  look = [0, 0],
  lid,
  blink = false,
  pupilClass,
}: {
  eyes: Eyes
  r?: number
  pupil?: number
  look?: readonly number[]
  lid?: string
  blink?: boolean
  pupilClass?: string
}) {
  const size = r * eyes.scale
  const p = pupil * eyes.scale
  return (
    // --blink-delay låter figurer som står bredvid varandra blinka i otakt.
    <g
      className={blink ? 'origin-center [transform-box:fill-box] motion-safe:animate-blob-blink' : undefined}
      style={blink ? { animationDelay: 'var(--blink-delay, 0s)' } : undefined}
    >
      {eyes.xs.map((x, i) => {
        const px = x + (look[i] ?? 0) * eyes.scale
        const py = EYE_Y + 2
        return (
          <g key={x}>
            <circle cx={x} cy={EYE_Y} r={size} className="fill-card" />
            {/* En svag skugga nedtill i ögonvitan, så att ögat ser runt ut. */}
            <path d={`M${x - size * 0.86} ${EYE_Y + size * 0.42}A${size} ${size} 0 0 0 ${x + size * 0.86} ${EYE_Y + size * 0.42}`} className="fill-foreground" opacity="0.08" />
            <g className={pupilClass}>
              <circle cx={px} cy={py} r={p} className="fill-foreground" />
              {/* Glansen: en stor och en liten ljuspunkt. */}
              <circle cx={px + p * 0.38} cy={py - p * 0.42} r={Math.max(2, p * 0.4)} className="fill-card" />
              <circle cx={px - p * 0.4} cy={py + p * 0.38} r={Math.max(1, p * 0.18)} className="fill-card" opacity="0.85" />
            </g>
            {lid && <path d={`M${x - size - 1} ${EYE_Y - 1}A${size + 1} ${size + 1} 0 0 1 ${x + size + 1} ${EYE_Y - 1}Z`} style={{ fill: lid }} />}
          </g>
        )
      })}
    </g>
  )
}

// Ögon som båge, kryss och liknande: ritas runt varje öga, större för Ögat.
function EyeStrokes({ eyes, draw, width = 8 }: { eyes: Eyes; draw: (x: number, s: number) => string; width?: number }) {
  return (
    <>
      {eyes.xs.map((x) => (
        <Stroke key={x} d={draw(x, eyes.scale)} width={width * Math.min(eyes.scale, 1.3)} />
      ))}
    </>
  )
}

// Ögonbrynen: två vanligtvis, ett brett för Ögat. left och right är bryn för vänster och höger öga, single för Ögat.
function Brows({ eyes, left, right, single }: { eyes: Eyes; left: string; right: string; single: string }) {
  return eyes.cyclops ? (
    <Stroke d={single} />
  ) : (
    <>
      <Stroke d={left} />
      <Stroke d={right} />
    </>
  )
}

// Hur figuren beter sig i väntrummet: lively = sin egen rörelse, asleep = Sjusovaren har somnat, look = Ögat tittar åt
// vänster (-1) eller höger (1) där någon nyss gjorde något. gaze = pupillerna följer --gaze-x och --gaze-y (-1 till 1) från
// ett element utanför, t.ex. muspekaren på startsidan.
export type FaceExtras = { lively?: boolean; asleep?: boolean; look?: -1 | 0 | 1; gaze?: boolean }

// Pupillerna flyttas med CSS-variabler, så att React inte behöver rita om figuren när blicken ändras.
const GAZE_CLASS = 'transition-[translate] duration-150 ease-out [translate:calc(var(--gaze-x,0)*9px)_calc(var(--gaze-y,0)*6px)]'

function Waiting({ figure, animated, lively = false, look = 0, gaze = false }: { figure: BlobFigure; animated: boolean } & FaceExtras) {
  const eyes = eyesFor(figure)
  const { crossEyed, sleepy, haughty } = figure.traits ?? {}
  // Kungen står still och dömer i väntrummet: halvstängda ögon och ett höjt bryn. Med gaze sneglar han efter
  // muspekaren under ögonlocken.
  if (lively && haughty) {
    return (
      <>
        <OpenEyes eyes={eyes} look={[6, 6]} lid={figure.palette.base} pupilClass={gaze ? GAZE_CLASS : undefined} />
        <Brows eyes={eyes} left="M46 80L94 80" right="M106 72Q130 56 154 68" single="M60 58Q100 46 140 52" />
        <Mouth eyes={eyes}>
          <Stroke d="M88 152L114 148" />
        </Mouth>
      </>
    )
  }
  // Ögat sveper med blicken, eller tittar dit något nyss hände.
  const scan = lively && eyes.cyclops
  const lookAt = scan && look !== 0 ? [look * 12] : crossEyed ? [8, -8] : [0, 0]
  return (
    <>
      <OpenEyes
        eyes={eyes}
        look={lookAt}
        lid={sleepy ? figure.palette.base : undefined}
        blink={animated}
        pupilClass={gaze ? GAZE_CLASS : scan && look === 0 ? 'motion-safe:animate-blob-scan' : undefined}
      />
      <Mouth eyes={eyes}>
        <Stroke d={crossEyed ? 'M80 144Q100 166 120 144' : 'M86 146Q100 158 114 146'} />
      </Mouth>
    </>
  )
}

// Sjusovaren har somnat: slutna ögon och en liten öppen mun.
function Sleeping({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 20 * s} ${EYE_Y + 2}Q${x} ${EYE_Y + 14 * s} ${x + 20 * s} ${EYE_Y + 2}`} width={6} />
      <Mouth eyes={eyes}>
        <ellipse cx="100" cy="150" rx="6" ry="7" className="fill-current" />
      </Mouth>
    </>
  )
}

function Suspicious({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} look={[10, 10]} lid={figure.palette.base} />
      <Brows eyes={eyes} left="M44 78L96 88" right="M104 86Q128 64 156 76" single="M56 56L144 46" />
      <Mouth eyes={eyes}>
        <Stroke d="M86 152Q102 144 118 150" />
      </Mouth>
    </>
  )
}

function Accused({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} r={27} pupil={7} />
      <Brows eyes={eyes} left="M44 74Q70 58 96 70" right="M104 70Q130 58 156 74" single="M58 50Q100 32 142 50" />
      <Mouth eyes={eyes}>
        <ellipse cx="100" cy="154" rx="11" ry="13" className="fill-current" />
      </Mouth>
      <path d="M164 62Q174 80 164 88Q154 80 164 62Z" className="fill-sky" />
    </>
  )
}

function Hit({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes
        eyes={eyes}
        draw={(x, s) => {
          const d = 15 * s
          return `M${x - d} ${EYE_Y - d}L${x + d} ${EYE_Y + d}M${x + d} ${EYE_Y - d}L${x - d} ${EYE_Y + d}`
        }}
        width={9}
      />
      <Mouth eyes={eyes}>
        <Stroke d="M78 152Q86 140 94 152T110 152T126 152" />
      </Mouth>
      <path d="M30 66l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" className="fill-sun" />
      <path d="M166 58l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" className="fill-sun" />
    </>
  )
}

function Won({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 20 * s} ${EYE_Y + 6 * s}Q${x} ${EYE_Y - 20 * s} ${x + 20 * s} ${EYE_Y + 6 * s}`} width={9} />
      <Mouth eyes={eyes}>
        <path d="M76 136Q100 142 124 136Q120 166 100 166Q80 166 76 136Z" className="fill-current" />
        <ellipse cx="100" cy="158" rx="13" ry="6.5" className="fill-coral-soft" />
      </Mouth>
    </>
  )
}

function VotedOut({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 20 * s} ${EYE_Y}Q${x} ${EYE_Y + 16 * s} ${x + 20 * s} ${EYE_Y}`} />
      <Brows eyes={eyes} left="M46 88L88 74" right="M112 74L154 88" single="M60 62Q100 46 140 62" />
      <Mouth eyes={eyes}>
        <Stroke d="M80 160Q100 140 120 160" />
      </Mouth>
      <path d={eyes.cyclops ? 'M74 136Q84 152 74 158Q64 152 74 136Z' : 'M62 124Q72 140 62 146Q52 140 62 124Z'} className="fill-sky" />
    </>
  )
}

// Sur: halvstängda ögon som sneglar åt sidan (mot vinnaren), bryn som sänks inåt och en trutande mun.
function Sulky({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} look={[-10, -10]} lid={figure.palette.base} />
      <Brows eyes={eyes} left="M44 74L96 90" right="M104 90L156 74" single="M54 52L100 68L146 52" />
      <Mouth eyes={eyes}>
        <Stroke d="M88 156Q100 146 112 156" />
        <ellipse cx="119" cy="154" rx="4" ry="3" className="fill-current" />
      </Mouth>
    </>
  )
}

export function Face({ mood, figure, animated, lively, asleep, look, gaze }: { mood: Mood; figure: BlobFigure; animated: boolean } & FaceExtras) {
  switch (mood) {
    case 'vantar':
      return asleep ? <Sleeping figure={figure} /> : <Waiting figure={figure} animated={animated} lively={lively} look={look} gaze={gaze} />
    case 'misstankt':
      return <Suspicious figure={figure} />
    case 'anklagad':
      return <Accused figure={figure} />
    case 'traffad':
      return <Hit figure={figure} />
    case 'vann':
      return <Won figure={figure} />
    case 'utrostad':
      return <VotedOut figure={figure} />
    case 'sur':
      return <Sulky figure={figure} />
  }
}
