import { useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { playersLabel, type GameInfo } from '@/lib/games'
import { canSendWish, sendWish, WISH_MAX_LENGTH, WISH_NAME_MAX_LENGTH } from '@/lib/rapport'
import { cn } from '@/lib/utils'

// "Fler dueller är på väg" på startsidan: de kommande spelen som kort. Ett tryck öppnar en liten ruta med hur spelet
// spelas, antal spelare och Kommer snart (ingen Skapa lobby). Under korten kan man önska ett spel (Önskelåda).
export function KommandeSpel({ games }: { games: GameInfo[] }) {
  const [open, setOpen] = useState<GameInfo | null>(null)
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              onClick={() => setOpen(game)}
              aria-haspopup="dialog"
              className="flex h-full w-full items-center gap-3 rounded-lg border bg-card/60 p-3 text-left opacity-90 transition-colors outline-none hover:bg-card hover:opacity-100 focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md text-xl', game.color)}>
                <Emoji emoji={game.emoji} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <span className="font-heading text-lg leading-tight font-bold">{game.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Kommer snart</span>
                </span>
                <span className="block text-base leading-snug text-muted-foreground">{game.tagline}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        {open && (
          <DialogContent showCloseButton={false} className="motion-reduce:animate-none">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11" aria-label="Stäng">
                <X aria-hidden />
              </Button>
            </DialogClose>
            <div className="flex items-center gap-3 pr-10">
              <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-md text-2xl', open.color)}>
                <Emoji emoji={open.emoji} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl leading-tight">{open.name}</DialogTitle>
                <p className="text-sm font-semibold text-muted-foreground">{playersLabel(open)}</p>
              </div>
            </div>
            <DialogDescription className="text-base text-foreground">{open.intro?.pitch ?? open.tagline}</DialogDescription>
            {open.intro && (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-snug">
                {open.intro.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            )}
            <p className="w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">Kommer snart</p>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

// "Saknar du något spel?": ett fritextfält (högst WISH_MAX_LENGTH tecken), ett valfritt namn och Skicka. Önskemålet
// skickas samma väg som Rapportera fel (rapport.ts), markerat som önskemål. Samma skydd mot spam: ett önskemål åt gången
// per flik (canSendWish). Ingen e-post eller annan personlig information.
export function Onskelada() {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  // Har fliken redan skickat ett önskemål nyss syns tacket direkt.
  const [sent, setSent] = useState(() => !canSendWish(Date.now()))
  // Hopfällt från början. Ett tryck på rubriken fäller ut formuläret och sätter fokus i textfältet.
  const [open, setOpen] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = text.trim()
  const ready = trimmed.length >= 3
  return (
    <section className="rounded-lg border bg-card shadow-soft-sm">
      <h3 className="text-xl">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="onskelada-innehall"
          onClick={() => {
            const next = !open
            setOpen(next)
            // Fokus i textfältet när det fälls ut (inte när tacket visas).
            if (next) requestAnimationFrame(() => textRef.current?.focus())
          }}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:px-5"
        >
          Saknar du något spel?
          <ChevronDown aria-hidden className={cn('size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200', open && 'rotate-180')} />
        </button>
      </h3>
      {/* Mjuk utfällning med grid-raderna (ingen rörelse med "minska rörelse"). Hopfällt går innehållet inte att nå. */}
      <div
        id="onskelada-innehall"
        inert={!open}
        className={cn('grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      {sent ? (
        <p role="status" className="font-semibold">
          Tack! Vi läser alla önskemål.
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!ready) return
            sendWish(trimmed, name.trim(), Date.now())
            setSent(true)
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Vilket spel skulle du vilja spela?</span>
            <Textarea
              ref={textRef}
              value={text}
              maxLength={WISH_MAX_LENGTH}
              rows={3}
              onChange={(event) => setText(event.target.value.slice(0, WISH_MAX_LENGTH))}
              placeholder="Berätta kort om spelet eller leken"
            />
            <span className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>Skriv inga personuppgifter i texten.</span>
              <span className="tabular-nums">
                {text.length}/{WISH_MAX_LENGTH}
              </span>
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Ditt namn (valfritt)</span>
            <Input value={name} maxLength={WISH_NAME_MAX_LENGTH} onChange={(event) => setName(event.target.value.slice(0, WISH_NAME_MAX_LENGTH))} />
          </label>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!ready}>
            Skicka
          </Button>
        </form>
      )}
          </div>
        </div>
      </div>
    </section>
  )
}
