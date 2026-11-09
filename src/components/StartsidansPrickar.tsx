import { useEffect, useRef, type RefObject } from 'react'

// Prickmönstret bakom startsidans hero, ritat på en canvas så att varje prick kan röra sig:
// - Med mus viker prickarna undan för muspekaren och glider tillbaka när den går vidare.
// - Två ringar av lite mörkare prickar sprider sig sakta från origin (knappen Välj spel) var tionde sekund, som ringar
//   på vattnet.
// - På mobil sprider sig en liten ring från fingret vid ett tryck.
// Rutnätet är detsamma som CSS-prickarna i .startsida-prickar (22 px, pricken mitt i rutan), som syns tills canvasen har
// ritat och står kvar som de är med "minska rörelse". Bara raderna som syns i hero ritas, och inget ritas när hero inte
// syns. Sektionerna under hero täcker canvasen.
const GRID = 22
const DOT = 1.25
// Prickarnas vanliga täckning (lite tydligare än förut).
const ALPHA = 0.24
// Muspekaren: hur långt bort prickarna påverkas (px) och hur långt de knuffas som mest.
const REACH = 250
const PUSH = 36
// Ringarna: hur ofta (s), hur länge de växer (s), hur stora de blir (px), hur breda och hur mycket mörkare de är.
const RING_PERIOD = 10
const RING_GROW = 8
const RING_MAX = 1000
const RING_GAP = 170
const RING_BAND = 26
const RING_ALPHA = 0.16
// Ringen vid ett tryck på mobil.
const TAP_MS = 900
const TAP_MAX = 220

const easeOut = (t: number) => 1 - (1 - t) ** 3

export function StartsidansPrickar({ origin }: { origin: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // CSS-prickarna göms när canvasen har börjat rita (data-canvas), så att det inte blir dubbla.
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const ctx = context
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#2b2d3a'
    const fill = ctx.fillStyle

    let width = 0
    let height = 0
    function resize() {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = Math.round(width * ratio)
      canvas!.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = fill
    }
    resize()

    // Muspekaren, mjukt följd. strength tonas in och ut.
    const target = { x: -9999, y: -9999, on: false }
    const pointer = { x: -9999, y: -9999, strength: 0 }
    const taps: { x: number; y: number; at: number }[] = []
    const start = performance.now()
    let frame = 0
    let visible = true

    function draw(now: number) {
      frame = 0
      ctx.clearRect(0, 0, width, height)
      pointer.strength += ((target.on ? 1 : 0) - pointer.strength) * 0.12
      pointer.x += (target.x - pointer.x) * 0.3
      pointer.y += (target.y - pointer.y) * 0.3
      // Bara raderna ovanför sektionen under hero (och vågen).
      const button = origin.current
      const box = button?.getBoundingClientRect()
      const heroBottom = button?.closest('section')?.getBoundingClientRect().bottom ?? height
      const bottom = Math.min(height, heroBottom + 90)
      const cx = box ? box.left + box.width / 2 : width / 2
      const cy = box ? box.top + box.height / 2 : height / 2
      // Ringarnas storlek och hur synliga de är just nu.
      const t = ((now - start) / 1000) % RING_PERIOD
      const grow = Math.min(1, t / RING_GROW)
      const ringR = easeOut(grow) * RING_MAX
      const ringFade = t < RING_GROW ? Math.min(1, t / 0.6) * (1 - grow) : 0
      const rings = [ringR, ringR - RING_GAP]
      // Trycken på mobil som fortfarande syns.
      while (taps.length > 0 && now - taps[0].at > TAP_MS) taps.shift()

      for (let y = GRID / 2; y < bottom + GRID; y += GRID) {
        for (let x = GRID / 2; x < width + GRID; x += GRID) {
          let px = x
          let py = y
          let alpha = ALPHA
          let size = DOT
          if (pointer.strength > 0.01) {
            const dx = x - pointer.x
            const dy = y - pointer.y
            const distance = Math.hypot(dx, dy)
            if (distance < REACH && distance > 0.1) {
              const near = 1 - distance / REACH
              const push = PUSH * near * near * pointer.strength
              px += (dx / distance) * push
              py += (dy / distance) * push
            }
          }
          if (ringFade > 0) {
            const fromCenter = Math.hypot(x - cx, y - cy)
            for (const r of rings) {
              const band = 1 - Math.abs(fromCenter - r) / RING_BAND
              if (band > 0 && r > 0) {
                alpha += RING_ALPHA * band * ringFade
                size += 0.5 * band * ringFade
              }
            }
          }
          for (const tap of taps) {
            const progress = (now - tap.at) / TAP_MS
            const band = 1 - Math.abs(Math.hypot(x - tap.x, y - tap.y) - easeOut(progress) * TAP_MAX) / 20
            if (band > 0) {
              alpha += 0.3 * band * (1 - progress)
              size += 0.7 * band * (1 - progress)
            }
          }
          ctx.globalAlpha = Math.min(1, alpha)
          ctx.beginPath()
          ctx.arc(px, py, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (visible) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const dots = dotsRef.current
    if (dots) dots.dataset.canvas = 'true'

    // Ingen ritning när hero inte syns.
    const hero = origin.current?.closest('section')
    const observer = hero
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting
          if (visible && !frame) frame = requestAnimationFrame(draw)
        })
      : null
    if (hero) observer!.observe(hero)

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (!target.on) {
        pointer.x = event.clientX
        pointer.y = event.clientY
      }
      target.x = event.clientX
      target.y = event.clientY
      target.on = true
    }
    const leave = () => {
      target.on = false
    }
    const press = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      taps.push({ x: event.clientX, y: event.clientY, at: performance.now() })
    }
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', press, { passive: true })
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      if (dots) delete dots.dataset.canvas
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', press)
      document.documentElement.removeEventListener('mouseleave', leave)
    }
  }, [origin])

  return (
    <>
      <div ref={dotsRef} aria-hidden className="startsida-prickar" />
      <canvas ref={canvasRef} aria-hidden className="startsida-prickar-canvas" />
    </>
  )
}
