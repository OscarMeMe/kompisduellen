import type { ReactNode } from 'react'
import type { BlobFigure, BlobId, BlobShape, Mood } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Kropparna i koordinaterna 200 × 200. Minen (Miner.tsx) ritas ovanpå, och ögonen sitter alltid kring y = 108.
// Allt ritas med former och gradienter, aldrig med SVG-filter, så att tio figurer i väntrummet flyter på en mobil.
// Rörelser på prylarna (tuggummit, röken, propellern) använder bara transform och opacity och gäller bara i väntrummet.
const BODY_PATHS: Record<BlobShape, string> = {
  // Den mjuka grundformen.
  blob: 'M100 48C140 48 168 78 170 118C172 156 146 178 100 178C54 178 28 156 30 118C32 78 60 48 100 48Z',
  // En droppe med spetsen uppåt.
  droppe: 'M100 26C110 50 168 86 168 126C168 158 140 180 100 180C60 180 32 158 32 126C32 86 90 50 100 26Z',
  // Rinner ut nertill, med droppar längs kanten.
  smalt:
    'M100 50C138 50 162 78 164 112C166 138 162 150 172 160C182 170 170 182 152 178C140 176 134 186 120 182C108 179 98 188 86 182C72 176 60 184 46 178C30 172 30 160 38 152C42 140 34 130 36 112C38 78 62 50 100 50Z',
}

// Högdagern, där ljuset träffar. Droppen är smalare upptill, så där sitter den längre in.
const SHINE: Record<BlobShape, { cx: number; cy: number }> = {
  blob: { cx: 68, cy: 80 },
  droppe: { cx: 78, cy: 84 },
  smalt: { cx: 68, cy: 82 },
}

// Kroppen, lite 3D: ljuset uppe till vänster, en mörkare rundning nedtill, en mjuk skugga och en tydligare
// kontaktskugga under figuren, och en blank ljuspunkt. Bara gradienter.
export function BlobShape({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const { light, base, dark } = figure.palette
  const shape = figure.shape ?? 'blob'
  const shine = SHINE[shape]
  const path = BODY_PATHS[shape]
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-kropp`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" style={{ stopColor: light }} />
          <stop offset="46%" style={{ stopColor: base }} />
          <stop offset="100%" style={{ stopColor: dark }} />
        </radialGradient>
        <linearGradient id={`${uid}-under`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" style={{ stopColor: dark, stopOpacity: 0 }} />
          <stop offset="100%" style={{ stopColor: dark, stopOpacity: 0.6 }} />
        </linearGradient>
        <radialGradient id={`${uid}-skugga`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.26 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-kontakt`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.42 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-glans`}>
          <stop offset="0%" style={{ stopColor: 'var(--card)', stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: 'var(--card)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-kind`}>
          <stop offset="0%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="183" rx="72" ry="13" fill={`url(#${uid}-skugga)`} />
      <ellipse cx="100" cy="180" rx="46" ry="6" fill={`url(#${uid}-kontakt)`} />
      <path d={path} fill={`url(#${uid}-kropp)`} style={figure.outline ? { stroke: dark, strokeWidth: 4 } : undefined} />
      <path d={path} fill={`url(#${uid}-under)`} />
      <ellipse cx={shine.cx} cy={shine.cy} rx="26" ry="15" transform={`rotate(-32 ${shine.cx} ${shine.cy})`} fill={`url(#${uid}-glans)`} />
      <circle cx={shine.cx - 8} cy={shine.cy - 5} r="5" className="fill-card" opacity="0.85" />
    </>
  )
}

// Rosiga kinder på alla. Blygis rodnar mer.
function Cheeks({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const [left, right] = figure.traits?.cyclops ? [58, 142] : [54, 146]
  const y = figure.traits?.cyclops ? 138 : 132
  const strong = figure.id === 'blygis'
  return (
    <g fill={`url(#${uid}-kind)`} opacity={strong ? 1 : 0.8}>
      <ellipse cx={left} cy={y} rx={strong ? 19 : 16} ry={strong ? 12 : 10} />
      <ellipse cx={right} cy={y} rx={strong ? 19 : 16} ry={strong ? 12 : 10} />
    </g>
  )
}

const svart = { fill: 'var(--figur-svart)' }

// Klumpen: kepsen bak och fram, lite på sned. Skärmen sticker ut bakåt snett uppåt, och fram syns kepsens öppning
// med det lilla bandet som spänns åt.
function BackwardsCap({ figure }: { figure: BlobFigure }) {
  return (
    <g transform="rotate(-8 100 50)">
      <path d="M126 40Q160 14 190 30Q186 42 168 46Q148 48 132 52Z" style={{ fill: 'var(--pryl-keps-mork)' }} />
      <path d="M134 44Q160 26 184 32" className="fill-none stroke-card opacity-30" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 70Q52 24 100 22Q148 24 150 70Q100 60 50 70Z" style={{ fill: 'var(--pryl-keps)' }} />
      <path d="M100 24Q84 40 80 64M100 24Q116 40 120 64" className="fill-none" style={{ stroke: 'var(--pryl-keps-mork)' }} strokeWidth="2.5" />
      <path d="M64 46Q76 32 94 28" className="fill-none stroke-card opacity-35" strokeWidth="5" strokeLinecap="round" />
      <path d="M82 66Q100 42 118 66Z" style={{ fill: figure.palette.base }} />
      <path d="M84 61L116 61" style={{ stroke: 'var(--pryl-keps-mork)' }} strokeWidth="5" strokeLinecap="round" />
      <rect x="95" y="57" width="10" height="8" rx="2" className="fill-card" />
      <circle cx="100" cy="23" r="4.5" style={{ fill: 'var(--pryl-keps-mork)' }} />
    </g>
  )
}

// Spionen: trenchcoat med uppfälld krage, och en hörsnäcka med sladd.
function CollarAndEarpiece() {
  return (
    <g>
      <path d="M31 132C34 162 58 178 100 178C142 178 166 162 169 132L136 152L100 178L64 152Z" style={{ fill: 'var(--pryl-rock)' }} />
      <path d="M100 178L88 160M100 178L112 160" className="fill-none" style={{ stroke: 'var(--pryl-rock-mork)' }} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="100" cy="170" r="2.6" style={{ fill: 'var(--pryl-rock-mork)' }} />
      <path d="M30 134L26 104L70 148L64 156Z" style={{ fill: 'var(--pryl-rock)', stroke: 'var(--pryl-rock-mork)' }} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M170 134L174 104L130 148L136 156Z" style={{ fill: 'var(--pryl-rock)', stroke: 'var(--pryl-rock-mork)' }} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M168 108q7 6 0 11q-7 5 0 11q7 6 0 12" className="fill-none" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="167" cy="103" r="6" style={svart} />
      <circle cx="165" cy="101" r="1.8" className="fill-card" opacity="0.7" />
    </g>
  )
}

// Sjusovarens sovmask. I pannan när den är vaken, över ögonen när den sover (främre lagret).
function SleepMask({ y }: { y: number }) {
  return (
    <g>
      <path d={`M30 ${y + 10}Q100 ${y - 10} 170 ${y + 10}`} className="fill-none" style={{ stroke: 'var(--pryl-sovmask-mork)' }} strokeWidth="6" />
      <path
        d={`M58 ${y - 10}Q80 ${y - 18} 100 ${y - 8}Q120 ${y - 18} 142 ${y - 10}Q154 ${y} 144 ${y + 12}Q122 ${y + 20} 100 ${y + 10}Q78 ${y + 20} 56 ${y + 12}Q46 ${y} 58 ${y - 10}Z`}
        style={{ fill: 'var(--pryl-sovmask)', stroke: 'var(--pryl-sovmask-mork)' }}
        strokeWidth="2.5"
      />
      {[78, 122].map((x) => (
        <g key={x}>
          <path d={`M${x - 10} ${y}Q${x} ${y + 7} ${x + 10} ${y}`} className="fill-none stroke-foreground" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M${x - 7} ${y + 4}l-2 4M${x} ${y + 5}v4M${x + 7} ${y + 4}l2 4`} className="fill-none stroke-foreground" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <path d={`M66 ${y - 10}Q76 ${y - 14} 86 ${y - 12}`} className="fill-none stroke-card" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </g>
  )
}

// Kudd-märket på kinden.
function PillowMark({ figure }: { figure: BlobFigure }) {
  return (
    <path
      d="M132 126Q145 121 158 126M136 135Q146 131 156 135"
      className="fill-none"
      style={{ stroke: figure.palette.dark }}
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />
  )
}

// Droppan: badmössa med blommor och simglasögonen uppe på pannan.
function SwimCap() {
  return (
    <g>
      <path d="M100 20C112 44 160 74 164 94Q100 72 36 94C40 74 88 44 100 20Z" style={{ fill: 'var(--pryl-badmossa)', stroke: 'var(--pryl-badmossa-mork)' }} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 94Q100 72 164 94" className="fill-none" style={{ stroke: 'var(--pryl-badmossa-mork)' }} strokeWidth="3" />
      {[
        [96, 46],
        [120, 64],
        [76, 66],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="6.5" className="fill-card" />
          <circle cx={x} cy={y} r="2.4" className="fill-sun" />
        </g>
      ))}
      <path d="M38 88Q100 66 162 88" className="fill-none" style={{ stroke: 'var(--pryl-simglas)' }} strokeWidth="5" />
      {[80, 120].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="78" rx="14" ry="10" className="fill-sky" style={{ stroke: 'var(--pryl-simglas)' }} strokeWidth="4" />
          <path d={`M${x - 7} ${74}Q${x - 3} ${71} ${x + 2} ${72}`} className="fill-none stroke-card" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

// Festis: solglasögonen uppskjutna på huvudet och en blomsterkrans.
function FestisGear() {
  const flowers = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const x = 46 * (1 - t) ** 2 + 2 * 100 * (1 - t) * t + 154 * t ** 2
    const y = 152 * (1 - t) ** 2 + 2 * 190 * (1 - t) * t + 152 * t ** 2
    return { x, y, color: ['fill-sun', 'fill-sky', 'fill-mint', 'fill-card'][i % 4] }
  })
  return (
    <g>
      <g transform="rotate(-8 100 58)">
        <path d="M60 58L44 62M140 58L156 62" className="fill-none" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="4" strokeLinecap="round" />
        <rect x="62" y="48" width="32" height="18" rx="8" style={svart} />
        <rect x="106" y="48" width="32" height="18" rx="8" style={svart} />
        <path d="M94 55H106" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="4" />
        <path d="M68 53L78 51M112 53L122 51" className="fill-none stroke-card opacity-60" strokeWidth="3" strokeLinecap="round" />
      </g>
      {flowers.map(({ x, y, color }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8" className={color} />
          <circle cx={x} cy={y} r="2.6" style={{ fill: 'var(--figur-fest-mork)' }} />
        </g>
      ))}
    </g>
  )
}

// Kungens sneda krona och guldkedja med en medaljong.
function KingGear() {
  return (
    <g>
      <g transform="rotate(-15 100 54) translate(-8 2)">
        <path d="M64 62L60 26L82 44L100 18L118 44L140 26L136 62Z" style={{ fill: 'var(--crown)' }} />
        <rect x="64" y="54" width="72" height="10" rx="4" style={{ fill: 'var(--crown)' }} />
        <circle cx="100" cy="46" r="6" className="fill-destructive" />
        <path d="M70 34L74 52" className="fill-none stroke-card opacity-50" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M48 142Q100 196 152 142" className="fill-none" style={{ stroke: 'var(--crown)' }} strokeWidth="6" strokeDasharray="7 4" strokeLinecap="round" />
      <circle cx="100" cy="168" r="11" style={{ fill: 'var(--crown)' }} />
      <circle cx="100" cy="168" r="4.5" className="fill-destructive" />
      <circle cx="96" cy="164" r="2.5" className="fill-card" opacity="0.7" />
    </g>
  )
}

// Ögats höga hatt, lite på sned.
function TopHat() {
  return (
    <g transform="rotate(8 100 56)" style={svart}>
      <path d="M64 58L68 10Q100 2 132 10L136 58Z" />
      <rect x="64" y="42" width="72" height="12" className="fill-destructive" />
      <ellipse cx="100" cy="60" rx="58" ry="10" />
      <path d="M76 16Q88 10 100 10" className="fill-none stroke-card opacity-25" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

// Burrets spretiga hår, bakom kroppen.
function SpikyHair({ figure, lively }: { figure: BlobFigure; lively: boolean }) {
  return (
    <path
      className={lively ? 'origin-[100px_80px] [transform-box:view-box] motion-safe:animate-blob-hair' : undefined}
      d="M44 84L30 48L60 62L58 22L82 50L98 10L110 48L134 18L134 56L166 44L156 84Z"
      style={{ fill: figure.palette.dark }}
    />
  )
}

// Burrets svettband i 80-talsstil.
function Sweatband() {
  return (
    <g>
      <path d="M33 98Q100 52 167 98" className="fill-none" style={{ stroke: 'var(--pryl-neon)' }} strokeWidth="15" />
      <path d="M36 95Q100 50 164 95" className="fill-none stroke-card" strokeWidth="3" opacity="0.8" />
    </g>
  )
}

// Bråkis: mössa, och hornen som sticker ut genom mössan.
function BrakisGear({ figure }: { figure: BlobFigure }) {
  return (
    <g>
      <path d="M52 72Q54 24 100 22Q146 24 148 72Z" style={{ fill: 'var(--pryl-mossa)' }} />
      <rect x="48" y="60" width="104" height="18" rx="9" style={{ fill: 'var(--pryl-mossa-ljus)' }} />
      <path d="M62 62v14M76 62v14M90 62v14M104 62v14M118 62v14M132 62v14" className="fill-none" style={{ stroke: 'var(--pryl-mossa)' }} strokeWidth="2.5" />
      <path d="M70 40Q50 32 52 6Q62 26 84 32Z" style={{ fill: figure.palette.base }} />
      <path d="M130 40Q150 32 148 6Q138 26 116 32Z" style={{ fill: figure.palette.base }} />
    </g>
  )
}

// Blygis luvtröja med huvan uppe (djupt rosa, så att figuren fortfarande ser rosa ut) och hörlurar ovanpå.
function Hoodie({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-luva`} cx="38%" cy="28%" r="80%">
          <stop offset="0%" style={{ stopColor: 'var(--pryl-luva-ljus)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--pryl-luva)' }} />
        </radialGradient>
      </defs>
      <path
        fillRule="evenodd"
        fill={`url(#${uid}-luva)`}
        d="M100 30C148 32 178 74 178 120C178 162 150 184 100 184C50 184 22 162 22 120C22 74 52 32 100 30ZM42 120A58 50 0 1 0 158 120A58 50 0 1 0 42 120Z"
      />
      <ellipse cx="100" cy="120" rx="58" ry="50" className="fill-none stroke-foreground" strokeWidth="3" opacity="0.2" />
      <path d="M100 30Q92 44 100 70" className="fill-none" style={{ stroke: 'var(--pryl-luva-kant)' }} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 168L82 184M114 168L118 184" className="fill-none stroke-card" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 108Q28 28 100 26Q172 28 172 108" className="fill-none" style={{ stroke: 'var(--pryl-luren)' }} strokeWidth="8" />
      <rect x="14" y="94" width="24" height="36" rx="11" style={{ fill: 'var(--pryl-luren)' }} />
      <rect x="162" y="94" width="24" height="36" rx="11" style={{ fill: 'var(--pryl-luren)' }} />
      <rect x="20" y="102" width="12" height="20" rx="6" className="fill-sky" />
      <rect x="168" y="102" width="12" height="20" rx="6" className="fill-sky" />
    </g>
  )
}

// Smältis: solkräm på näsan, och droppar som rinner i väntrummet.
function Sunscreen() {
  return (
    <g className="fill-card" opacity="0.95">
      <path d="M84 126Q100 114 116 126Q100 134 84 126Z" />
      <path d="M40 126Q52 120 64 124Q52 130 40 126Z" />
      <path d="M136 124Q148 120 160 126Q148 130 136 124Z" />
    </g>
  )
}

function Drips({ figure }: { figure: BlobFigure }) {
  return (
    <g style={{ fill: figure.palette.base }}>
      <ellipse cx="58" cy="132" rx="5" ry="7" className="motion-safe:animate-blob-drip" />
      <ellipse cx="146" cy="128" rx="4" ry="6" className="motion-safe:animate-blob-drip motion-safe:[animation-delay:2.2s]" />
    </g>
  )
}

// Plugghästen: propellerkeps (propellern snurrar i väntrummet) och pennor i bröstfickan.
function PropellerCap({ lively }: { lively: boolean }) {
  return (
    <g>
      <path d="M128 150L126 134M136 150L139 132M143 150L145 140" className="fill-none" strokeWidth="4.5" strokeLinecap="round" style={{ stroke: 'var(--pryl-penna)' }} />
      <circle cx="126" cy="134" r="2.3" className="fill-destructive" />
      <circle cx="139" cy="132" r="2.3" className="fill-sky" />
      <rect x="120" y="148" width="30" height="22" rx="4" className="fill-card" opacity="0.55" />
      <path d="M54 68Q56 28 100 26Q144 28 146 68Q100 58 54 68Z" className="fill-sun" />
      <path d="M84 64Q86 28 100 26Q114 28 116 64Q100 60 84 64Z" className="fill-sky" />
      <path d="M60 66Q100 82 140 66Q100 72 60 66Z" className="fill-destructive" />
      <path d="M100 26V14" className="fill-none stroke-foreground" strokeWidth="3" />
      <g className={lively ? 'origin-[100px_13px] [transform-box:view-box] motion-safe:animate-blob-propeller' : undefined}>
        <ellipse cx="88" cy="13" rx="13" ry="4" className="fill-destructive" />
        <ellipse cx="112" cy="13" rx="13" ry="4" className="fill-sky" />
      </g>
      <circle cx="100" cy="13" r="3.5" className="fill-foreground" />
    </g>
  )
}

// Prylar och drag som hör till kroppen: Under ritas före kroppen och Over ovanpå den (efter kinderna), men båda under
// minen. lively = figuren är i väntrummet och har sin egen rörelse. asleep = Sjusovaren sover.
type Extras = { figure: BlobFigure; uid: string; lively: boolean; asleep: boolean }
const UNDER: Partial<Record<BlobId, (extras: Extras) => ReactNode>> = {
  burret: ({ figure, lively }) => <SpikyHair figure={figure} lively={lively} />,
}
const OVER: Partial<Record<BlobId, (extras: Extras) => ReactNode>> = {
  klumpen: ({ figure }) => <BackwardsCap figure={figure} />,
  spionen: () => <CollarAndEarpiece />,
  sjusovaren: ({ figure, asleep }) => (
    <>
      <PillowMark figure={figure} />
      {!asleep && <SleepMask y={74} />}
    </>
  ),
  droppan: () => <SwimCap />,
  festis: () => <FestisGear />,
  kungen: () => <KingGear />,
  ogat: () => <TopHat />,
  burret: () => <Sweatband />,
  brakis: ({ figure }) => <BrakisGear figure={figure} />,
  blygis: ({ uid }) => <Hoodie uid={uid} />,
  smaltis: ({ figure, lively }) => (
    <>
      <Sunscreen />
      {lively && <Drips figure={figure} />}
    </>
  ),
  plugghasten: ({ lively }) => <PropellerCap lively={lively} />,
}

// Bakre lagret: skugga, kropp, kinder och prylar som ligger under minen. Samma i alla miner.
export function DrawnBack({ figure, uid, lively = false, asleep = false }: { figure: BlobFigure; uid: string; lively?: boolean; asleep?: boolean }) {
  const extras = { figure, uid, lively, asleep }
  return (
    <>
      {UNDER[figure.id]?.(extras)}
      <BlobShape figure={figure} uid={uid} />
      <Cheeks figure={figure} uid={uid} />
      {OVER[figure.id]?.(extras)}
    </>
  )
}

// Solglasögonen ligger över minen, så att de kan glida undan.
function Sunglasses() {
  return (
    <g>
      <path d="M92 106H108" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="7" />
      <rect x="54" y="92" width="42" height="32" rx="12" style={svart} />
      <rect x="104" y="92" width="42" height="32" rx="12" style={svart} />
      <path d="M62 102L74 98M112 102L124 98" className="fill-none stroke-card opacity-50" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

// Plugghästens stora runda glasögon. Glasen är genomskinliga, så att ögonen och minen syns.
function BigGlasses({ lively }: { lively: boolean }) {
  return (
    <g className={cn('fill-none', lively && 'motion-safe:animate-blob-glasses')} style={{ stroke: 'var(--figur-svart)' }} strokeWidth="6">
      <circle cx="78" cy="108" r="22" className="fill-card/25" />
      <circle cx="122" cy="108" r="22" className="fill-card/25" />
      <path d="M96 104Q100 98 104 104" strokeLinecap="round" />
      <path d="M56 104L36 96M144 104L164 96" strokeLinecap="round" />
    </g>
  )
}

// Ögats monokel med kedja.
function Monocle() {
  return (
    <g>
      <circle cx="100" cy="108" r="29" className="fill-card/15" style={{ stroke: 'var(--crown)' }} strokeWidth="5" />
      <path d="M80 92Q88 86 98 85" className="fill-none stroke-card opacity-70" strokeWidth="3" strokeLinecap="round" />
      <path d="M126 120Q152 140 146 176" className="fill-none" style={{ stroke: 'var(--crown)' }} strokeWidth="2.5" strokeDasharray="3 2.5" />
    </g>
  )
}

// Klumpens tuggummibubbla i mungipan. I väntrummet blåses den upp och spricker.
function GumBubble({ lively }: { lively: boolean }) {
  return (
    <g className={lively ? 'origin-[121px_139px] [transform-box:view-box] motion-safe:animate-blob-bubble' : undefined}>
      <circle cx="131" cy="143" r={lively ? 13 : 9} style={{ fill: 'var(--pryl-tuggummi)', stroke: 'var(--pryl-tuggummi-mork)' }} strokeWidth="2" />
      <circle cx={lively ? 126 : 128} cy={lively ? 138 : 140} r={lively ? 3.5 : 2.5} className="fill-card" opacity="0.8" />
    </g>
  )
}

// Bråkis cigarett i mungipan, och rökringar i väntrummet. Mungipan sitter olika i olika miner.
const MOUTH_CORNER: Partial<Record<Mood, [number, number]>> = { vantar: [114, 139], misstankt: [116, 140], sur: [112, 147] }
function Cigarette({ at, smoke }: { at: [number, number]; smoke: boolean }) {
  const [x, y] = at
  const tip: [number, number] = [x + 27, y - 9]
  return (
    <g>
      <path d={`M${x} ${y}L${tip[0]} ${tip[1]}`} className="fill-none stroke-card" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${x} ${y}L${x + 7} ${y - 2.3}`} className="fill-none" style={{ stroke: 'var(--pryl-strut)' }} strokeWidth="6" strokeLinecap="round" />
      <circle cx={tip[0]} cy={tip[1]} r="3.6" className="fill-destructive" />
      <circle cx={tip[0] + 0.5} cy={tip[1] - 0.5} r="1.6" className="fill-sun" />
      {smoke &&
        [0, 1.6].map((delay) => (
          <circle
            key={delay}
            cx={tip[0] + 2}
            cy={tip[1] - 8}
            r="6"
            className="fill-none stroke-card opacity-0 motion-safe:animate-blob-smoke"
            style={{ transformOrigin: `${tip[0] + 2}px ${tip[1] - 8}px`, transformBox: 'view-box', animationDelay: `${delay}s` }}
            strokeWidth="2.5"
          />
        ))}
    </g>
  )
}

// Främre lagret: prylar över minen. mood behövs för det som sitter i munnen, asleep för Sjusovarens mask.
export function DrawnFront({ figure, mood = 'vantar', lively = false, asleep = false }: { figure: BlobFigure; mood?: Mood; lively?: boolean; asleep?: boolean }) {
  switch (figure.id) {
    case 'spionen':
      return <Sunglasses />
    case 'plugghasten':
      return <BigGlasses lively={lively} />
    case 'ogat':
      return <Monocle />
    case 'klumpen':
      return mood === 'vantar' ? <GumBubble lively={lively} /> : null
    case 'brakis': {
      const at = MOUTH_CORNER[mood]
      return at ? <Cigarette at={at} smoke={lively && mood === 'vantar'} /> : null
    }
    case 'sjusovaren':
      return asleep ? <SleepMask y={106} /> : null
    default:
      return null
  }
}
