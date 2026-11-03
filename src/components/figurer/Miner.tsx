import type { BlobFigure, Mood } from '@/lib/figurer'

// De sex minerna. De är samma för alla figurer och ritas i kroppens koordinater (200 × 200). Ögonen sitter på samma
// plats i alla miner, så att prylar som glasögon alltid passar.
const EYES = [78, 122] as const
const EYE_Y = 108

const LINE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Stroke({ d, width = 7 }: { d: string; width?: number }) {
  return <path d={d} {...LINE} strokeWidth={width} className="stroke-foreground" />
}

// Öppna ögon. look flyttar pupillerna åt sidan och lid är ögonlockets färg när ögonen är halvstängda.
function OpenEyes({
  r = 14,
  pupil = 7,
  look = [0, 0],
  lid,
  blink = false,
}: {
  r?: number
  pupil?: number
  look?: readonly [number, number]
  lid?: string
  blink?: boolean
}) {
  return (
    <g className={blink ? 'origin-center [transform-box:fill-box] motion-safe:animate-blob-blink' : undefined}>
      {EYES.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={EYE_Y} r={r} className="fill-card" />
          <circle cx={x + look[i]} cy={EYE_Y + 1} r={pupil} className="fill-foreground" />
          {lid && <path d={`M${x - r - 1} ${EYE_Y - 1}A${r + 1} ${r + 1} 0 0 1 ${x + r + 1} ${EYE_Y - 1}Z`} style={{ fill: lid }} />}
        </g>
      ))}
    </g>
  )
}

function Waiting({ figure, animated }: { figure: BlobFigure; animated: boolean }) {
  const { crossEyed, sleepy } = figure.traits ?? {}
  return (
    <>
      <OpenEyes look={crossEyed ? [5, -5] : [0, 0]} lid={sleepy ? figure.palette.base : undefined} blink={animated} />
      <Stroke d={crossEyed ? 'M78 136Q100 158 122 136' : 'M84 138Q100 150 116 138'} />
    </>
  )
}

function Suspicious({ figure }: { figure: BlobFigure }) {
  return (
    <>
      <OpenEyes look={[6, 6]} lid={figure.palette.base} />
      <Stroke d="M58 86L92 92" />
      <Stroke d="M108 84Q124 72 142 84" />
      <Stroke d="M84 142Q102 134 118 140" />
    </>
  )
}

function Accused() {
  return (
    <>
      <OpenEyes r={16} pupil={4} />
      <Stroke d="M58 84Q74 72 92 82" />
      <Stroke d="M108 82Q126 72 142 84" />
      <ellipse cx="100" cy="146" rx="10" ry="13" className="fill-foreground" />
      <path d="M152 74Q160 88 152 94Q144 88 152 74Z" className="fill-sky" />
    </>
  )
}

function Hit() {
  return (
    <>
      {EYES.map((x) => (
        <Stroke key={x} d={`M${x - 11} ${EYE_Y - 11}L${x + 11} ${EYE_Y + 11}M${x + 11} ${EYE_Y - 11}L${x - 11} ${EYE_Y + 11}`} width={8} />
      ))}
      <Stroke d="M76 146Q84 134 92 146T108 146T124 146" />
      <path d="M38 74l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" className="fill-sun" />
      <path d="M160 66l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" className="fill-sun" />
    </>
  )
}

function Won() {
  return (
    <>
      <Stroke d="M62 112Q78 92 94 112" width={8} />
      <Stroke d="M106 112Q122 92 138 112" width={8} />
      <path d="M72 130Q100 136 128 130Q124 166 100 166Q76 166 72 130Z" className="fill-foreground" />
      <ellipse cx="100" cy="156" rx="14" ry="8" className="fill-coral-soft" />
      <ellipse cx="54" cy="130" rx="11" ry="7" className="fill-coral-soft opacity-70" />
      <ellipse cx="146" cy="130" rx="11" ry="7" className="fill-coral-soft opacity-70" />
    </>
  )
}

function VotedOut() {
  return (
    <>
      <Stroke d="M62 108Q78 120 94 108" width={8} />
      <Stroke d="M106 108Q122 120 138 108" width={8} />
      <Stroke d="M60 92L88 82" />
      <Stroke d="M112 82L140 92" />
      <Stroke d="M80 152Q100 132 120 152" />
      <path d="M78 122Q88 138 78 144Q68 138 78 122Z" className="fill-sky" />
    </>
  )
}

export function Face({ mood, figure, animated }: { mood: Mood; figure: BlobFigure; animated: boolean }) {
  switch (mood) {
    case 'vantar':
      return <Waiting figure={figure} animated={animated} />
    case 'misstankt':
      return <Suspicious figure={figure} />
    case 'anklagad':
      return <Accused />
    case 'traffad':
      return <Hit />
    case 'vann':
      return <Won />
    case 'utrostad':
      return <VotedOut />
  }
}
