import { useEffect, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { SpelIkon } from '@/components/SpelIkon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCountdown } from '@/hooks/useCountdown'
import { GAMES, playersLabel, type GameInfo } from '@/lib/games'
import { loadSoundOn, playCountdownTick } from '@/lib/ljud'
import { REMATCH_SECONDS, tooManyPlayers, type CountdownKind } from '@/lib/match'
import { cn } from '@/lib/utils'
import { gameChoiceNote } from '@/lib/vantrum'

// Delar som väntrummen har gemensamt: spelvalet (Byt spel), Så spelas det och nedräkningen före en match.

// Hur det valda spelet markeras i spelvalet: i det nuvarande spelets färger (lampgult för Imposterjakten, vinrött för
// Exploderande Tanter, annars spelets pastell från data-spel), aldrig bara med färg (det har också en bock).
function selectedStyle(gameId: string): string {
  if (gameId === 'imposterjakten') return 'border-[var(--natt)] bg-[var(--natt-lampa)] text-[var(--natt)] hover:bg-[var(--natt-lampa)] hover:text-[var(--natt)]'
  if (gameId === 'tantpanik') return 'border-tant-vinrod bg-tant-vinrod text-tant-kram-2 hover:bg-tant-vinrod hover:text-tant-kram-2'
  return 'border-foreground bg-spel-yta text-spel-text hover:bg-spel-yta hover:text-spel-text'
}

// Värdens Byt spel, samma i alla väntrum: knappen och spelvalet som en stor ruta mitt på skärmen, med två kolumner på
// dator och en på mobil. Rutan stängs med krysset, ett tryck utanför, Esc eller genom att välja ett spel. Väljer man
// spelet som redan är valt stängs den utan att något ändras. Raden om att man är själv eller för få står en gång
// överst (gameChoiceNote), och antalet spelare är markerat vid de spel det gäller.
// choosingGame = värden kom hit via Byt spel på slutskärmen, och openAtStart = rutan ska vara öppen från början.
// players = alla i lobbyn.
export function BytSpel({
  game,
  players,
  choosingGame,
  openAtStart = false,
  onSetGame,
  className,
}: {
  game: GameInfo
  players: number
  choosingGame: boolean
  openAtStart?: boolean
  onSetGame: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(choosingGame || openAtStart)
  // Ett dubbeltryck på Byt spel ska inte också välja ett spel: det andra trycket landar på spelvalet.
  const [canChoose, setCanChoose] = useState(false)
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setCanChoose(true), 700)
    return () => {
      clearTimeout(timer)
      setCanChoose(false)
    }
  }, [open])
  const games = GAMES.filter((g) => g.playable)
  const note = gameChoiceNote(
    players,
    games,
    games.filter((g) => tooManyPlayers(g.id, players)).map((g) => g.name),
  )

  function choose(id: string) {
    if (!canChoose) return
    // Samma spel igen ändrar inget, utom att "väljer nästa spel" tas bort hos de andra.
    if (id !== game.id || choosingGame) onSetGame(id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('h-12 shrink-0 px-4', className)}>
          Byt spel
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] gap-4 overflow-x-hidden overflow-y-auto sm:max-w-2xl"
        // Fokus börjar på det valda spelet, inte på det första i listan (som annars ser valt ut).
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-pressed=true]')?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Byt spel</DialogTitle>
          <DialogDescription className={cn('text-base', note ? 'font-semibold text-foreground' : 'sr-only')}>{note ?? 'Välj vilket spel ni ska spela.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {games.map((option) => {
            const selected = option.id === game.id
            const wrongCount = players < option.minPlayers || tooManyPlayers(option.id, players)
            return (
              <Button
                key={option.id}
                variant="outline"
                aria-pressed={selected}
                data-spel={option.id}
                onClick={() => choose(option.id)}
                className={cn('h-auto min-h-[4.75rem] justify-start gap-3 rounded-lg border-2 p-3 text-left whitespace-normal', selected ? selectedStyle(option.id) : 'bg-card')}
              >
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-md text-3xl', option.color)}>
                  <SpelIkon game={option} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-base font-bold">{option.name}</span>
                  <span className={cn('line-clamp-2 text-sm leading-snug font-normal', selected ? 'opacity-90' : 'text-muted-foreground')}>{option.tagline}</span>
                  <span className={cn('mt-0.5 block text-xs font-bold', !selected && (wrongCount ? 'text-primary' : 'text-muted-foreground'))}>
                    👥 {playersLabel(option)}
                    {wrongCount && players > 1 && ` · ni är ${players}`}
                  </span>
                </span>
                {selected && <Check className="size-5 shrink-0" aria-label="Valt" />}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Raden med spelet som är valt, i de vanliga väntrummen och Exploderande Tanters: ikonen, namnet och den korta
// beskrivningen, och värdens Byt spel till höger (children).
export function ValtSpel({ game, children, className }: { game: GameInfo; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border-2 bg-card p-3', className)}>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-md text-3xl', game.color)}>
        <SpelIkon game={game} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-base leading-tight font-bold">{game.name}</p>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{game.tagline}</p>
      </div>
      {children}
    </div>
  )
}

// Så spelas det: hur spelet går till och hur poängen räknas, för spelet som är valt just nu. Hopfällt för alla.
export function HowToPlay({ howTo, scoringDetails }: { howTo: string; scoringDetails: string[] }) {
  return (
    <details className="rounded-lg border bg-card px-4 text-sm shadow-soft-sm">
      {/* Hela raden är tryckbar, minst 44 px hög. */}
      <summary className="-mx-4 cursor-pointer px-4 py-3 font-semibold">Så spelas det</summary>
      <div className="space-y-2 pb-3 text-muted-foreground">
        <p>{howTo}</p>
        <ul className="list-disc space-y-1 pl-5">
          {scoringDetails.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </details>
  )
}

// Nedräkning före en match (första starten eller revansch): alla ser samma tal, och matchen startar av sig själv.
// Värden kan avbryta. En revansch tar över hela skärmen och hörs (följer ljudknappen), så att ingen missar den.
export function RematchCountdown({
  at,
  kind,
  rule,
  clockOffset,
  isHost,
  onCancel,
}: {
  at: number
  kind: CountdownKind
  rule: string
  clockOffset: number
  isHost: boolean
  onCancel: () => void
}) {
  const { secondsLeft } = useCountdown(at, clockOffset, REMATCH_SECONDS)
  const rematch = kind !== 'first'
  const shown = Math.max(1, secondsLeft)
  useEffect(() => {
    if (rematch && loadSoundOn()) playCountdownTick(shown)
  }, [rematch, shown])
  const box = (
    <section
      className={cn(
        'space-y-2 rounded-lg border-2 border-primary bg-coral-soft p-5 text-center shadow-soft animate-pop',
        rematch && 'w-full max-w-md space-y-3 p-8',
      )}
      aria-live="polite"
    >
      <p className={cn('font-heading font-bold', rematch ? 'text-4xl sm:text-5xl' : 'text-lg')}>
        {kind === 'first' ? 'Nu kör vi!' : 'Revansch!'}
      </p>
      <p
        className={cn('font-heading font-bold text-primary tabular-nums', rematch ? 'text-8xl sm:text-9xl' : 'text-6xl')}
        aria-label={`Startar om ${secondsLeft} sekunder`}
      >
        {/* Varje siffra poppar in för sig. */}
        <span key={shown} className="inline-block motion-safe:animate-pop">
          {shown}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        {kind === 'first' ? rule : 'Samma spel och samma inställningar. Gör er redo!'}
      </p>
      {isHost && (
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
      )}
    </section>
  )
  if (!rematch) return box
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">{box}</div>
}
