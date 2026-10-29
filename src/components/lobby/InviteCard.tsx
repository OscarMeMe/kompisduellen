import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'
import { copyInvite, inviteLink, shareInvite, shareMessage, type ShareResult } from '@/lib/inbjudan'

type InviteCardProps = {
  code: string
  game: GameInfo
}

// Inbjudan till lobbyn: kod, QR-kod och knappar för att dela eller kopiera länken.
// Länken /lobby/KOD för med sig koden, så gästen slipper skriva den. QR-koden ritas här i appen
// (qrcode.react), så länken skickas aldrig till någon extern tjänst.
export function InviteCard({ code, game }: InviteCardProps) {
  const link = inviteLink(window.location.origin, code)
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Urklippet kan saknas (t.ex. på http utan localhost). Då blir det ett fel som visas som text.
  const copy = (text: string) => navigator.clipboard.writeText(text)

  function show(result: ShareResult) {
    const text = shareMessage(result)
    clearTimeout(timer.current)
    setMessage(text)
    if (text) timer.current = setTimeout(() => setMessage(null), 3000)
  }

  async function copyLink() {
    show(await copyInvite(link, copy))
  }

  // Enhetens delningsfunktion där den finns, annars kopiering (se shareInvite).
  async function shareLink() {
    const share = typeof navigator.share === 'function' ? (data: ShareData) => navigator.share(data) : undefined
    const text = `Häng med och spela ${game.name}! Koden är ${code}.`
    show(await shareInvite({ title: 'Kompisduellen', text, url: link }, { share, copy }))
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 shadow-soft sm:p-5">
      {/* Kod och QR bredvid varandra, så att kortet tar lite plats på en mobil. */}
      <div className="flex items-center gap-4">
        {/* marginSize ger den tysta vita zonen på 4 moduler runt koden som kameror behöver. */}
        <div className="shrink-0 rounded-md border bg-white p-1">
          <QRCodeSVG
            value={link}
            size={128}
            marginSize={4}
            level="M"
            fgColor="#2b303b"
            title={`QR-kod till lobby ${code}`}
          />
        </div>
        {/* Container: koden skalas efter bredden på rutan, så att den aldrig går utanför. */}
        <div className="@container min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Lobbykod</p>
          <p
            className="font-heading text-[clamp(1.5rem,24cqw,3.75rem)] font-bold tracking-[0.1em] text-primary tabular-nums"
            aria-label={`Lobbykod ${code.split('').join(' ')}`}
          >
            {code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Skanna, öppna länken eller skriv koden på sidan.</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <Button size="lg" className="whitespace-nowrap" onClick={shareLink}>
          <Share2 />
          Dela
        </Button>
        <Button variant="outline" size="lg" className="whitespace-nowrap" onClick={copyLink}>
          {message === 'Länken är kopierad' ? <Check className="motion-safe:animate-pop" /> : <Copy />}
          Kopiera länk
        </Button>
      </div>
      {/* Återkoppling som även skärmläsare får höra. Tar ingen plats förrän något visas. */}
      <p role="status" aria-live="polite" className="text-center text-sm font-semibold text-accent-foreground empty:hidden">
        {message}
      </p>
    </div>
  )
}
