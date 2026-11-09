import type { BlobFigure, Mood } from '@/lib/figurer'

// Korta, knubbiga armar som följer minen, ritade ovanpå allt annat i figuren (de kan hålla för ansiktet). Varje arm är
// en tjock böjd linje från axeln till handen med en mörkare kant, och handen är en rund vante. Bara former, inga filter.
type Point = readonly [number, number]
type Arm = { shoulder: Point; bend: Point; hand: Point }
// hold = handen kan hålla figurens pryl. Armar som korsas ritas med vänster arm sist, så att den ligger över.
type Pose = { left: Arm; right: Arm; hold: boolean }

const POSES: Record<Mood, Pose> = {
  // Händerna vilar vid sidorna.
  vantar: {
    left: { shoulder: [46, 134], bend: [28, 146], hand: [36, 164] },
    right: { shoulder: [154, 134], bend: [172, 146], hand: [164, 164] },
    hold: true,
  },
  // Vänster hand under hakan, och funderar.
  misstankt: {
    left: { shoulder: [48, 140], bend: [56, 176], hand: [80, 160] },
    right: { shoulder: [154, 134], bend: [172, 146], hand: [164, 164] },
    hold: true,
  },
  // Händerna upp: det var inte jag!
  anklagad: {
    left: { shoulder: [44, 128], bend: [24, 124], hand: [24, 100] },
    right: { shoulder: [156, 128], bend: [176, 124], hand: [176, 100] },
    hold: true,
  },
  // Händerna för ansiktet.
  traffad: {
    left: { shoulder: [46, 134], bend: [42, 110], hand: [64, 110] },
    right: { shoulder: [154, 134], bend: [158, 110], hand: [136, 110] },
    hold: false,
  },
  // Armarna rakt upp.
  vann: {
    left: { shoulder: [44, 124], bend: [22, 106], hand: [28, 74] },
    right: { shoulder: [156, 124], bend: [178, 106], hand: [172, 74] },
    hold: true,
  },
  // Armarna hänger slappt.
  utrostad: {
    left: { shoulder: [44, 140], bend: [30, 158], hand: [22, 176] },
    right: { shoulder: [156, 140], bend: [170, 158], hand: [178, 176] },
    hold: false,
  },
  // Armarna i kors.
  sur: {
    left: { shoulder: [46, 140], bend: [80, 172], hand: [124, 158] },
    right: { shoulder: [154, 140], bend: [120, 174], hand: [76, 160] },
    hold: false,
  },
}

// Höger hand framför magen när den håller något och väntar.
const HOLDING: Arm = { shoulder: [152, 138], bend: [168, 162], hand: [142, 160] }

// Prylen i handen, ritad med handen i (0, 0) och uppåt. Handen ritas ovanpå, så att den håller i prylen.
const PROPS: Partial<Record<BlobFigure['id'], (lively: boolean) => React.ReactNode>> = {
  // Festis drink med paraply och sugrör.
  festis: () => (
    <g>
      <path d="M4 -26L13 -46" className="fill-none stroke-destructive" strokeWidth="3" strokeLinecap="round" />
      <path d="M-11 -4L-14 -30H14L11 -4Z" className="fill-card" opacity="0.75" />
      <path d="M-12 -12L-13.5 -25H13.5L12 -12Z" className="fill-sun" />
      <path d="M-7 -22l3 -3" className="fill-none stroke-card" strokeWidth="2" strokeLinecap="round" />
      <path d="M-10 -41L-3 -27" className="fill-none stroke-foreground" strokeWidth="2" strokeLinecap="round" />
      <path d="M-26 -36Q-12 -54 4 -40Z" className="fill-sky" />
      <path d="M-26 -36Q-18 -40 -11 -38Q-4 -42 4 -40" className="fill-none stroke-card" strokeWidth="1.5" />
    </g>
  ),
  // Kungens vinpokal i guld.
  kungen: () => (
    <g>
      <path d="M-15 -42Q-15 -18 0 -16Q15 -18 15 -42Z" style={{ fill: 'var(--crown)' }} />
      <ellipse cx="0" cy="-40" rx="13" ry="4" style={{ fill: 'var(--pryl-vin)' }} />
      <rect x="-2.5" y="-17" width="5" height="12" style={{ fill: 'var(--crown)' }} />
      <ellipse cx="0" cy="-4" rx="11" ry="3.5" style={{ fill: 'var(--crown)' }} />
      <path d="M-10 -34Q-9 -24 -4 -21" className="fill-none stroke-card" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  // Blygis mobil, med skärmen mot Blygis: vi ser baksidan med kameran, och skärmens sken syns runt kanten.
  blygis: () => (
    <g transform="rotate(-10)">
      <rect x="-12" y="-38" width="24" height="38" rx="6" className="fill-sky" opacity="0.45" />
      <rect x="-10" y="-36" width="20" height="34" rx="4.5" style={{ fill: 'var(--pryl-luren)' }} />
      <rect x="-7" y="-33" width="8" height="11" rx="3" className="fill-foreground" />
      <circle cx="-3" cy="-30" r="2" className="fill-sky" />
      <circle cx="-3" cy="-25" r="2" className="fill-sky" />
      <circle cx="5" cy="-31" r="1.4" className="fill-sun" />
      <path d="M6 -20L6 -8" className="fill-none stroke-card" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </g>
  ),
  // Smältis glasstrut som droppar.
  smaltis: (lively) => (
    <g>
      <path d="M-12 -20H12L0 6Z" style={{ fill: 'var(--pryl-strut)' }} />
      <path d="M-8 -14L4 -2M0 -20L8 -12M-4 -20L-8 -14M4 -18L-2 -4" className="fill-none" style={{ stroke: 'var(--pryl-strut-mork)' }} strokeWidth="1.5" />
      <circle cx="0" cy="-28" r="13" style={{ fill: 'var(--pryl-glass)' }} />
      <path d="M-13 -24Q-12 -16 -8 -20Q-6 -12 -2 -18Q2 -12 5 -19Q9 -14 13 -24Z" style={{ fill: 'var(--pryl-glass)' }} />
      <circle cx="-5" cy="-33" r="3.5" className="fill-card" opacity="0.7" />
      <ellipse
        cx="9"
        cy="-16"
        rx="2.8"
        ry="4"
        style={{ fill: 'var(--pryl-glass)' }}
        className={lively ? 'motion-safe:animate-blob-drip' : undefined}
      />
    </g>
  ),
}

// En punkt på armens båge (t mellan 0 och 1), för svettbandet vid handleden.
function along(arm: Arm, t: number): Point {
  const u = 1 - t
  return [
    u * u * arm.shoulder[0] + 2 * u * t * arm.bend[0] + t * t * arm.hand[0],
    u * u * arm.shoulder[1] + 2 * u * t * arm.bend[1] + t * t * arm.hand[1],
  ]
}

function OneArm({ arm, color, edge, band, prop }: { arm: Arm; color: string; edge: string; band: boolean; prop?: React.ReactNode }) {
  const d = `M${arm.shoulder[0]} ${arm.shoulder[1]}Q${arm.bend[0]} ${arm.bend[1]} ${arm.hand[0]} ${arm.hand[1]}`
  const wrist = along(arm, 0.78)
  return (
    <g>
      <path d={d} fill="none" style={{ stroke: edge }} strokeWidth="20" strokeLinecap="round" />
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth="14" strokeLinecap="round" />
      {band && <circle cx={wrist[0]} cy={wrist[1]} r="8.5" style={{ fill: 'var(--pryl-turkos)', stroke: edge }} strokeWidth="2.5" />}
      {prop && <g transform={`translate(${arm.hand[0]} ${arm.hand[1]}) scale(1.5)`}>{prop}</g>}
      <circle cx={arm.hand[0]} cy={arm.hand[1]} r="10.5" style={{ fill: color, stroke: edge }} strokeWidth="3" />
      <circle cx={arm.hand[0] - 3.5} cy={arm.hand[1] - 3.5} r="3" className="fill-card" opacity="0.45" />
    </g>
  )
}

// Armarna för en min. lively = figuren är i väntrummet (prylarnas rörelser).
export function Arms({ figure, mood, lively = false }: { figure: BlobFigure; mood: Mood; lively?: boolean }) {
  const pose = POSES[mood]
  const prop = pose.hold ? PROPS[figure.id]?.(lively) : undefined
  const holding = prop !== undefined && (mood === 'vantar' || mood === 'misstankt')
  // Blygis armar är luvtröjans ärmar.
  const color = figure.id === 'blygis' ? 'var(--pryl-luva)' : figure.palette.base
  const edge = figure.id === 'blygis' ? 'var(--pryl-luva-kant)' : figure.palette.dark
  const band = figure.id === 'burret'
  const right = holding ? HOLDING : pose.right
  return (
    <g aria-hidden>
      <OneArm arm={right} color={color} edge={edge} band={band} prop={prop} />
      <OneArm arm={pose.left} color={color} edge={edge} band={band} />
    </g>
  )
}
