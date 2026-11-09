import { useId, useLayoutEffect, useRef } from 'react'
import { PictureCheeks } from '@/components/figurer/Kroppar'
import { Face } from '@/components/figurer/Miner'
import { BLOBS } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Sjusovaren som vilar händerna på vågen ovanför sidfoten på startsidan och sover, som om den tittar upp bakom en mur.
// Bilden (public/figurer/sjusovaren-kant.webp, 300 × 174, scripts/figurbilder.py) har inget ansikte: det ritas i koden
// under sovmasken, mindre än på de vanliga blobbarna eftersom ytan är smalare. Då och då stiger ett litet z och tonas bort
// (motion-safe, stilla med "minska rörelse"). Ren dekoration: dold för skärmläsare och tar inga klick.
// Den ligger bakom vågen (behindWave i VagSektion) och mäter själv var vågens kant är under händerna, så att händerna
// vilar på kanten och den raka nederkanten döljs bakom vågen, oavsett skärmbredd.
const WIDTH = 300
const HEIGHT = 174
// Ansiktets mitt och storlek i bilden, mellan sovmasken och händerna.
const FACE = { x: 150, y: 98, scale: 0.6 }
// Händernas mitt i sidled (andel av bredden), och hur långt under vågens kant bildens raka nederkant hamnar (andel av
// höjden), så att händerna ser ut att vila på kanten.
const HANDS = [0.17, 0.83]
const SINK = 0.06

// Var vågens kant är (y på skärmen) rakt under x, genom att leta uppifrån efter första punkten i vågens fyllning. Räknar
// om till vågens egna koordinater via rutans storlek (vågen sträcks ut, preserveAspectRatio="none"), och spegelvänder
// själv om vågen är spegelvänd, så att det stämmer även när sidan visas förminskad.
function waveEdge(path: SVGPathElement, x: number): number | null {
  const svg = path.ownerSVGElement
  if (!svg) return null
  const box = svg.getBoundingClientRect()
  const view = svg.viewBox.baseVal
  if (!box.width || !box.height || !view.width) return null
  let px = ((x - box.left) / box.width) * view.width
  if (path.getAttribute('transform')) px = view.width - px
  const point = svg.createSVGPoint()
  for (let y = 0; y <= view.height; y += 0.5) {
    point.x = px
    point.y = y
    if (path.isPointInFill(point)) return box.top + (y / view.height) * box.height
  }
  return null
}

const sjusovaren = BLOBS.find((blob) => blob.id === 'sjusovaren')!

export function SovandeSjusovare({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    const figure = ref.current
    const section = figure?.parentElement
    const wave = section?.querySelector<SVGPathElement>(':scope > svg[data-vag] path')
    if (!figure || !section || !wave) return
    function place() {
      const box = figure!.getBoundingClientRect()
      const edges = HANDS.map((share) => waveEdge(wave!, box.left + box.width * share)).filter((y) => y !== null)
      if (edges.length === 0) return
      const edge = edges.reduce((sum, y) => sum + y, 0) / edges.length
      const top = section!.getBoundingClientRect().top
      figure!.style.bottom = `calc(100% + ${Math.round(top - edge - box.height * SINK)}px)`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(section)
    return () => observer.disconnect()
  }, [])
  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn('pointer-events-none block h-auto overflow-visible select-none', className)}
    >
      <image href="/figurer/sjusovaren-kant.webp" x="0" y="0" width={WIDTH} height={HEIGHT} />
      <g transform={`translate(${FACE.x} ${FACE.y}) scale(${FACE.scale}) translate(-100 -130)`} className="text-foreground">
        <PictureCheeks figure={sjusovaren} uid={uid} />
        <Face mood="vantar" figure={sjusovaren} animated={false} lively asleep />
      </g>
      <text x="208" y="44" className="fill-foreground font-heading text-[22px] font-bold opacity-0 motion-safe:animate-sjusovare-z">
        z
      </text>
    </svg>
  )
}
