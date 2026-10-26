import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'
import { copyInvite, inviteLink, shareInvite, shareMessage, type ShareResult } from '@/lib/inbjudan'

type InviteCardProps = {
  code: string
  game: GameInfo
}

// Inbjudan till lobbyn: stor kod, QR-kod och knappar för att dela eller kopiera länken.
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
    <div className="flex min-w-0 flex-col items-center gap-4 rounded-lg border bg-card p-5 text-center shadow-soft sm:p-6">
      <p className="text-sm font-semibold text-muted-foreground">
        <Emoji emoji={game.emoji} className="text-base" /> {game.name} · Lobbykod
      </p>
      <p
        className="font-heading text-6xl font-bold tracking-[0.2em] text-primary tabular-nums sm:text-7xl"
        aria-label={`Lobbykod ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      {/* marginSize ger den tysta vita zonen på 4 moduler runt koden som kameror behöver. */}
      <div className="rounded-md border bg-white p-1">
        <QRCodeSVG
          value={link}
          size={176}
          marginSize={4}
          level="M"
          fgColor="#2b303b"
          title={`QR-kod till lobby ${code}`}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Skanna QR-koden, öppna länken eller gå till sidan och skriv koden.
      </p>
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
      {/* Återkoppling som även skärmläsare får höra. */}
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-semibold text-accent-foreground">
        {message}
      </p>
    </div>
  )
}
