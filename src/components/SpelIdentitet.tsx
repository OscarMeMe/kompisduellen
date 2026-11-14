import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Spelets egen identitet överst i rutan "Så spelar man" (GameIntroDialog) och på spelsidan (GameInfoPage), för spel som
// har ett eget paket: Exploderande Tanter (loggan och en liten solfjäder av kort på krämvitt med väntrummets mönster
// svagt bakom, vinrött) och Imposterjakten (loggan i lampans sken på det mörka mönstret, lampgult och krämvitt). De
// andra spelen har ingen identitet här och visar sin emoji på sin pastellfärg tills de får egna paket.
export type GameIdentity = {
  // Bandet överst. Höjden bestäms av den som visar det.
  band: (className: string) => ReactNode
  // Ramen och bottenfärgen på rutan eller kortet.
  frame: string
  heading: string
  // Skapa lobby och de andra huvudknapparna (sätt också data-egen-farg utanför en dialog).
  button: string
  // Siffrorna i stegen och etiketterna (antal spelare, tid, känsla).
  step: string
  chip: string
}

const TANT_BAND: CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in oklch, var(--tant-kram-2) 82%, transparent), color-mix(in oklch, var(--tant-kram-2) 82%, transparent)), url(/images/tantpanik/vantrum-monster.webp)',
  backgroundSize: 'auto, 260px 260px',
}
// Samma tre kort som på spelkortet: två baksidor och den exploderande tanten överst.
const TANT_FAN = [
  { src: '/images/tantpanik/baksida-360.webp', rotate: -16, x: '0%' },
  { src: '/images/tantpanik/baksida-360.webp', rotate: -3, x: '24%' },
  { src: '/images/tantpanik/exploderande-tant-360.webp', rotate: 12, x: '48%' },
]

const NATT_BAND: CSSProperties = {
  backgroundColor: 'var(--natt)',
  backgroundImage:
    'radial-gradient(ellipse 60% 85% at 50% 40%, color-mix(in oklch, var(--natt-lampa) 34%, transparent), transparent 75%), url(/images/imposterjakten/monster-mork.webp)',
  backgroundSize: 'auto, 200px 200px',
}

const IDENTITIES: Record<string, GameIdentity> = {
  tantpanik: {
    band: (className) => (
      // Loggan och korten är dekoration: spelets namn står i rubriken under.
      <div className={cn('flex items-center justify-center gap-[3%] border-b border-tant-vinrod/30 pr-[5%]', className)} style={TANT_BAND}>
        <img src="/images/tantpanik/logga-800.webp" alt="" width={800} height={468} className="h-[76%] w-auto" />
        <div aria-hidden className="relative aspect-[1.25] h-[54%] shrink-0 max-[340px]:hidden">
          {TANT_FAN.map((card, i) => (
            <img
              key={i}
              src={card.src}
              alt=""
              width={360}
              height={495}
              className="absolute bottom-0 h-full w-auto rounded-[5px] drop-shadow-[0_3px_5px_rgb(0_0_0/0.25)]"
              style={{ left: card.x, rotate: `${card.rotate}deg`, transformOrigin: '50% 120%' }}
            />
          ))}
        </div>
      </div>
    ),
    frame: 'border-2 border-tant-vinrod bg-tant-kram-2',
    heading: 'text-tant-vin',
    button: 'bg-tant-vinrod text-tant-kram-2 shadow-soft-sm hover:bg-[var(--tant-vinrod-mork)] hover:text-tant-kram-2',
    step: 'bg-tant-vinrod text-tant-kram-2',
    chip: 'bg-tant-vinrod text-tant-kram-2',
  },
  imposterjakten: {
    band: (className) => (
      <div className={cn('flex items-center justify-center border-b-2 border-[var(--natt)]', className)} style={NATT_BAND}>
        <img
          src="/images/imposterjakten/logga-800.webp"
          alt=""
          width={800}
          height={245}
          className="h-auto max-h-[70%] w-[min(86%,26rem)] object-contain drop-shadow-[0_4px_10px_rgb(0_0_0/0.55)]"
        />
      </div>
    ),
    frame: 'border-2 border-[var(--natt)] bg-[var(--natt-kram)] text-[var(--natt)]',
    heading: 'text-[var(--natt)]',
    button:
      'border-2 border-[var(--natt)] bg-[var(--natt-lampa)] text-[var(--natt)] shadow-[0_3px_0_var(--natt)] hover:bg-[#e2ae3a] hover:text-[var(--natt)]',
    step: 'bg-[var(--natt-lampa)] text-[var(--natt)] ring-2 ring-[var(--natt)]',
    chip: 'bg-[var(--natt)] text-[var(--natt-kram)]',
  },
}

export function gameIdentity(gameId: string): GameIdentity | null {
  return IDENTITIES[gameId] ?? null
}
