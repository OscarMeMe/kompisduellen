import type { ReactNode } from 'react'
import type { BlobFigure, BlobId, BlobShape } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Kropparna i koordinaterna 200 × 200. Minen (Miner.tsx) ritas ovanpå, och ögonen sitter alltid kring y = 108.
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
  blob: { cx: 68, cy: 82 },
  droppe: { cx: 76, cy: 88 },
  smalt: { cx: 68, cy: 82 },
}

// Radiella gradienter i stället för filter, så att tio figurer inte blir tunga på en mobil.
export function BlobShape({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const { light, base, dark } = figure.palette
  const shape = figure.shape ?? 'blob'
  const shine = SHINE[shape]
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-kropp`} cx="42%" cy="34%" r="72%">
          <stop offset="0%" style={{ stopColor: light }} />
          <stop offset="52%" style={{ stopColor: base }} />
          <stop offset="100%" style={{ stopColor: dark }} />
        </radialGradient>
        <radialGradient id={`${uid}-skugga`}>
          <stop offset="0%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: 'var(--foreground)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${uid}-glans`}>
          <stop offset="0%" style={{ stopColor: 'var(--card)', stopOpacity: 0.85 }} />
          <stop offset="100%" style={{ stopColor: 'var(--card)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="182" rx="68" ry="12" fill={`url(#${uid}-skugga)`} />
      <path
        d={BODY_PATHS[shape]}
        fill={`url(#${uid}-kropp)`}
        style={figure.outline ? { stroke: dark, strokeWidth: 4 } : undefined}
      />
      <ellipse cx={shine.cx} cy={shine.cy} rx="24" ry="14" transform={`rotate(-32 ${shine.cx} ${shine.cy})`} fill={`url(#${uid}-glans)`} />
    </>
  )
}

// Hårtussen gör Klumpen lite korkad. Den har kroppens egen färg och ligger bakom kroppen, så att den växer ur huvudet
// och inte liknar tomatens stjälk.
function Tuft({ figure }: { figure: BlobFigure }) {
  return <path d="M88 56Q78 28 96 22Q90 38 102 48Q104 24 124 28Q108 38 114 56Z" style={{ fill: figure.palette.base }} />
}

// Spionens svarta hatt.
function SpyHat() {
  return (
    <g style={{ fill: 'var(--figur-svart)' }}>
      <path d="M62 58L67 16Q100 6 133 16L138 58Z" />
      <rect x="62" y="44" width="76" height="11" style={{ fill: 'var(--figur-spion-mork)' }} />
      <ellipse cx="100" cy="60" rx="64" ry="11" />
      <path d="M74 20Q88 14 102 14" className="fill-none stroke-card opacity-25" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

// Sjusovarens nattmössa, med toppen som hänger ner på ena sidan.
function Nightcap({ figure }: { figure: BlobFigure }) {
  return (
    <g transform="translate(0 -10)">
      <path
        d="M44 84C46 34 104 2 150 24C176 36 188 66 180 92C170 70 154 58 140 60C150 66 156 76 158 84Q100 62 44 84Z"
        style={{ fill: figure.palette.dark }}
      />
      <path d="M70 52Q96 22 138 26" className="fill-none stroke-card opacity-25" strokeWidth="6" strokeLinecap="round" />
      <path d="M44 84Q100 62 158 84" className="fill-none stroke-card" strokeWidth="13" strokeLinecap="round" />
      <circle cx="180" cy="98" r="13" className="fill-card" />
    </g>
  )
}

// Festis partyhatt, lite på sned, med ränder och en tofs.
function PartyHat() {
  return (
    <g transform="rotate(12 100 56)">
      <path d="M74 62L104 0L130 62Z" className="fill-sun" />
      <path d="M86 38L120 38M80 50L126 50M94 22L112 22" className="fill-none stroke-sky" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="102" cy="62" rx="30" ry="6" style={{ fill: 'var(--figur-fest-mork)' }} />
      <circle cx="104" cy="2" r="9" className="fill-card" />
    </g>
  )
}

// Kungens krona i guld, med en ädelsten i mitten.
function Crown() {
  return (
    <g>
      <path d="M64 62L60 26L82 44L100 18L118 44L140 26L136 62Z" style={{ fill: 'var(--crown)' }} />
      <rect x="64" y="54" width="72" height="10" rx="4" style={{ fill: 'var(--crown)' }} />
      <circle cx="100" cy="46" r="6" className="fill-destructive" />
      <path d="M70 34L74 52" className="fill-none stroke-card opacity-40" strokeWidth="4" strokeLinecap="round" />
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

// Bråkis små horn, bakom kroppen så att bara spetsarna sticker upp. Mörkare än kroppen, så att de syns mot ljus bakgrund.
function Horns({ figure }: { figure: BlobFigure }) {
  return (
    <g style={{ fill: figure.palette.dark }}>
      <path d="M58 76Q48 44 66 30Q64 52 82 62Z" />
      <path d="M142 76Q152 44 134 30Q136 52 118 62Z" />
    </g>
  )
}

// Blygis rodnar alltid lite.
function Blush() {
  return (
    <g className="fill-destructive opacity-30">
      <ellipse cx="56" cy="130" rx="14" ry="8" />
      <ellipse cx="144" cy="130" rx="14" ry="8" />
    </g>
  )
}

// Smältis droppar rinner sakta nerför kroppen i väntrummet.
function Drips({ figure }: { figure: BlobFigure }) {
  return (
    <g style={{ fill: figure.palette.base }}>
      <ellipse cx="58" cy="132" rx="5" ry="7" className="motion-safe:animate-blob-drip" />
      <ellipse cx="146" cy="128" rx="4" ry="6" className="motion-safe:animate-blob-drip motion-safe:[animation-delay:2.2s]" />
    </g>
  )
}

// Prylar och drag som hör till kroppen: Under ritas före kroppen och Over ovanpå den, men båda under minen.
// lively = figuren är i väntrummet och har sin egen rörelse.
const UNDER: Partial<Record<BlobId, (figure: BlobFigure, lively: boolean) => ReactNode>> = {
  klumpen: (figure) => <Tuft figure={figure} />,
  burret: (figure, lively) => <SpikyHair figure={figure} lively={lively} />,
  brakis: (figure) => <Horns figure={figure} />,
}
const OVER: Partial<Record<BlobId, (figure: BlobFigure, lively: boolean) => ReactNode>> = {
  smaltis: (figure, lively) => (lively ? <Drips figure={figure} /> : null),
  spionen: () => <SpyHat />,
  sjusovaren: (figure) => <Nightcap figure={figure} />,
  festis: () => <PartyHat />,
  kungen: () => <Crown />,
  blygis: () => <Blush />,
}

// Bakre lagret: skugga, kropp och prylar som ligger under minen.
export function DrawnBack({ figure, uid, lively = false }: { figure: BlobFigure; uid: string; lively?: boolean }) {
  return (
    <>
      {UNDER[figure.id]?.(figure, lively)}
      <BlobShape figure={figure} uid={uid} />
      {OVER[figure.id]?.(figure, lively)}
    </>
  )
}

// Solglasögonen ligger över minen, så att de kan glida undan.
function Sunglasses() {
  return (
    <g>
      <path d="M92 106H108" style={{ stroke: 'var(--figur-svart)' }} strokeWidth="7" />
      <rect x="54" y="92" width="42" height="32" rx="12" style={{ fill: 'var(--figur-svart)' }} />
      <rect x="104" y="92" width="42" height="32" rx="12" style={{ fill: 'var(--figur-svart)' }} />
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
      <path d="M100 104Q100 98 100 104" strokeLinecap="round" />
      <path d="M96 104Q100 98 104 104" strokeLinecap="round" />
      <path d="M56 104L36 96M144 104L164 96" strokeLinecap="round" />
    </g>
  )
}

// Främre lagret: prylar över minen. De flesta figurer har inget.
export function DrawnFront({ figure, lively = false }: { figure: BlobFigure; lively?: boolean }) {
  if (figure.id === 'spionen') return <Sunglasses />
  if (figure.id === 'plugghasten') return <BigGlasses lively={lively} />
  return null
}
