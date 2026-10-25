import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'

type InviteCardProps = {
  code: string
  game: GameInfo
}

// Inbjudan till lobbyn: stor kod, QR-kod och knappar för att dela eller kopiera länken.
// Länken /lobby/KOD för med sig koden, så gästen slipper skriva den. QR-koden ritas här i appen
// (qrcode.react), så länken skickas aldrig till någon extern tjänst.
export function InviteCard({ code, game }: InviteCardProps) {
  const link = `${window.location.origin}/lobby/${code}`
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  function show(text: string) {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 3000)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      show('Länken är kopierad')
    } catch {
      show('Kunde inte kopiera. Be kompisarna skriva koden i stället.')
    }
  }

  // Enhetens delningsfunktion där den finns, annars kopiering.
  async function shareLink() {
    if (!canShare) return copyLink()
    try {
      await navigator.share({ title: 'Kompisduellen', text: `Häng med och spela ${game.name}! Koden är ${code}.`, url: link })
    } catch (error) {
      // Avbröt man delningen händer ingenting. Andra fel: kopiera i stället.
      if ((error as DOMException)?.name !== 'AbortError') await copyLink()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-soft">
      <p className="text-sm font-semibold text-muted-foreground">
        <Emoji emoji={game.emoji} className="text-base" /> {game.name} · Lobbykod
      </p>
      <p
        className="font-heading text-6xl font-bold tracking-[0.2em] text-primary tabular-nums sm:text-7xl"
        aria-label={`Lobbykod ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      <div className="rounded-md border bg-white p-3">
        <QRCodeSVG value={link} size={144} level="M" fgColor="#2b303b" title={`QR-kod till lobby ${code}`} />
      </div>
      <p className="text-sm text-muted-foreground">
        Skanna QR-koden, öppna länken eller gå till sidan och skriv koden.
      </p>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={shareLink}>
          <Share2 />
          Dela
        </Button>
        <Button variant="outline" size="lg" onClick={copyLink}>
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
