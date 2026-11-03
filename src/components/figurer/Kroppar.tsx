import type { BlobFigure, BlobId } from '@/lib/figurer'

// Samma mjuka kropp för alla blobbar. Koordinaterna är 200 × 200, och minen (Miner.tsx) ritas ovanpå i samma koordinater.
const BODY_PATH = 'M100 48C140 48 168 78 170 118C172 156 146 178 100 178C54 178 28 156 30 118C32 78 60 48 100 48Z'

// Radiella gradienter i stället för filter, så att tio figurer inte blir tunga på en mobil.
export function BlobShape({ figure, uid }: { figure: BlobFigure; uid: string }) {
  const { light, base, dark } = figure.palette
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
      <path d={BODY_PATH} fill={`url(#${uid}-kropp)`} />
      <ellipse cx="68" cy="82" rx="24" ry="14" transform="rotate(-32 68 82)" fill={`url(#${uid}-glans)`} />
    </>
  )
}

// Hårtussen gör Klumpen lite korkad. Den ligger bakom kroppen, så att den växer ur huvudet.
function Tuft({ figure }: { figure: BlobFigure }) {
  return (
    <path
      d="M88 56Q78 28 96 22Q90 38 102 48Q104 24 124 28Q108 38 114 56Z"
      style={{ fill: figure.palette.dark }}
    />
  )
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

// Prylar och drag som hör till kroppen: Under ritas före kroppen och Over ovanpå den, men båda under minen.
const UNDER: Partial<Record<BlobId, (figure: BlobFigure) => React.ReactNode>> = {
  klumpen: (figure) => <Tuft figure={figure} />,
}
const OVER: Partial<Record<BlobId, (figure: BlobFigure) => React.ReactNode>> = {
  spionen: () => <SpyHat />,
  sjusovaren: (figure) => <Nightcap figure={figure} />,
}

// Bakre lagret: skugga, kropp och prylar som ligger under minen.
export function DrawnBack({ figure, uid }: { figure: BlobFigure; uid: string }) {
  return (
    <>
      {UNDER[figure.id]?.(figure)}
      <BlobShape figure={figure} uid={uid} />
      {OVER[figure.id]?.(figure)}
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

// Främre lagret: prylar över minen. De flesta figurer har inget.
export function DrawnFront({ figure }: { figure: BlobFigure }) {
  return figure.id === 'spionen' ? <Sunglasses /> : null
}
