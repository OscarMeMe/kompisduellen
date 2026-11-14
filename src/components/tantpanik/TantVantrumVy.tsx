import { useEffect, useRef, useState } from 'react'
import { Bot, Share2 } from 'lucide-react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { VannSenast } from '@/components/lobby/VannSenast'
import { TantKort } from '@/components/tantpanik/TantKort'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useReactions } from '@/hooks/useReactions'
import { inviteLink, shareInvite, shareMessage } from '@/lib/inbjudan'
import { loadSoundOn, playPop } from '@/lib/ljud'
import type { CardType } from '@/lib/tantpanik-kort'
import { chairCount, chairPlaces, TANT_LINE_MS, TANT_LOBBY_LINES } from '@/lib/tantvantrum'
import { cn } from '@/lib/utils'

// Exploderande Tanters väntrum: loggan och en rolig rad som byts, kafferepsbordet med spelarna, raden när man är för få
// och en solfjäder med några av korten. Allt i vinrött och krämvitt som på kortbaksidan. Bara för Exploderande Tanter.

const LOGO = '/images/tantpanik/logga.webp'
const LOGO_SMALL = '/images/tantpanik/logga-800.webp'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}

// Loggan stort och centrerad, med en rolig rad under som byts var sjätte sekund.
export function TantRubrik() {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setLine((n) => (n + 1) % TANT_LOBBY_LINES.length), TANT_LINE_MS)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <img
        src={LOGO}
        srcSet={`${LOGO_SMALL} 800w, ${LOGO} 1393w`}
        sizes="(max-width: 640px) 90vw, 480px"
        width={1393}
        height={815}
        alt="Exploderande Tanter"
        className="h-auto w-full max-w-[30rem] drop-shadow-md"
      />
      <p key={line} aria-live="polite" className="min-h-6 font-heading text-base font-bold text-tant-vin motion-safe:animate-fade sm:text-lg">
        {TANT_LOBBY_LINES[line]}
      </p>
    </div>
  )
}

// När man är för få: en hjälpsam rad med Dela direkt där. Botar läggs till i inställningsrutan (TantInstallningar).
export function TantVanta({ text, code, gameName }: { text: string; code: string; gameName: string }) {
  const [message, setMessage] = useState<string | null>(null)
  async function share() {
    const url = inviteLink(window.location.origin, code)
    const nativeShare = typeof navigator.share === 'function' ? (data: ShareData) => navigator.share(data) : undefined
    const result = await shareInvite(
      { title: 'Kompisduellen', text: `Häng med och spela ${gameName}! Koden är ${code}.`, url },
      { share: nativeShare, copy: (value) => navigator.clipboard.writeText(value) },
    )
    setMessage(shareMessage(result))
  }
  return (
    <div className="space-y-2 rounded-lg bg-tant-vin px-3 py-3 text-center text-tant-kram">
      <p role="status" className="font-heading text-lg leading-snug font-bold">
        {text}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" className="h-11 bg-tant-kram text-tant-vin hover:bg-tant-kram/90" onClick={share}>
          <Share2 aria-hidden />
          Dela
        </Button>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}

export type KafferepGuest = { id: string; name: string; avatar: string; host: boolean; bot: boolean; dress?: boolean }

// Kafferepsbordet sett ovanifrån: en stol och en kaffekopp per plats runt en rund duk. Den som går med hoppar in med
// ett litet ljud. Lediga stolar bjuder in. Botar har sin robot.
export function TantKafferep({ guests: all, meId, maxPlayers }: { guests: KafferepGuest[]; meId: string; maxPlayers: number }) {
  // Jag sitter alltid längst ned, de andra medurs.
  const guests = [...all.filter((guest) => guest.id === meId), ...all.filter((guest) => guest.id !== meId)]
  const count = chairCount(guests.length, maxPlayers)
  const places = chairPlaces(count)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  // De som redan satt vid bordet när det visades hoppar inte in.
  const seen = useRef(new Set(guests.map((guest) => guest.id)))
  const [arrived, setArrived] = useState<string[]>([])
  const ids = guests.map((guest) => guest.id).join()
  useEffect(() => {
    const fresh = guests.filter((guest) => !seen.current.has(guest.id)).map((guest) => guest.id)
    if (fresh.length === 0) return
    for (const id of fresh) seen.current.add(id)
    setArrived(fresh)
    if (soundOn) playPop()
    // Bara när någon ny sätter sig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
      {/* Bordet med en krämvit duk och vinröd kant, och fika i mitten. */}
      <div
        aria-hidden
        className="absolute inset-[24%] flex items-center justify-center rounded-full border-[6px] border-tant-vin bg-tant-kram text-4xl shadow-[inset_0_0_0_6px_var(--color-tant-kram),inset_0_0_0_8px_color-mix(in_oklch,var(--color-tant-vin)_25%,transparent),0_10px_24px_rgb(0_0_0/0.18)] sm:text-5xl"
      >
        🍰
      </div>
      {places.map((place, i) => {
        const guest = guests[i]
        // Koppen står på duken framför stolen.
        const cup = { x: 50 + (place.x - 50) * 0.5, y: 50 + (place.y - 50) * 0.5 }
        return (
          <div key={guest?.id ?? `ledig-${i}`}>
            {guest && (
              <span aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl" style={{ left: `${cup.x}%`, top: `${cup.y}%` }}>
                ☕
              </span>
            )}
            <div
              className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 sm:w-24"
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
            >
              {guest ? (
                <>
                  <span
                    className={cn(
                      'relative flex size-14 items-center justify-center rounded-2xl bg-tant-vin/90 shadow-soft-sm sm:size-16',
                      arrived.includes(guest.id) && 'motion-safe:animate-hop',
                    )}
                  >
                    <LobbyFigur playerId={guest.id} avatar={guest.avatar} dress={guest.dress} className="text-4xl sm:text-5xl" />
                    {guest.bot && (
                      <Bot aria-label="Bot" className="absolute -top-1.5 -left-1.5 size-6 rounded-full bg-tant-kram p-1 text-tant-vin shadow-soft-sm" />
                    )}
                    {guest.id === meId && (
                      <span className="absolute -right-2 -bottom-1 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">Du</span>
                    )}
                  </span>
                  <span className="max-w-full truncate rounded-full bg-tant-kram/95 px-2 text-xs font-bold text-tant-vin shadow-soft-sm sm:text-sm">
                    {guest.name}
                  </span>
                  {guest.dress && <VannSenast />}
                </>
              ) : (
                <>
                  <span className="size-14 rounded-2xl border-2 border-dashed border-tant-vin/50 bg-tant-kram/60 sm:size-16" />
                  <span className="text-center text-[11px] leading-tight font-semibold text-tant-vin/80">Ledig stol. Bjud in någon</span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Några av spelets kort som en liten solfjäder. Det främsta byts med jämna mellanrum, och ett tryck visar kortet stort.
// Med "minska rörelse" står den still.
const FAN_CARDS: CardType[] = ['tant', 'fika', 'nadu', 'dubbelpass', 'tjuvkika', 'vild']
const FAN_MS = 3500

export function TantKortFlakt() {
  const [front, setFront] = useState(0)
  const [open, setOpen] = useState<CardType | null>(null)
  useEffect(() => {
    if (reducedMotion()) return
    const timer = setInterval(() => setFront((n) => (n + 1) % FAN_CARDS.length), FAN_MS)
    return () => clearInterval(timer)
  }, [])
  const shown = [0, 1, 2, 3, 4].map((offset) => FAN_CARDS[(front + offset) % FAN_CARDS.length])
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative mb-6 h-[7.5rem] w-64 sm:mb-7 sm:h-[9rem] sm:w-80">
        {shown.map((type, i) => {
          const angle = (i - 2) * 12
          return (
            <button
              key={type}
              type="button"
              aria-label={`Visa kortet större`}
              onClick={() => setOpen(type)}
              className="absolute bottom-0 left-1/2 w-20 origin-bottom rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out sm:w-24"
              style={{ transform: `translateX(-50%) translateX(${(i - 2) * 34}px) rotate(${angle}deg) translateY(${Math.abs(i - 2) * 6}px)`, zIndex: i === 2 ? 10 : 5 - Math.abs(i - 2) }}
            >
              <TantKort type={type} size="large" sizes="96px" className="w-full drop-shadow-lg sm:w-full" />
            </button>
          )
        })}
      </div>
      <p className="text-xs font-semibold text-tant-vin/80">Tryck på ett kort för att se det större</p>
      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="justify-items-center border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Kortet</DialogTitle>
          {open && <TantKort type={open} size="zoom" className="drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
