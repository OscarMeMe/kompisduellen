import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowDown } from 'lucide-react'
import { GaMedKod } from '@/components/GaMedKod'
import { SpelKort } from '@/components/SpelKort'
import { DRINK_RULES, gamesForTillfalle, SHOW_TILLFALLEN, TILLFALLEN, type TillfalleId } from '@/lib/tillfallen'
import { GAME_SORTS, loadGameSort, saveGameSort, sortGames, type GameSort } from '@/lib/sortering'
import { HeroFigurer } from '@/components/HeroFigurer'
import { Prickar } from '@/components/Prickar'
import { VagSektion } from '@/components/Vag'
import { SovandeSjusovare } from '@/components/SovandeSjusovare'
import { GameIntroDialog } from '@/components/GameIntroDialog'
import { KommandeSpel, Onskelada } from '@/components/KommandeSpel'
import { Button } from '@/components/ui/button'
import { GAMES, type GameInfo } from '@/lib/games'
import { cn } from '@/lib/utils'

const GUIDE_LINKS = [
  { to: '/forfestlekar', text: 'Förfestlekar på mobilen' },
  { to: '/spel-pa-discord', text: 'Spel att spela på Discord' },
  { to: '/gissningslekar', text: 'Gissningslekar online' },
]

const STEPS = [
  { title: 'Välj ett spel', text: 'Skapa en lobby med ditt namn.', color: 'bg-coral-soft' },
  { title: 'Dela koden', text: 'Skicka den till kompisarna.', color: 'bg-sun-soft' },
  { title: 'Låt duellen börja', text: 'Alla spelar på sin egen skärm.', color: 'bg-mint-soft' },
]

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  // "Välj spel/skapa lobby": scrolla till spelen (om det behövs), flytta fokus dit och låt korten lysa upp.
  const [highlightGames, setHighlightGames] = useState(false)
  // Tillfället sorterar spelen, och inget spel göms.
  const [tillfalle, setTillfalle] = useState<TillfalleId>('alla')
  // Sorteringen av spelen. Populärast om man inte valt något själv (sortering.ts).
  const [sort, setSort] = useState<GameSort>(loadGameSort)
  // Spelet vars förklaring visas. Spelet ligger kvar medan rutan stängs, så att innehållet inte försvinner i animationen.
  const [introGame, setIntroGame] = useState<GameInfo | null>(null)
  const [introOpen, setIntroOpen] = useState(false)
  function showIntro(game: GameInfo) {
    setIntroGame(game)
    setIntroOpen(true)
  }
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Knappen Välj spel, där ringarna i prickarna sprider sig ifrån.
  const chooseButton = useRef<HTMLButtonElement>(null)
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

  // Startsidan är sektioner som avlöser varandra med mjuka vågor (VagSektion): hero på sanden med prickarna, spelen på
  // krämvitt, de kommande spelen och önskelådan på ljus persika, Så fungerar det på ljusblått, och sist tipsen på en
  // mörkare sandton som sidfoten fortsätter på (Layout). Färgerna är --startsida-* i index.css.
  return (
    <div className="flex flex-col pt-2 sm:pt-6">
      <Prickar origin={chooseButton} />
      {/* Hero: blobbarna överst och under dem texten och vägarna in, centrerat på alla skärmar. */}
      <section className="flex flex-col items-center gap-6 pb-14 sm:pb-20 lg:gap-7 lg:pb-24">
        <HeroFigurer className="justify-center text-[2.75rem] sm:text-[4rem] lg:-space-x-5 lg:text-[5.5rem]" />
        <div className="space-y-6 text-center lg:space-y-7">
          <div className="space-y-3">
            {/* Två rader på smal skärm, med brytningen efter "Sällskapsspel online". */}
            <p className="text-base font-bold text-muted-foreground sm:text-lg">
              <span className="block lg:inline">Sällskapsspel online</span>
              <span className="hidden lg:inline" aria-hidden>
                {' · '}
              </span>
              <span className="block lg:inline">Gratis · Ingen app · Inget konto</span>
            </p>
            {/* "Dåliga förlorare." står alltid på en rad. På riktigt smala skärmar krymper rubriken i stället för att
                radbrytas eller klippas. */}
            <h1 className="text-[clamp(1.85rem,9.6vw,2.75rem)] leading-[1.08] sm:text-6xl lg:text-[4.25rem]">
              Bra sällskap. <span className="relative inline-block whitespace-nowrap text-primary motion-safe:hover:animate-wiggle">
                Dåliga förlorare.
                {/* Ett handritat streck under orden. */}
                <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-2 w-full overflow-visible sm:-bottom-2 sm:h-3">
                  <path d="M2 8 C40 2 70 11 104 6 S170 3 198 7" fill="none" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-sun" />
                </svg>
              </span>
            </h1>
          </div>
          <p className="mx-auto max-w-lg text-lg text-balance text-muted-foreground sm:text-xl">
            Välj ett spel, dela koden och spela på varsin mobil eller dator.
          </p>
          {/* De två vägarna in, under varandra. */}
          <div className="mx-auto flex max-w-sm flex-col gap-5">
            {/* Till spelkorten, utan att något spel är förvalt. Korten lyser upp, så att knappen märks
                även när allt redan syns på skärmen. */}
            {/* Byter färg när musen är över, som alla knappar utanför spelen (index.css, data-knappar i Layout). */}
            <Button ref={chooseButton} size="lg" onClick={pointAtGames} className="text-lg">
              Välj spel
              <ArrowDown aria-hidden />
            </Button>
            {/* Den andra vägen in, för den som blivit inbjuden. */}
            <GaMedKod className="text-left" />
          </div>
        </div>
      </section>

      {/* Alla spel, på krämvitt. Exempelrundan (ExempelRunda) är borttagen från startsidan men finns kvar i koden. */}
      <VagSektion
        color="var(--startsida-spel)"
        id="spel"
        tabIndex={-1}
        aria-labelledby="spel-rubrik"
        className="scroll-mt-16 outline-none"
        innerClassName="space-y-5"
      >
        {/* Rubriken och Sortera på samma rad. På smal skärm ligger väljaren under rubriken. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 id="spel-rubrik" className="text-4xl text-balance sm:text-5xl">
              Vad ska ni spela?
            </h2>
            <p className="text-lg text-muted-foreground">Välj ett spel och skapa en lobby.</p>
          </div>
          <SortChoice sort={sort} onChange={setSort} />
        </div>
        {/* Vad är det för kväll? Flikarna sorterar spelen så att det som passar bäst kommer först. På mobil står de på en
            rad som går att svepa, så att spelkorten kommer högre upp. Dolda just nu (SHOW_TILLFALLEN). */}
        {SHOW_TILLFALLEN && (
        <div
          role="group"
          aria-label="Vad är det för kväll?"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {TILLFALLEN.map((item) => (
            <Button
              key={item.id}
              variant={item.id === tillfalle ? 'default' : 'outline'}
              aria-pressed={item.id === tillfalle}
              className="shrink-0 rounded-full"
              onClick={() => setTillfalle(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
        )}
        {SHOW_TILLFALLEN && tillfalle === 'forfest' && (
          <details className="rounded-lg bg-coral-soft px-4 py-3">
            <summary className="cursor-pointer font-semibold">
              <span className="font-heading font-bold">Drickregler</span>{' '}
              <span className="rounded-md bg-foreground px-1.5 py-0.5 font-heading text-xs font-bold text-background">18+</span>{' '}
              <span className="text-sm font-medium">Valfritt. Funkar lika bra med läsk.</span>
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {DRINK_RULES.map((item) => (
                <li key={item.game}>
                  <span className="font-bold">{item.game}:</span> {item.rule}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Drick i din egen takt och hoppa över när du vill. Det går lika bra att spela utan.</p>
          </details>
        )}
        {/* Spelbara spel först och större. Kommande spel på en egen rad, nedtonade. */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {orderedGames(tillfalle, sort).map(({ game, note }, index) => (
            <SpelKort
              key={game.id}
              index={index}
              game={game}
              note={note}
              tillfalle={tillfalle}
              highlight={highlightGames}
              onShowRules={() => showIntro(game)}
            />
          ))}
        </div>
      </VagSektion>
      <GameIntroDialog game={introGame} open={introOpen} onOpenChange={setIntroOpen} />

      {/* Kommande spel på ljus persika: ett tryck visar hur spelet spelas (ingen Skapa lobby), och under dem kan man
          önska ett spel. */}
      <VagSektion color="var(--startsida-kommande)" flip aria-labelledby="kommande-rubrik" innerClassName="space-y-5">
        <h2 id="kommande-rubrik" className="text-3xl text-balance sm:text-4xl">
          Fler dueller är på väg.
        </h2>
        <KommandeSpel games={GAMES.filter((game) => !game.playable)} />
        <Onskelada />
      </VagSektion>

      {/* Så fungerar det, på ljusblått. */}
      {/* Extra luft nedtill, så att Sjusovaren som vilar på vågen under aldrig täcker stegen. */}
      <VagSektion
        color="var(--startsida-steg)"
        id="sa-funkar"
        aria-labelledby="sa-funkar-rubrik"
        className="scroll-mt-16 pb-32 sm:pb-44 lg:pb-44"
        innerClassName="space-y-6"
      >
        <h2 id="sa-funkar-rubrik" className="text-4xl text-balance sm:text-5xl">
          Så fungerar det
        </h2>
        <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-4">
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-full font-heading text-xl font-bold shadow-soft-sm',
                  step.color,
                )}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl leading-tight sm:text-2xl">{step.title}</h3>
                <p className="mt-1 text-lg text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </VagSektion>

      {/* Guiderna, för den som vill läsa mer, på sidfotens sandton så att de och sidfoten blir en sektion. */}
      <VagSektion
        color="var(--startsida-fot)"
        flip
        aria-labelledby="tips-rubrik"
        className="pb-6 sm:pb-8 lg:pb-10"
        innerClassName="space-y-4"
        // Sjusovaren vilar händerna på vågens kant, mot höger, och nederkanten döljs bakom vågen.
        behindWave={
          <SovandeSjusovare className="absolute right-[6%] bottom-full w-28 sm:right-[10%] sm:w-36 lg:right-[calc(50%-27rem)] lg:w-44" />
        }
      >
        <h2 id="tips-rubrik" className="text-3xl text-balance sm:text-4xl">
          Tips inför kvällen
        </h2>
        <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-8">
          {GUIDE_LINKS.map((guide) => (
            <li key={guide.to}>
              <Link to={guide.to} className="inline-flex min-h-11 items-center text-lg font-semibold underline underline-offset-4 hover:text-primary">
                {guide.text}
              </Link>
            </li>
          ))}
        </ul>
      </VagSektion>
    </div>
  )
}

// De spelbara spelen i vald ordning. Under ett tillfälle är tillfällets egen ordning dess Populärast (det som passar
// bäst först), och de andra sorteringarna gäller som vanligt. Tillfällets korta rad om varför spelet passar följer med.
function orderedGames(tillfalle: TillfalleId, sort: GameSort): { game: GameInfo; note?: string }[] {
  const playable = sortGames(GAMES.filter((game) => game.playable), 'populart')
  // Utan flikarna (SHOW_TILLFALLEN) visas alla spel i vald ordning, utan tillfällenas rader.
  if (!SHOW_TILLFALLEN) return sortGames(playable, sort).map((game) => ({ game }))
  const byOccasion = gamesForTillfalle(tillfalle, playable)
  if (sort === 'populart') return byOccasion
  const notes = new Map(byOccasion.map(({ game, note }) => [game.id, note]))
  return sortGames(playable, sort).map((game) => ({ game, note: notes.get(game.id) }))
}

// Sortera: diskret, en vanlig väljare som fungerar med tangentbord och på mobil. Valet sparas (sortering.ts).
function SortChoice({ sort, onChange }: { sort: GameSort; onChange: (sort: GameSort) => void }) {
  return (
    <label className="flex w-fit shrink-0 items-center gap-2 text-base text-muted-foreground">
      Sortera
      <select
        value={sort}
        onChange={(event) => {
          const next = event.target.value as GameSort
          onChange(next)
          saveGameSort(next)
        }}
        className="h-11 rounded-md border bg-card px-3 font-semibold text-foreground shadow-soft-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        {GAME_SORTS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
