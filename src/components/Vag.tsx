import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// En mjuk våg i överkanten av en sektion, i sektionens egen färg, så att sektionerna ser ut som rullande kullar.
// flip = vågen spegelvänd, så att varannan sektion rullar åt andra hållet. Bara en liten SVG, inga bilder.
export function Vag({ color, flip = false }: { color: string; flip?: boolean }) {
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
      <path
        d="M0 90V54C160 18 340 4 560 30S930 86 1140 64S1360 20 1440 28V90Z"
        transform={flip ? 'matrix(-1 0 0 1 1440 0)' : undefined}
        style={{ fill: color }}
      />
    </svg>
  )
}

// En sektion på startsidan som går kant i kant, med en egen bakgrundston och en våg överst. Innehållet ligger i samma
// bredd som resten av sidan.
export function VagSektion({
  color,
  flip,
  className,
  innerClassName,
  behindWave,
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
  children: ReactNode
} & Omit<React.ComponentProps<'section'>, 'color' | 'className' | 'children'>) {
  return (
    <section
      {...props}
      className={cn('relative mx-[calc(50%-50vw)] pt-8 pb-14 sm:pt-10 sm:pb-20 lg:pb-24', className)}
      style={{ backgroundColor: color } as CSSProperties}
    >
      {behindWave}
      <Vag color={color} flip={flip} />
      <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', innerClassName)}>{children}</div>
    </section>
  )
}
