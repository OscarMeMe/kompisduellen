import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowDown, Check, Info, Play } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { GameIntroDialog } from '@/components/GameIntroDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatSek } from '@/lib/belopp'
import { GAMES, playersLabel, type GameInfo } from '@/lib/games'
import { pricePoints } from '@/lib/gissa-priset'
import { checkLobby, felText } from '@/lib/lobbykoll'
import { normalizeCode } from '@/lib/player'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Skapa en lobby', text: 'Välj spel och skriv ditt namn.', color: 'bg-coral-soft' },
  { title: 'Dela koden', text: 'Fyra bokstäver. Skicka i Discord eller säg den högt.', color: 'bg-sun-soft' },
  { title: 'Spela!', text: 'Alla svarar på sin egen skärm. Flest poäng vinner.', color: 'bg-mint-soft' },
]

// En runda i Gissa priset med en riktig sak ur prisdata.ts. Poängen räknas som i spelet.
const PREVIEW_ITEM = { name: 'Ikeas hjärtformade kudde med armar', year: 1998, priceSek: 79 }
const PREVIEW_ROWS = [
  { name: 'Oscar', avatar: '🧙', guess: 75 },
  { name: 'Michaela', avatar: '👽', guess: 120 },
  { name: 'Andreas', avatar: '🤖', guess: 30 },
].map((row, index) => ({ ...row, points: pricePoints(row.guess, PREVIEW_ITEM.priceSek), win: index === 0 }))

// Gå med med en kod direkt från startsidan. Versaler och högst fyra bokstäver, Enter fungerar. Knappen är dov tills
// koden är komplett. Koden kontrolleras innan man går med, så att en felaktig eller avslutad kod ger ett kort besked
// precis under fältet.
function JoinCode() {
  const navigate = useNavigate()
  const fieldId = useId()
  const errorId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const complete = code.length === 4

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (checking) return
    if (!complete) {
      setError('Koden har fyra bokstäver.')
      return
    }
    setChecking(true)
    const result = await checkLobby(code)
    setChecking(false)
    if (result === 'finns') navigate(`/lobby/${code}`)
    else setError(felText(code, result))
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-2 md:mx-0" noValidate>
      <Label htmlFor={fieldId} className="text-base font-bold">
        Har du fått en kod?
      </Label>
      <div className="flex gap-2">
        <Input
          id={fieldId}
          value={code}
          onChange={(event) => {
            setCode(normalizeCode(event.target.value))
            setError(null)
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          placeholder="T.ex. BHKX"
          maxLength={4}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-0 flex-1 font-heading font-bold tracking-widest uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" size="lg" variant={complete ? 'default' : 'outline'} disabled={checking}>
          Gå med
        </Button>
      </div>
      <p id={errorId} role="alert" className="text-sm font-semibold text-primary empty:hidden">
        {error}
      </p>
    </form>
  )
}

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  // "Välj spel/skapa lobby": scrolla till spelen (om det behövs), flytta fokus dit och låt korten lysa upp.
  const [highlightGames, setHighlightGames] = useState(false)
  // Spelet vars förklaring visas. Spelet ligger kvar medan rutan stängs, så att innehållet inte försvinner i animationen.
  const [introGame, setIntroGame] = useState<GameInfo | null>(null)
  const [introOpen, setIntroOpen] = useState(false)
  function showIntro(game: GameInfo) {
    setIntroGame(game)
    setIntroOpen(true)
  }
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function pointAtGames() {
    const games = document.getElementById('spel')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    games?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    games?.focus({ preventScroll: true })
    // Av och på igen, så att animationen startar om vid varje klick.
    setHighlightGames(false)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => {
      setHighlightGames(true)
      highlightTimer.current = setTimeout(() => setHighlightGames(false), 1600)
    }, 30)
  }

  return (
    <div className="flex flex-col gap-7 pt-2 sm:gap-10 sm:pt-5">
      {/* Hero */}
      <section className="grid items-center gap-6 md:grid-cols-[1.3fr_1fr] md:gap-10">
        <div className="space-y-6 text-center md:text-left">
          {/* "Dåliga förlorare." står alltid på en rad. På riktigt smala skärmar krymper rubriken lite
              i stället för att radbrytas eller klippas, från ca 400 px är den 36 px som förut. */}
          <h1 className="text-[clamp(1.75rem,9vw,2.25rem)] leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
            Bra sällskap. <span className="whitespace-nowrap text-primary">Dåliga förlorare.</span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground md:mx-0">
            Samla kompisarna, välj ett spel och dela koden. Alla spelar på sin egen mobil eller dator.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              {/* Till spelkorten, utan att något spel är förvalt. Korten lyser upp, så att knappen märks
                  även när allt redan syns på skärmen. */}
              <Button size="lg" onClick={pointAtGames}>
                Välj spel
                <ArrowDown aria-hidden />
              </Button>
              {/* Det befintliga provläget i Gissa priset: en provrunda på egen hand. */}
              <Button asChild size="lg" variant="outline">
                <Link to="/skapa?spel=gissa-priset&testa=1">
                  <Play aria-hidden />
                  Testa själv
                </Link>
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground md:justify-start">
              <Check className="size-4 text-primary" aria-hidden />
              Inget konto behövs
            </p>
          </div>
          <div className="border-t pt-5">
            <JoinCode />
          </div>
        </div>

        {/* Förhandsvisning av en runda i Gissa priset */}
        <div className="mx-auto w-full max-w-[17rem] rotate-2 rounded-lg border bg-card p-3 shadow-soft sm:max-w-sm sm:p-4 transition-transform hover:rotate-0">
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-bold">Gissa priset</p>
            <span className="rounded-full bg-sky-soft px-3 py-1 text-xs font-semibold">Runda 3 av 5</span>
          </div>
          <div className="mt-2.5 rounded-lg bg-sun-soft py-2.5 text-center">
            <p className="px-4 text-sm font-semibold">
              {PREVIEW_ITEM.name}, {PREVIEW_ITEM.year}
            </p>
            <p className="mt-1 font-heading text-4xl font-bold tabular-nums sm:text-5xl">{formatSek(PREVIEW_ITEM.priceSek)}</p>
            <p className="text-sm text-muted-foreground">Rätt pris</p>
          </div>
          <ol className="mt-2 space-y-1">
            {PREVIEW_ROWS.map((row, index) => (
              <li
                key={row.name}
                className={cn('flex items-center gap-3 rounded-lg px-4 py-1.5', row.win ? 'bg-mint-soft' : 'bg-muted')}
              >
                <span className="w-3 text-sm font-semibold text-muted-foreground">{index + 1}</span>
                <Emoji emoji={row.avatar} className="text-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading font-bold">{row.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Gissade {formatSek(row.guess)}
                    {row.win && '. Närmast!'}
                  </span>
                </span>
                <span className="font-heading text-lg font-bold tabular-nums">+{row.points}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Alla spel */}
      <section id="spel" tabIndex={-1} aria-label="Spel" className="scroll-mt-6 space-y-3 outline-none">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-3xl">Spel</h2>
        </div>
        {/* Spelbara spel först, i vita kort med samma uppbyggnad och höjd. Kommande spel på en egen rad, mindre och nedtonade. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.filter((game) => game.playable).map((game) => (
            // Hela kortet är klickbart och visar förklaringen. Namnet är knappen för tangentbord och skärmläsare,
            // och knapparna längst ner tar sina egna klick.
            <div
              key={game.id}
              onClick={() => showIntro(game)}
              className={cn(
                'flex h-full cursor-pointer flex-col gap-2.5 rounded-lg border bg-card p-4 shadow-soft transition-transform hover:-translate-y-1',
                highlightGames && 'animate-pop ring-4 ring-primary/40',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-md text-3xl', game.color)}>
                  <Emoji emoji={game.emoji} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl leading-tight">
                    <button
                      type="button"
                      className="rounded-md text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                    >
                      {game.name}
                    </button>
                  </h3>
                  {/* Spelarantal från spelets regler och hur lång en match känns (diffust, inga minuter). */}
                  <p className="text-sm font-semibold text-muted-foreground">
                    {[playersLabel(game), game.length].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <p className="line-clamp-2 leading-snug text-muted-foreground">{game.tagline}</p>
              {game.feel && (
                <p className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{game.feel}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-2">
                <Button
                  variant="link"
                  className="h-11 px-0 text-muted-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    showIntro(game)
                  }}
                >
                  <Info /> Så spelar man
                </Button>
                <Button asChild onClick={(event) => event.stopPropagation()}>
                  <Link to={`/skapa?spel=${game.id}`}>Spela nu</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.filter((game) => !game.playable).map((game) => (
            <div key={game.id} className="flex items-center gap-3 rounded-lg border bg-card/60 p-3 opacity-80">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md text-xl', game.color)}>
                <Emoji emoji={game.emoji} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <h3 className="text-base leading-tight">{game.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Kommer snart
                  </span>
                </div>
                <p className="text-sm leading-snug text-muted-foreground">{game.tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <GameIntroDialog game={introGame} open={introOpen} onOpenChange={setIntroOpen} />

      {/* Så funkar det, efter spelen så att spellistan syns direkt */}
      <section id="sa-funkar" className="scroll-mt-6 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-3xl">Så funkar det</h2>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={cn('flex items-start gap-3 rounded-lg px-4 py-3', step.color)}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card font-heading text-sm font-bold shadow-soft-sm">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg leading-tight">{step.title}</h3>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
