import type { ReactNode } from 'react'
import type { BlobFigure, BlobShape, Mood } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Kropparna i koordinaterna 200 × 200. Minen (Miner.tsx) ritas ovanpå, och de stora ögonen sitter alltid kring
// (70, 106) och (130, 106) med radien 25 (Ögats enda öga kring (100, 106) med radien 40), munnen runt y = 150.
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

// Ljuspunkten, där ljuset träffar uppe till vänster. Droppen är smalare upptill, så där sitter den längre in.
const SHINE: Record<BlobShape, { cx: number; cy: number }> = {
  blob: { cx: 64, cy: 74 },
  droppe: { cx: 74, cy: 78 },
  smalt: { cx: 64, cy: 76 },
}

// En blandning av två färger, för mjukare övergångar i gradienterna.
const mix = (a: string, b: string, share = 50) => `color-mix(in oklch, ${a} ${share}%, ${b})`

// Kroppen, lite 3D som gummi eller lera: ljuset uppe till vänster med mjuka övergångar, en mörkare rundning nedtill med
// lite återkastat ljus längst ned, en mjuk skugga och en tydlig kontaktskugga under figuren, och en blank ljuspunkt.
// Bara gradienter. Gradienten kropp används också till armarna.
export function BlobShape({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const { light, base, dark } = figure.palette
  const shape = figure.shape ?? 'blob'
  const shine = SHINE[shape]
  const path = BODY_PATHS[shape]
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-kropp`} cx="36%" cy="28%" r="82%">
          <stop offset="0%" style={{ stopColor: light }} />
          <stop offset="28%" style={{ stopColor: mix(light, base) }} />
          <stop offset="56%" style={{ stopColor: base }} />
          <stop offset="84%" style={{ stopColor: mix(base, dark) }} />
          <stop offset="100%" style={{ stopColor: dark }} />
        </radialGradient>
        <linearGradient id={`${uid}-under`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="45%" style={{ stopColor: dark, stopOpacity: 0 }} />
          <stop offset="86%" style={{ stopColor: dark, stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: dark, stopOpacity: 0.25 }} />
        </linearGradient>
        <radialGradient id={`${uid}-skugga`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.24 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-kontakt`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.55 }} />
          <stop offset="60%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-glans`}>
          <stop offset="0%" style={{ stopColor: 'var(--card)', stopOpacity: 0.8 }} />
          <stop offset="55%" style={{ stopColor: 'var(--card)', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: 'var(--card)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-kind`}>
          <stop offset="0%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0.85 }} />
          <stop offset="60%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0.45 }} />
          <stop offset="100%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="184" rx="76" ry="14" fill={`url(#${uid}-skugga)`} />
      <ellipse cx="100" cy="180" rx="52" ry="7" fill={`url(#${uid}-kontakt)`} />
      <path d={path} fill={`url(#${uid}-kropp)`} style={figure.outline ? { stroke: dark, strokeWidth: 4 } : undefined} />
      <path d={path} fill={`url(#${uid}-under)`} />
      <ellipse cx={shine.cx + 4} cy={shine.cy + 2} rx="34" ry="20" transform={`rotate(-34 ${shine.cx + 4} ${shine.cy + 2})`} fill={`url(#${uid}-glans)`} />
      <ellipse cx={shine.cx - 4} cy={shine.cy - 4} rx="10" ry="6" transform={`rotate(-34 ${shine.cx - 4} ${shine.cy - 4})`} className="fill-card" opacity="0.9" />
      <circle cx={shine.cx + 10} cy={shine.cy - 12} r="3" className="fill-card" opacity="0.75" />
    </>
  )
}

// Rosiga kinder på alla, under ögonen. Blygis rodnar mer, och likaså hero-figurerna med stängda eller nedtittande ögon,
// så att kinderna syns lika tydligt som på den gula.
function Cheeks({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const cyclops = figure.traits?.cyclops
  const [left, right] = cyclops ? [54, 146] : [48, 152]
  const y = cyclops ? 150 : 142
  const hero = figure.traits?.hero
  const strong = figure.id === 'blygis' || (hero !== undefined && hero !== 'hej')
  return (
    <g fill={`url(#${uid}-kind)`}>
      <ellipse cx={left} cy={y} rx={strong ? 21 : 18} ry={strong ? 13 : 11} />
      <ellipse cx={right} cy={y} rx={strong ? 21 : 18} ry={strong ? 13 : 11} />
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

// Spionen: trenchcoat med en tydlig uppfälld krage, och en hörsnäcka med sladd.
function CollarAndEarpiece() {
  const rock = { fill: 'var(--pryl-rock)', stroke: 'var(--pryl-rock-mork)' }
  return (
    <g>
      <path d="M31 136C34 164 58 178 100 178C142 178 166 164 169 136L134 156L100 178L66 156Z" style={rock} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 178L84 160M100 178L116 160" className="fill-none" style={{ stroke: 'var(--pryl-rock-mork)' }} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="171" r="3" style={{ fill: 'var(--pryl-rock-mork)' }} />
      {/* Kragen fälls upp på båda sidor, ända upp till kinderna. */}
      <path d="M28 140L14 94L46 116L74 156L62 162Z" style={rock} strokeWidth="3" strokeLinejoin="round" />
      <path d="M172 140L186 94L154 116L126 156L138 162Z" style={rock} strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 108L40 122M178 108L160 122" className="fill-none" style={{ stroke: 'var(--pryl-rock-mork)' }} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M170 106q8 7 0 12q-8 6 0 12q8 7 0 13" className="fill-none" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="3" strokeLinecap="round" />
      <circle cx="168" cy="99" r="7" style={svart} />
      <circle cx="166" cy="97" r="2" className="fill-card" opacity="0.7" />
    </g>
  )
}

// Sjusovarens sovmask i ett stycke, med slutna ögon tryckta på. I pannan när den är vaken, över ögonen när den sover
// (främre lagret).
function SleepMask({ y }: { y: number }) {
  return (
    <g>
      <path d={`M26 ${y + 8}Q100 ${y - 12} 174 ${y + 8}`} className="fill-none" style={{ stroke: 'var(--pryl-sovmask-mork)' }} strokeWidth="6" />
      <path
        d={`M44 ${y - 14}Q70 ${y - 24} 100 ${y - 11}Q130 ${y - 24} 156 ${y - 14}Q172 ${y} 158 ${y + 16}Q130 ${y + 26} 100 ${y + 13}Q70 ${y + 26} 42 ${y + 16}Q28 ${y} 44 ${y - 14}Z`}
        style={{ fill: 'var(--pryl-sovmask)', stroke: 'var(--pryl-sovmask-mork)' }}
        strokeWidth="3"
      />
      {[70, 130].map((x) => (
        <g key={x}>
          <path d={`M${x - 14} ${y}Q${x} ${y + 9} ${x + 14} ${y}`} className="fill-none stroke-foreground" strokeWidth="3" strokeLinecap="round" />
          <path d={`M${x - 10} ${y + 5}l-3 5M${x} ${y + 7}v5M${x + 10} ${y + 5}l3 5`} className="fill-none stroke-foreground" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))}
      <path d={`M54 ${y - 13}Q68 ${y - 19} 84 ${y - 16}`} className="fill-none stroke-card" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </g>
  )
}

// Kudd-märket på kinden.
function PillowMark({ figure }: { figure: BlobFigure }) {
  return (
    <path
      d="M138 140Q151 135 164 140M142 149Q152 145 162 149"
      className="fill-none"
      style={{ stroke: figure.palette.dark }}
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.8"
    />
  )
}

// Droppan: en rund gummimössa som sluter tätt om huvudet, med upphöjda bubblor och ett band längs kanten, och
// simglasögonen tydligt i pannan.
function SwimCap({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-mossa`} cx="36%" cy="24%" r="80%">
          <stop offset="0%" style={{ stopColor: 'var(--pryl-badmossa-ljus)' }} />
          <stop offset="55%" style={{ stopColor: 'var(--pryl-badmossa)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--pryl-badmossa-mork)' }} />
        </radialGradient>
      </defs>
      <path d="M28 98C28 66 58 34 86 24Q100 18 114 24C142 34 172 66 172 98Q100 76 28 98Z" fill={`url(#${uid}-mossa)`} />
      <path d="M30 95Q100 73 170 95" className="fill-none" style={{ stroke: 'var(--pryl-badmossa-mork)' }} strokeWidth="7" strokeLinecap="round" />
      {[
        [84, 36],
        [116, 36],
        [100, 50],
        [66, 54],
        [134, 54],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="6" style={{ fill: 'var(--pryl-badmossa-ljus)' }} />
          <circle cx={x - 2} cy={y - 2} r="2" className="fill-card" opacity="0.85" />
        </g>
      ))}
      <path d="M58 30Q72 22 86 22" className="fill-none stroke-card opacity-60" strokeWidth="4" strokeLinecap="round" />
      {/* Simglasögonen uppskjutna i pannan. */}
      <path d="M28 82Q100 58 172 82" className="fill-none" style={{ stroke: 'var(--pryl-simglas)' }} strokeWidth="6" />
      <path d="M90 68Q100 62 110 68" className="fill-none" style={{ stroke: 'var(--pryl-simglas)' }} strokeWidth="5" />
      {[72, 128].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="68" rx="19" ry="13" className="fill-sky" style={{ stroke: 'var(--pryl-simglas)' }} strokeWidth="5" />
          <path d={`M${x - 10} 64Q${x - 4} 59 ${x + 3} 60`} className="fill-none stroke-card" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

// Festis: solglasögonen uppskjutna på huvudet och en blomsterkrans.
function FestisGear() {
  const flowers = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const x = 40 * (1 - t) ** 2 + 2 * 100 * (1 - t) * t + 160 * t ** 2
    const y = 152 * (1 - t) ** 2 + 2 * 188 * (1 - t) * t + 152 * t ** 2
    return { x, y, color: ['fill-sun', 'fill-sky', 'fill-mint', 'fill-card'][i % 4] }
  })
  return (
    <g>
      <g transform="rotate(-8 100 50)">
        <path d="M58 50L42 56M142 50L158 56" className="fill-none" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="4" strokeLinecap="round" />
        <rect x="58" y="38" width="38" height="22" rx="10" style={svart} />
        <rect x="104" y="38" width="38" height="22" rx="10" style={svart} />
        <path d="M96 46H104" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="4" />
        <path d="M64 44L76 42M110 44L122 42" className="fill-none stroke-card opacity-60" strokeWidth="3" strokeLinecap="round" />
      </g>
      {flowers.map(({ x, y, color }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" className={color} />
          <circle cx={x} cy={y} r="3" style={{ fill: 'var(--figur-fest-mork)' }} />
        </g>
      ))}
    </g>
  )
}

// Kungens sneda krona och en stor guldkedja med en medaljong.
function KingGear() {
  return (
    <g>
      <g transform="rotate(-15 100 50) translate(-8 -2)">
        <path d="M64 62L60 26L82 44L100 18L118 44L140 26L136 62Z" style={{ fill: 'var(--crown)', stroke: 'var(--pryl-guld-mork)' }} strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="62" y="54" width="76" height="11" rx="5" style={{ fill: 'var(--crown)', stroke: 'var(--pryl-guld-mork)' }} strokeWidth="2.5" />
        <circle cx="100" cy="46" r="6" className="fill-destructive" />
        <path d="M70 34L74 52" className="fill-none stroke-card opacity-50" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M36 136Q100 210 164 136" className="fill-none" style={{ stroke: 'var(--pryl-guld-mork)' }} strokeWidth="12" strokeDasharray="12 5" strokeLinecap="round" />
      <path d="M36 136Q100 210 164 136" className="fill-none" style={{ stroke: 'var(--crown)' }} strokeWidth="8" strokeDasharray="12 5" strokeLinecap="round" />
      <circle cx="100" cy="171" r="16" style={{ fill: 'var(--crown)', stroke: 'var(--pryl-guld-mork)' }} strokeWidth="3" />
      <circle cx="100" cy="171" r="7" className="fill-destructive" />
      <circle cx="95" cy="165" r="3" className="fill-card" opacity="0.75" />
    </g>
  )
}

// Ögats höga hatt, lite på sned.
function TopHat() {
  return (
    <g transform="rotate(8 100 48) translate(0 -8)" style={svart}>
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
      <path d="M30 84Q100 36 170 84" className="fill-none" style={{ stroke: 'var(--pryl-neon)' }} strokeWidth="15" />
      <path d="M33 81Q100 34 167 81" className="fill-none stroke-card" strokeWidth="3" opacity="0.8" />
    </g>
  )
}

// Bråkis: mössa, och hornen som sticker ut genom mössan.
function BrakisGear({ figure }: { figure: BlobFigure }) {
  return (
    <g transform="translate(0 -4)">
      <path d="M52 72Q54 24 100 22Q146 24 148 72Z" style={{ fill: 'var(--pryl-mossa)' }} />
      <rect x="48" y="60" width="104" height="18" rx="9" style={{ fill: 'var(--pryl-mossa-ljus)' }} />
      <path d="M62 62v14M76 62v14M90 62v14M104 62v14M118 62v14M132 62v14" className="fill-none" style={{ stroke: 'var(--pryl-mossa)' }} strokeWidth="2.5" />
      <path d="M70 40Q50 32 52 6Q62 26 84 32Z" style={{ fill: figure.palette.base }} />
      <path d="M130 40Q150 32 148 6Q138 26 116 32Z" style={{ fill: figure.palette.base }} />
    </g>
  )
}

// Blygis luvtröja med huvan uppe (djupt rosa, så att figuren fortfarande ser rosa ut) och hörlurar ovanpå. Gradienten
// luva används också till ärmarna.
function Hoodie({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-luva`} cx="36%" cy="26%" r="82%">
          <stop offset="0%" style={{ stopColor: 'var(--pryl-luva-ljus)' }} />
          <stop offset="60%" style={{ stopColor: 'var(--pryl-luva)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--pryl-luva-kant)' }} />
        </radialGradient>
      </defs>
      <path
        fillRule="evenodd"
        fill={`url(#${uid}-luva)`}
        d="M100 28C150 30 182 74 182 120C182 164 152 186 100 186C48 186 18 164 18 120C18 74 50 30 100 28ZM34 118A66 58 0 1 0 166 118A66 58 0 1 0 34 118Z"
      />
      <ellipse cx="100" cy="118" rx="66" ry="58" className="fill-none stroke-foreground" strokeWidth="3" opacity="0.2" />
      <path d="M100 28Q92 42 100 60" className="fill-none" style={{ stroke: 'var(--pryl-luva-kant)' }} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 174L82 188M114 174L118 188" className="fill-none stroke-card" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 108Q22 22 100 20Q178 22 178 108" className="fill-none" style={{ stroke: 'var(--pryl-luren)' }} strokeWidth="9" />
      <rect x="6" y="92" width="26" height="40" rx="12" style={{ fill: 'var(--pryl-luren)' }} />
      <rect x="168" y="92" width="26" height="40" rx="12" style={{ fill: 'var(--pryl-luren)' }} />
      <rect x="12" y="100" width="12" height="24" rx="6" className="fill-sky" />
      <rect x="176" y="100" width="12" height="24" rx="6" className="fill-sky" />
    </g>
  )
}

// Smältis: solkräm på näsan och kinderna, och droppar som rinner i väntrummet.
function Sunscreen() {
  return (
    <g className="fill-card" opacity="0.95">
      <path d="M88 136Q100 126 112 136Q100 142 88 136Z" />
      <path d="M32 146Q44 140 56 144Q44 150 32 146Z" />
      <path d="M144 144Q156 140 168 146Q156 150 144 144Z" />
    </g>
  )
}

function Drips({ figure }: { figure: BlobFigure }) {
  return (
    <g style={{ fill: figure.palette.base }}>
      <ellipse cx="50" cy="140" rx="5" ry="7" className="motion-safe:animate-blob-drip" />
      <ellipse cx="152" cy="134" rx="4" ry="6" className="motion-safe:animate-blob-drip motion-safe:[animation-delay:2.2s]" />
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
const UNDER: Partial<Record<BlobFigure['id'], (extras: Extras) => ReactNode>> = {
  burret: ({ figure, lively }) => <SpikyHair figure={figure} lively={lively} />,
}
const OVER: Partial<Record<BlobFigure['id'], (extras: Extras) => ReactNode>> = {
  klumpen: ({ figure }) => <BackwardsCap figure={figure} />,
  spionen: () => <CollarAndEarpiece />,
  sjusovaren: ({ figure, asleep }) => (
    <>
      <PillowMark figure={figure} />
      {!asleep && <SleepMask y={58} />}
    </>
  ),
  droppan: ({ uid }) => <SwimCap uid={uid} />,
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

// Spionens solglasögon täcker de stora ögonen och ligger över minen, så att de kan glida undan.
function Sunglasses() {
  return (
    <g>
      <path d="M94 102H106" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="8" />
      <rect x="38" y="82" width="58" height="46" rx="18" style={svart} />
      <rect x="104" y="82" width="58" height="46" rx="18" style={svart} />
      <path d="M48 94L66 88M114 94L132 88" className="fill-none stroke-card opacity-50" strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}

// Plugghästens stora runda glasögon runt de stora ögonen. Glasen är genomskinliga, så att ögonen och minen syns.
function BigGlasses({ lively }: { lively: boolean }) {
  return (
    <g className={cn('fill-none', lively && 'motion-safe:animate-blob-glasses')} style={{ stroke: 'var(--figur-svart)' }} strokeWidth="6">
      <circle cx="70" cy="106" r="30" className="fill-card/20" />
      <circle cx="130" cy="106" r="30" className="fill-card/20" />
      <path d="M40 100L22 92M160 100L178 92" strokeLinecap="round" />
    </g>
  )
}

// Ögats monokel med kedja, runt det stora ögat.
function Monocle() {
  return (
    <g>
      <circle cx="100" cy="106" r="45" className="fill-card/15" style={{ stroke: 'var(--crown)' }} strokeWidth="6" />
      <path d="M68 82Q80 70 96 68" className="fill-none stroke-card opacity-70" strokeWidth="4" strokeLinecap="round" />
      <path d="M134 136Q156 154 150 180" className="fill-none" style={{ stroke: 'var(--crown)' }} strokeWidth="3" strokeDasharray="4 3" />
    </g>
  )
}

// Klumpens tuggummibubbla i mungipan. I väntrummet blåses den upp och spricker.
function GumBubble({ lively }: { lively: boolean }) {
  return (
    <g className={lively ? 'origin-[120px_146px] [transform-box:view-box] motion-safe:animate-blob-bubble' : undefined}>
      <circle cx="132" cy="152" r={lively ? 15 : 11} style={{ fill: 'var(--pryl-tuggummi)', stroke: 'var(--pryl-tuggummi-mork)' }} strokeWidth="2.5" />
      <circle cx={lively ? 126 : 128} cy={lively ? 146 : 148} r={lively ? 4 : 3} className="fill-card" opacity="0.85" />
    </g>
  )
}

// Bråkis cigarett i mungipan, och rökringar i väntrummet. Mungipan sitter olika i olika miner.
const MOUTH_CORNER: Partial<Record<Mood, [number, number]>> = { vantar: [114, 147], misstankt: [118, 150], sur: [112, 157] }
function Cigarette({ at, smoke }: { at: [number, number]; smoke: boolean }) {
  const [x, y] = at
  const tip: [number, number] = [x + 30, y - 10]
  return (
    <g>
      <path d={`M${x} ${y}L${tip[0]} ${tip[1]}`} className="fill-none stroke-card" strokeWidth="7" strokeLinecap="round" />
      <path d={`M${x} ${y}L${x + 8} ${y - 2.7}`} className="fill-none" style={{ stroke: 'var(--pryl-strut)' }} strokeWidth="7" strokeLinecap="round" />
      <circle cx={tip[0]} cy={tip[1]} r="4" className="fill-destructive" />
      <circle cx={tip[0] + 0.5} cy={tip[1] - 0.5} r="1.8" className="fill-sun" />
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

// Främre lagret för en figur som bild: det som fortfarande ritas i koden över ansiktet, i ansiktets koordinater.
// Spionens solglasögon, Plugghästens glasögon och Klumpens tuggummibubbla (bara när den väntar, och den blåses upp och
// spricker i väntrummet). Resten (Ögats monokel, Bråkis cigarett, Sjusovarens mask) finns i bilden.
export function PictureFront({ figure, mood, lively }: { figure: BlobFigure; mood: Mood; lively: boolean }) {
  if (figure.id === 'spionen') return <Sunglasses />
  if (figure.id === 'plugghasten') return <BigGlasses lively={lively} />
  if (figure.id === 'klumpen' && mood === 'vantar') return <GumBubble lively={lively} />
  return null
}

// Kontaktskuggan under en figur som bild, och de rosiga kinderna i ansiktets koordinater.
export function PictureShadow({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-kontakt`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.4 }} />
          <stop offset="60%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.16 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="186" rx="70" ry="9" fill={`url(#${uid}-kontakt)`} />
    </>
  )
}

export function PictureCheeks({ figure, uid }: { figure: BlobFigure; uid: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-kind`}>
          <stop offset="0%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0.85 }} />
          <stop offset="60%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0.45 }} />
          <stop offset="100%" style={{ stopColor: 'var(--figur-kind)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <Cheeks figure={figure} uid={uid} />
    </>
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
