import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DENT_DEPTH, dentedEdge, SQUISH_HEIGHT, SQUISH_PATH, WAVE_PATH, waveEdgeAt } from '@/lib/vag'

// En mjuk våg i överkanten av en sektion, i sektionens egen färg, så att sektionerna ser ut som rullande kullar.
// flip = vågen spegelvänd, så att varannan sektion rullar åt andra hållet. Bara en liten SVG, inga bilder.
// squish = vågens kant trycks ned där muspekaren står på den, och kryper sakta tillbaka upp när den går därifrån (VagSlag).
// Då är vågens ruta lite högre och går en bit ned i sektionen (--vag-djup, en fjärdedel av vågens höjd), så att gropen
// kan gå djupare än vågen själv. Sektionen visar färgen ovanför i den remsan (VagSektion), och vågen täcker den överallt
// utom i gropen.
export function Vag({ color, flip = false, squish = false }: { color: string; flip?: boolean; squish?: boolean }) {
  return (
    <svg
      aria-hidden
      data-vag
      viewBox={squish ? `0 0 1440 ${SQUISH_HEIGHT}` : '0 0 1440 90'}
      preserveAspectRatio="none"
      // En pixel ned i sektionen, så att ingen tunn springa syns mellan vågen och ytan under.
      className={cn(
        'pointer-events-none absolute inset-x-0 block w-full',
        squish
          ? 'bottom-[calc(100%-var(--vag-djup)-1px)] h-[calc(2.25rem+var(--vag-djup))] sm:h-[calc(3.5rem+var(--vag-djup))] lg:h-[calc(5rem+var(--vag-djup))]'
          : 'bottom-[calc(100%-1px)] h-9 sm:h-14 lg:h-20',
      )}
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

// Gropens bredd (standardavvikelsen i px): bred och rund på en dator, och högst en dryg femtedel av skärmens bredd, så
// att den inte blir en smal skåra på en telefon. Och hur nära kanten muspekaren ska stå (px).
const DENT_WIDTH_PX = 210
const DENT_WIDTH_SHARE = 0.22
const HIT_PX = 36
// Fjäderns drag och hur mycket av farten som behålls per steg (60 steg i sekunden). Ned: mjukt och utan att studsa.
// Upp: mycket långsamt och trögt. Ett tryck på en telefon är en kort smäll, så där är draget hårdare.
const SINK_PULL = 0.02
const SINK_KEEP = 0.75
const TAP_PULL = 0.05
const TAP_KEEP = 0.78
const RISE_PULL = 0.012
const RISE_KEEP = 0.8
const STEP_MS = 1000 / 60
// Avståndet mellan punkterna som kanten ritas genom (vågens enheter). Tätt, så att gropen blir en mjuk båge utan hack.
const DRAW_STEP = 4

// Vågens kant som går att slå på: står muspekaren på kanten trycks den ned i en bred, rund grop som följer pekaren, och
// när pekaren går därifrån kryper den sakta tillbaka upp, lite trögflytande. På en telefon ger ett tryck på kanten en
// kort smäll. Ritar bara när något rör sig, och står still med "minska rörelse".
function VagSlag({ color, flip }: { color: string; flip: boolean }) {
  const pathRef = useRef<SVGPathElement>(null)
  useEffect(() => {
    const path = pathRef.current
    const svg = path?.ownerSVGElement
    if (!path || !svg) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let depth = 0
    let speed = 0
    let target = 0
    let center = 720
    let aim = 720
    let sigma = 180
    let tapping = false
    let frame = 0
    let last = 0
    let owed = 0
    let tapTimer = 0
    const draw = () => {
      // Kanten som en mjuk kurva genom punkterna (bågar mellan punkternas mittpunkter), så att inga raka bitar syns.
      let prevX = 0
      let prevY = dentedEdge(0, flip, depth, center, sigma)
      let d = `M0 ${SQUISH_HEIGHT}L0 ${prevY.toFixed(2)}`
      for (let x = DRAW_STEP; x <= 1440; x += DRAW_STEP) {
        const y = dentedEdge(x, flip, depth, center, sigma)
        d += `Q${prevX} ${prevY.toFixed(2)} ${(prevX + x) / 2} ${((prevY + y) / 2).toFixed(2)}`
        prevX = x
        prevY = y
      }
      // Punkterna är redan spegelvända (waveEdgeAt), så vågens egen spegling tas bort.
      path.removeAttribute('transform')
      path.setAttribute('d', `${d}L1440 ${prevY.toFixed(2)}L1440 ${SQUISH_HEIGHT}Z`)
    }
    // Trögflytande: gropen sjunker in mjukt och kryper sakta tillbaka upp när pekaren går därifrån, utan att studsa.
    // Gropen följer också pekaren i sidled med lite eftersläpning. Stegen är lika långa oavsett skärmens takt.
    const step = () => {
      const sinking = target > depth
      const pull = sinking ? (tapping ? TAP_PULL : SINK_PULL) : RISE_PULL
      const keep = sinking ? (tapping ? TAP_KEEP : SINK_KEEP) : RISE_KEEP
      speed = (speed + (target - depth) * pull) * keep
      depth += speed
      center += (aim - center) * 0.08
    }
    const tick = (now: number) => {
      // Tiden sedan förra bildrutan räknas upp i hela steg, så att rörelsen går lika fort på en skärm med 60 och 144
      // bilder i sekunden. Högst fyra steg i taget, om fliken stått still en stund.
      owed = Math.min(4 * STEP_MS, owed + (last ? now - last : STEP_MS))
      last = now
      while (owed >= STEP_MS) {
        step()
        owed -= STEP_MS
      }
      draw()
      if (Math.abs(speed) > 0.01 || Math.abs(target - depth) > 0.05 || Math.abs(aim - center) > 0.5) frame = requestAnimationFrame(tick)
      else {
        depth = target
        draw()
        frame = 0
        last = 0
        owed = 0
      }
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    // Är punkten på kanten? Ger x i vågens enheter, annars null. Mäter också gropens bredd för skärmens bredd.
    const onEdge = (clientX: number, clientY: number): number | null => {
      const box = svg.getBoundingClientRect()
      if (clientX < box.left || clientX > box.right || !box.width) return null
      const x = ((clientX - box.left) / box.width) * 1440
      const edgeY = box.top + (waveEdgeAt(x, flip) / SQUISH_HEIGHT) * box.height
      if (Math.abs(clientY - edgeY) > HIT_PX) return null
      sigma = (Math.min(DENT_WIDTH_PX, box.width * DENT_WIDTH_SHARE) / box.width) * 1440
      return x
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const x = onEdge(event.clientX, event.clientY)
      if (x !== null) {
        // En ny grop börjar där pekaren är. En grop som redan finns glider efter.
        if (depth < 0.5) center = x
        aim = x
        tapping = false
      }
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
      aim = x
      tapping = true
      target = DENT_DEPTH
      start()
      clearTimeout(tapTimer)
      tapTimer = window.setTimeout(() => {
        target = 0
        start()
      }, 260)
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
  return <path ref={pathRef} d={SQUISH_PATH} transform={flip ? 'matrix(-1 0 0 1 1440 0)' : undefined} style={{ fill: color }} />
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
  above = 'transparent',
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
  // Med squish: färgen på sektionen ovanför, som syns i gropen när den går ned i den här sektionen. Utan värde syns det
  // som ligger bakom sidan (sanden med prickarna under hero).
  above?: string
  children: ReactNode
} & Omit<React.ComponentProps<'section'>, 'color' | 'className' | 'children'>) {
  return (
    <section
      {...props}
      className={cn(
        'relative mx-[calc(50%-50vw)] pt-8 pb-14 sm:pt-10 sm:pb-20 lg:pb-24',
        // Remsan överst som gropen kan gå ned i: en fjärdedel av vågens höjd (SQUISH_EXTRA), mindre än luften ovanför
        // rubriken, så att gropen aldrig når text eller knappar.
        squish && '[--vag-djup:0.5625rem] sm:[--vag-djup:0.875rem] lg:[--vag-djup:1.25rem]',
        className,
      )}
      style={
        (squish
          ? { background: `linear-gradient(to bottom, ${above} var(--vag-djup), ${color} var(--vag-djup))` }
          : { backgroundColor: color }) as CSSProperties
      }
    >
      {behindWave}
      <Vag color={color} flip={flip} squish={squish} />
      <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', innerClassName)}>{children}</div>
    </section>
  )
}
