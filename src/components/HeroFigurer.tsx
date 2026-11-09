import { useRef, type CSSProperties } from 'react'
import { Figur } from '@/components/figurer/Figur'
import { useGazeFollow } from '@/hooks/useGazeFollow'
import { HERO_FIGURES } from '@/lib/figurer'
import { cn } from '@/lib/utils'

// Figurerna på startsidan: fyra egna figurer som bara finns här (HERO_FIGURES i figurer.ts), inte spelarfigurerna.
// Hörlurarna, mobilen, partyhatten och flugan i den här ordningen.

// Var och en står lite olika högt och lutar åt sitt håll, så att de ser ut som ett gäng och inte som en rad. I em, så
// att det följer storleken.
const POSES = [
  { y: '0.05em', rotate: '-7deg' },
  { y: '-0.07em', rotate: '3deg' },
  { y: '0.02em', rotate: '-3deg' },
  { y: '-0.03em', rotate: '8deg' },
]

// Figurerna i startsidans hero. De andas, blinkar och guppar lite, var och en i sin egen takt, och med mus följer de
// muspekaren med blicken. Bara dekoration, så de göms för skärmläsare. Med "minska rörelse" står de still och tittar
// rakt fram. only = vilka av de fyra (index i HERO_FIGURES), t.ex. två på var sida om rubriken på bred skärm.
export function HeroFigurer({ className, only = [0, 1, 2, 3] }: { className?: string; only?: readonly number[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useGazeFollow(ref)
  return (
    // En figur är 1.2em hög. Rutorna är bredare än kropparna, så negativ space-x ger bara lite luft mellan figurerna.
    <div ref={ref} aria-hidden className={cn('flex items-end', className)}>
      {only.map((index) => (
        <HeroFigur key={HERO_FIGURES[index].id} index={index} />
      ))}
    </div>
  )
}

// En figur med sitt gupp. Guppet ligger på ett eget element runt figuren, eftersom figuren själv redan andas.
// Lutningen och höjden ligger i translate och rotate, så att de inte krockar med guppet (transform).
function HeroFigur({ index }: { index: number }) {
  const pose = POSES[index % POSES.length]
  return (
    <span
      data-gaze
      className="inline-flex origin-bottom motion-safe:animate-hero-bob"
      style={
        {
          translate: `0 ${pose.y}`,
          rotate: pose.rotate,
          animationDelay: `${-index * 1.3}s`,
          '--blink-delay': `${-index * 1.7}s`,
        } as CSSProperties
      }
    >
      <Figur figure={HERO_FIGURES[index]} animated gaze delay={index * 1.3} />
    </span>
  )
}
