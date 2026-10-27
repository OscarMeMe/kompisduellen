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
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Lobbykod</p>
          <p
            className="font-heading text-4xl font-bold tracking-[0.15em] text-primary tabular-nums min-[420px]:text-5xl sm:text-6xl"
            aria-label={`Lobbykod ${code.split('').join(' ')}`}
          >
            {code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Skanna, öppna länken eller skriv koden på sidan.</p>
        </div>
      </div>
      {/* Texten får radbrytas, så att knapparna ryms även på en 320 px bred skärm. */}
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Button size="lg" className="h-auto min-h-13 whitespace-normal" onClick={shareLink}>
          <Share2 />
          Dela
        </Button>
        <Button variant="outline" size="lg" className="h-auto min-h-13 whitespace-normal" onClick={copyLink}>
          {message === 'Länken är kopierad' ? <Check /> : <Copy />}
          Kopiera inbjudningslänk
        </Button>
      </div>
      {/* Återkoppling som även skärmläsare får höra. Tar ingen plats förrän något visas. */}
      <p role="status" aria-live="polite" className="text-center text-sm font-semibold text-accent-foreground empty:hidden">
        {message}
      </p>
    </div>
  )
}
