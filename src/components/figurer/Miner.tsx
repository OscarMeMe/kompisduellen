import type { BlobFigure, Mood } from '@/lib/figurer'

// De sju minerna. De är samma för alla figurer och ritas i kroppens koordinater (200 × 200). Ögonen sitter på samma
// plats i alla miner, så att prylar som glasögon alltid passar. Ögat (cyclops) har ett enda stort öga mitt i ansiktet,
// och då ritas varje min med det ögat och ett ögonbryn i stället för två.
const EYE_Y = 108

type Eyes = { xs: readonly number[]; scale: number; cyclops: boolean }

function eyesFor(figure: BlobFigure): Eyes {
  return figure.traits?.cyclops ? { xs: [100], scale: 1.7, cyclops: true } : { xs: [78, 122], scale: 1, cyclops: false }
}

const LINE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Stroke({ d, width = 7 }: { d: string; width?: number }) {
  return <path d={d} {...LINE} strokeWidth={width} className="stroke-foreground" />
}

// Öppna ögon. look flyttar pupillerna åt sidan och lid är ögonlockets färg när ögonen är halvstängda.
// pupilClass = en rörelse för pupillerna (Ögat som sveper med blicken i väntrummet).
function OpenEyes({
  eyes,
  r = 14,
  pupil = 7,
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
  return (
    <g className={blink ? 'origin-center [transform-box:fill-box] motion-safe:animate-blob-blink' : undefined}>
      {eyes.xs.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={EYE_Y} r={size} className="fill-card" />
          <g className={pupilClass}>
            <circle cx={x + (look[i] ?? 0) * eyes.scale} cy={EYE_Y + 1} r={pupil * eyes.scale} className="fill-foreground" />
          </g>
          {lid && <path d={`M${x - size - 1} ${EYE_Y - 1}A${size + 1} ${size + 1} 0 0 1 ${x + size + 1} ${EYE_Y - 1}Z`} style={{ fill: lid }} />}
        </g>
      ))}
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
// vänster (-1) eller höger (1) där någon nyss gjorde något.
export type FaceExtras = { lively?: boolean; asleep?: boolean; look?: -1 | 0 | 1 }

function Waiting({ figure, animated, lively = false, look = 0 }: { figure: BlobFigure; animated: boolean } & FaceExtras) {
  const eyes = eyesFor(figure)
  const { crossEyed, sleepy, haughty } = figure.traits ?? {}
  // Kungen står still och dömer i väntrummet: halvstängda ögon och ett höjt bryn.
  if (lively && haughty) {
    return (
      <>
        <OpenEyes eyes={eyes} look={[3, 3]} lid={figure.palette.base} />
        <Brows eyes={eyes} left="M60 90L92 90" right="M108 82Q124 70 142 80" single="M68 76Q100 66 132 72" />
        <Stroke d={eyes.cyclops ? 'M88 148L114 146' : 'M88 140L114 137'} />
      </>
    )
  }
  // Ögat sveper med blicken, eller tittar dit något nyss hände.
  const scan = lively && eyes.cyclops
  const lookAt = scan && look !== 0 ? [look * 8] : crossEyed ? [5, -5] : [0, 0]
  return (
    <>
      <OpenEyes
        eyes={eyes}
        look={lookAt}
        lid={sleepy ? figure.palette.base : undefined}
        blink={animated}
        pupilClass={scan && look === 0 ? 'motion-safe:animate-blob-scan' : undefined}
      />
      <Stroke d={crossEyed ? 'M78 136Q100 158 122 136' : eyes.cyclops ? 'M84 146Q100 156 116 146' : 'M84 138Q100 150 116 138'} />
    </>
  )
}

// Sjusovaren har somnat: slutna ögon och en liten öppen mun.
function Sleeping({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 14 * s} ${EYE_Y}Q${x} ${EYE_Y + 8 * s} ${x + 14 * s} ${EYE_Y}`} width={6} />
      <ellipse cx="100" cy={eyes.cyclops ? 150 : 142} rx="6" ry="7" className="fill-foreground" />
    </>
  )
}

function Suspicious({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} look={[6, 6]} lid={figure.palette.base} />
      <Brows eyes={eyes} left="M58 86L92 92" right="M108 84Q124 72 142 84" single="M66 76L134 68" />
      <Stroke d={eyes.cyclops ? 'M84 150Q102 144 118 148' : 'M84 142Q102 134 118 140'} />
    </>
  )
}

function Accused({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} r={16} pupil={4} />
      <Brows eyes={eyes} left="M58 84Q74 72 92 82" right="M108 82Q126 72 142 84" single="M66 72Q100 56 134 72" />
      <ellipse cx="100" cy={eyes.cyclops ? 154 : 146} rx="10" ry="13" className="fill-foreground" />
      <path d="M152 74Q160 88 152 94Q144 88 152 74Z" className="fill-sky" />
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
          const d = 11 * s
          return `M${x - d} ${EYE_Y - d}L${x + d} ${EYE_Y + d}M${x + d} ${EYE_Y - d}L${x - d} ${EYE_Y + d}`
        }}
      />
      <Stroke d={eyes.cyclops ? 'M76 154Q84 142 92 154T108 154T124 154' : 'M76 146Q84 134 92 146T108 146T124 146'} />
      <path d="M38 74l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" className="fill-sun" />
      <path d="M160 66l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" className="fill-sun" />
    </>
  )
}

function Won({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  const mouthY = eyes.cyclops ? 8 : 0
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 16 * s} ${EYE_Y + 4 * s}Q${x} ${EYE_Y - 16 * s} ${x + 16 * s} ${EYE_Y + 4 * s}`} />
      <path
        d={`M72 ${130 + mouthY}Q100 ${136 + mouthY} 128 ${130 + mouthY}Q124 ${166 + mouthY} 100 ${166 + mouthY}Q76 ${166 + mouthY} 72 ${130 + mouthY}Z`}
        className="fill-foreground"
      />
      <ellipse cx="100" cy={156 + mouthY} rx="14" ry="8" className="fill-coral-soft" />
      <ellipse cx="54" cy="130" rx="11" ry="7" className="fill-coral-soft opacity-70" />
      <ellipse cx="146" cy="130" rx="11" ry="7" className="fill-coral-soft opacity-70" />
    </>
  )
}

function VotedOut({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <EyeStrokes eyes={eyes} draw={(x, s) => `M${x - 16 * s} ${EYE_Y}Q${x} ${EYE_Y + 12 * s} ${x + 16 * s} ${EYE_Y}`} />
      <Brows eyes={eyes} left="M60 92L88 82" right="M112 82L140 92" single="M70 82Q100 70 130 82" />
      <Stroke d={eyes.cyclops ? 'M80 158Q100 140 120 158' : 'M80 152Q100 132 120 152'} />
      <path d={eyes.cyclops ? 'M82 128Q92 144 82 150Q72 144 82 128Z' : 'M78 122Q88 138 78 144Q68 138 78 122Z'} className="fill-sky" />
    </>
  )
}

// Sur: halvstängda ögon som sneglar åt sidan (mot vinnaren), bryn som sänks inåt och en trutande mun.
function Sulky({ figure }: { figure: BlobFigure }) {
  const eyes = eyesFor(figure)
  return (
    <>
      <OpenEyes eyes={eyes} look={[-6, -6]} lid={figure.palette.base} />
      <Brows eyes={eyes} left="M58 82L92 94" right="M108 94L142 82" single="M64 68L100 80L136 68" />
      <Stroke d={eyes.cyclops ? 'M86 156Q100 146 114 156' : 'M86 148Q100 138 114 148'} />
      <ellipse cx={eyes.cyclops ? 122 : 120} cy={eyes.cyclops ? 154 : 146} rx="4" ry="3" className="fill-foreground" />
    </>
  )
}

export function Face({ mood, figure, animated, lively, asleep, look }: { mood: Mood; figure: BlobFigure; animated: boolean } & FaceExtras) {
  switch (mood) {
    case 'vantar':
      return asleep ? <Sleeping figure={figure} /> : <Waiting figure={figure} animated={animated} lively={lively} look={look} />
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
