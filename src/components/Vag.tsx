import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// En mjuk våg i överkanten av en sektion, i sektionens egen färg, så att sektionerna ser ut som rullande kullar.
// flip = vågen spegelvänd, så att varannan sektion rullar åt andra hållet. Bara en liten SVG, inga bilder.
// squish = vågens kant trycks ned där muspekaren står på den, och studsar tillbaka när den går därifrån (VagSlag).
export function Vag({ color, flip = false, squish = false }: { color: string; flip?: boolean; squish?: boolean }) {
  return (
    <svg
      aria-hidden
      data-vag
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      // En pixel ned i sektionen, så att ingen tunn springa syns mellan vågen och ytan under.
      className="pointer-events-none absolute inset-x-0 bottom-[calc(100%-1px)] block h-9 w-full sm:h-14 lg:h-20"
    >
      {/* Spegelvänd inne i SVG:n (inte med CSS), så att vågens form går att mäta (SovandeSjusovare). */}
      {squish ? (
        <VagSlag color={color} flip={flip} />
      ) : (
        <path d={WAVE_PATH} transform={flip ? 'matrix(-1 0 0 1 1440 0)' : undefined} style={{ fill: color }} />
      )}
    </svg>
  )
}

const WAVE_PATH = 'M0 90V54C160 18 340 4 560 30S930 86 1140 64S1360 20 1440 28V90Z'
// Vågens kant som tre kubiska bågar (samma som WAVE_PATH, med S-punkterna utskrivna), för att räkna ut kanten själv.
const WAVE_CURVES: [number, number][][] = [
  [[0, 54], [160, 18], [340, 4], [560, 30]],
  [[560, 30], [780, 56], [930, 86], [1140, 64]],
  [[1140, 64], [1350, 42], [1360, 20], [1440, 28]],
]
// Kanten i punkter var tionde enhet (x 0–1440), räknad en gång.
const STEP = 10
const WAVE_EDGE: number[] = (() => {
  const samples: [number, number][] = []
  for (const [a, b, c, d] of WAVE_CURVES) {
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const u = 1 - t
      const point = (k: 0 | 1) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]
      samples.push([point(0), point(1)])
    }
  }
  const edge: number[] = []
  for (let x = 0, j = 0; x <= 1440; x += STEP) {
    while (j < samples.length - 2 && samples[j + 1][0] < x) j++
    const [x0, y0] = samples[j]
    const [x1, y1] = samples[j + 1]
    edge.push(x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
  }
  return edge
})()

// Hur djupt kanten trycks ned (vågens enheter, höjden är 90), hur bred gropen är och hur nära kanten muspekaren ska stå (px).
const DENT_DEPTH = 22
const DENT_WIDTH = 110
const HIT_PX = 36

// Vågens kant som går att slå på: står muspekaren på kanten trycks den ned i en mjuk grop som följer pekaren, och när
// pekaren går därifrån studsar den tillbaka som en fjäder. På en telefon ger ett tryck på kanten en kort smäll. Ritar
// bara när något rör sig, och står still med "minska rörelse".
function VagSlag({ color, flip }: { color: string; flip: boolean }) {
  const pathRef = useRef<SVGPathElement>(null)
  useEffect(() => {
    const path = pathRef.current
    const svg = path?.ownerSVGElement
    if (!path || !svg) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const edgeAt = (x: number) => {
      const i = Math.max(0, Math.min(WAVE_EDGE.length - 1, Math.round((flip ? 1440 - x : x) / STEP)))
      return WAVE_EDGE[i]
    }
    let depth = 0
    let speed = 0
    let target = 0
    let center = 720
    let frame = 0
    let tapTimer = 0
    const draw = () => {
      let d = 'M0 90'
      for (let x = 0; x <= 1440; x += STEP) {
        const dent = depth * Math.exp(-((x - center) ** 2) / (2 * DENT_WIDTH ** 2))
        d += `L${x} ${(edgeAt(x) + dent).toFixed(1)}`
      }
      // Punkterna är redan spegelvända (edgeAt), så vågens egen spegling tas bort.
      path.removeAttribute('transform')
      path.setAttribute('d', `${d}L1440 90Z`)
    }
    // En fjäder: gropen sjunker in och studsar lite förbi när den släpps.
    const tick = () => {
      speed = (speed + (target - depth) * 0.16) * 0.78
      depth += speed
      draw()
      if (Math.abs(speed) > 0.02 || Math.abs(target - depth) > 0.05) frame = requestAnimationFrame(tick)
      else {
        depth = target
        draw()
        frame = 0
      }
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    // Är punkten på kanten? Ger x i vågens enheter, annars null.
    const onEdge = (clientX: number, clientY: number): number | null => {
      const box = svg.getBoundingClientRect()
      if (clientX < box.left || clientX > box.right || !box.width) return null
      const x = ((clientX - box.left) / box.width) * 1440
      const edgeY = box.top + (edgeAt(x) / 90) * box.height
      return Math.abs(clientY - edgeY) <= HIT_PX ? x : null
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const x = onEdge(event.clientX, event.clientY)
      if (x !== null) center = x
      const next = x === null ? 0 : DENT_DEPTH
      if (next !== target || x !== null) {
        target = next
        start()
      }
    }
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      const x = onEdge(event.clientX, event.clientY)
      if (x === null) return
      center = x
      target = DENT_DEPTH
      start()
      clearTimeout(tapTimer)
      tapTimer = window.setTimeout(() => {
        target = 0
        start()
      }, 160)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      cancelAnimationFrame(frame)
      clearTimeout(tapTimer)
    }
  }, [flip])
  return <path ref={pathRef} d={WAVE_PATH} transform={flip ? 'matrix(-1 0 0 1 1440 0)' : undefined} style={{ fill: color }} />
}

// En sektion på startsidan som går kant i kant, med en egen bakgrundston och en våg överst. Innehållet ligger i samma
// bredd som resten av sidan.
export function VagSektion({
  color,
  flip,
  className,
  innerClassName,
  behindWave,
  squish,
  children,
  ...props
}: {
  color: string
  flip?: boolean
  className?: string
  innerClassName?: string
  // Något som ligger bakom vågen och tittar upp över den (t.ex. Sjusovaren ovanför sidfoten). Vågen ritas efter, så att
  // det som sticker ned under vågens kant döljs.
  behindWave?: ReactNode
  // Vågens kant går att slå på med muspekaren (VagSlag).
  squish?: boolean
  children: ReactNode
} & Omit<React.ComponentProps<'section'>, 'color' | 'className' | 'children'>) {
  return (
    <section
      {...props}
      className={cn('relative mx-[calc(50%-50vw)] pt-8 pb-14 sm:pt-10 sm:pb-20 lg:pb-24', className)}
      style={{ backgroundColor: color } as CSSProperties}
    >
      {behindWave}
      <Vag color={color} flip={flip} squish={squish} />
      <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', innerClassName)}>{children}</div>
    </section>
  )
}
