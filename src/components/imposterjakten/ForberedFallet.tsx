import { createElement, useId, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  CircleQuestionMark,
  Clapperboard,
  Coffee,
  Folder,
  Gift,
  Leaf,
  MapPin,
  Paperclip,
  PartyPopper,
  Plane,
  Shuffle,
  Smartphone,
  Sofa,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, CLUE_ROUND_OPTIONS, clueRoundsOf, type ImposterSettings } from '@/lib/imposterjakten'
import { caseSummary } from '@/lib/impostervantrum'
import { cn } from '@/lib/utils'

// Mappen "Förbered fallet" i Imposterjaktens väntrum (stilen Nattspanarna): ett krämvitt papper med fliken "Matchens
// upplägg" och ett gem. Svårigheten som tre stora kort, speltempot som segmenterade knappar, kategorin i en väljare som
// fälls ut, om ni sitter tillsammans, kast, och längst ned sammanfattningen och Starta jakten. Värden ändrar valen.
// Gästerna ser samma mapp men kan inte ändra något, och i stället för knappen står vem de väntar på.

// En liten ikon per kategori. En kategori utan ikon får en mapp.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Vardag och saker': Sofa,
  'Mat och fika': Coffee,
  'Djur och natur': Leaf,
  Platser: MapPin,
  'Sport och fritid': Trophy,
  'Svenska traditioner': Gift,
  'Kändisar och kultur': Star,
  'Fest och uteliv': PartyPopper,
  'Jobb och plugg': Briefcase,
  'Resor och semester': Plane,
  'Teknik och appar': Smartphone,
  'Film, tv och musik': Clapperboard,
}
// Kategorins ikon (Blandat = null).
const categoryIcon = (category: string | null) =>
  createElement(category === null ? Shuffle : (CATEGORY_ICONS[category] ?? Folder), { 'aria-hidden': true, className: 'size-5 shrink-0' })

const DIFFICULTIES = [
  { value: 0, name: 'Normal', text: 'Impostern får en vag ledtråd.' },
  { value: 1, name: 'Svår', text: 'Impostern får ingen ledtråd.' },
  { value: 2, name: 'Lurig', text: 'Impostern får ett liknande ord och vet inte att den är impostern.' },
] as const

// Samma fokusring på allt i mappen, innanför kanten så att den inte skärs av.
const FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset'
const LAMP = 'bg-[var(--natt-lampa)]'

type ForberedFalletProps = {
  isHost: boolean
  hostName: string
  settings: ImposterSettings
  rounds: number
  roundOptions: readonly number[]
  throwsAllowed: boolean
  // Varningen när orden i kategorin kan ta slut (wordsRunningOutText), under kategorivalet.
  wordsWarning: string | null
  // För få eller för många: raden i sammanfattningen och den korta förklaringen vid knappen.
  playersText: string | null
  blockedText: string | null
  // En nedräkning pågår redan.
  starting: boolean
  // Gästens rad i stället för knappen, t.ex. "Väntar på att Oscar startar".
  waitingText: string
  onSettings: (settings: Partial<ImposterSettings>) => void
  onRounds: (rounds: number) => void
  onThrows: (allowed: boolean) => void
  onStart: () => void
  // Det som står under knappen för värden (t.ex. tipset om att hålla skärmen tänd).
  children?: ReactNode
}

export function ForberedFallet({
  isHost,
  hostName,
  settings,
  rounds,
  roundOptions,
  throwsAllowed,
  wordsWarning,
  playersText,
  blockedText,
  starting,
  waitingText,
  onSettings,
  onRounds,
  onThrows,
  onStart,
  children,
}: ForberedFalletProps) {
  const locked = !isHost
  const difficulty = settings.tricky ? 2 : settings.hard ? 1 : 0
  const difficultyId = useId()
  const roundsId = useId()
  const lapsId = useId()
  const togetherId = useId()

  return (
    // Fliken sticker upp ovanför mappen, så mappen har luft ovanför.
    <section data-yta="papper" id="forbered-fallet" aria-labelledby="forbered-fallet-rubrik" className="relative mt-9 scroll-mt-12 text-foreground">
      <p className="absolute -top-8 left-4 flex h-9 items-center rounded-t-lg border-2 border-b-0 border-[var(--natt)] bg-[var(--natt-lampa)] px-3 font-heading text-xs font-extrabold tracking-wide whitespace-nowrap text-[var(--natt)] uppercase sm:left-6 sm:px-4 sm:text-sm">
        Matchens upplägg
      </p>
      <Paperclip aria-hidden className="absolute -top-5 right-2 z-10 size-8 rotate-12 sm:-top-4 sm:size-10 text-[var(--natt-dim)] drop-shadow-[0_2px_0_var(--natt)] sm:right-8" strokeWidth={2.25} />
      <div className="rounded-lg border-2 border-[var(--natt)] bg-background p-4 shadow-[0_10px_26px_rgb(0_0_0/0.45)] sm:p-6">
        <h2 id="forbered-fallet-rubrik" className="text-center text-[1.65rem] sm:text-4xl">
          <span className="relative inline-block">
            Förbered fallet
            <span aria-hidden className="absolute inset-x-1 -bottom-1.5 h-1.5 -rotate-1 rounded-full bg-[var(--natt-lampa)]" />
          </span>
        </h2>
        {locked && <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">{hostName} bestämmer upplägget.</p>}

        <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:gap-0">
          {/* Svårighet: tre stora kort med förklaringen i kortet. */}
          <div className="lg:border-r-2 lg:border-border lg:pr-6">
            <h3 id={difficultyId} className="text-xl">
              Svårighet
            </h3>
            <div role="radiogroup" aria-labelledby={difficultyId} className="mt-2 space-y-2.5">
              {DIFFICULTIES.map((option) => {
                const active = option.value === difficulty
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={locked}
                    onClick={() => onSettings({ hard: option.value === 1, tricky: option.value === 2 })}
                    className={cn(
                      'flex min-h-[4.25rem] w-full items-center gap-3 rounded-md border-2 border-[var(--natt)] px-3 py-2.5 text-left transition-colors',
                      FOCUS,
                      active ? cn(LAMP, 'shadow-[inset_5px_0_0_var(--natt)]') : 'bg-card',
                      !active && (locked ? 'opacity-55' : 'hover:bg-muted'),
                    )}
                  >
                    <Mark active={active} />
                    <span className="min-w-0">
                      <span className="block font-heading text-lg leading-tight font-bold">{option.name}</span>
                      <span className="block text-sm leading-snug sm:text-base">{option.text}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 lg:pl-6">
            {/* Speltempo: antal omgångar och varv per omgång. */}
            <div>
              <h3 className="text-xl">Speltempo</h3>
              <p id={roundsId} className="mt-1.5 font-bold">
                Antal omgångar
              </p>
              <Segments labelledBy={roundsId} options={roundOptions} selected={rounds} disabled={locked} onSelect={onRounds} />
              <p id={lapsId} className="mt-3 font-bold">
                Varv per omgång
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Segments labelledBy={lapsId} options={CLUE_ROUND_OPTIONS} selected={clueRoundsOf(settings)} disabled={locked} onSelect={(clueRounds) => onSettings({ clueRounds })} className="w-40" />
                <p className="flex min-w-0 flex-1 basis-40 items-center gap-1.5 text-sm leading-snug">
                  <CircleQuestionMark aria-hidden className="size-5 shrink-0" />
                  Så många gånger går det runt bordet.
                </p>
              </div>
            </div>

            <Rule />
            <CategoryPicker category={settings.category} disabled={locked} onSelect={(category) => onSettings({ category })} />
            {wordsWarning && (
              <p role="status" className="-mt-2 text-sm font-semibold text-primary">
                {wordsWarning}
              </p>
            )}

            <Rule />
            <div>
              <h3 id={togetherId} className="text-lg">
                Sitter ni tillsammans?
              </h3>
              <div role="radiogroup" aria-labelledby={togetherId} className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'Ja · Säg högt' },
                  { value: false, label: 'Nej · Skriv' },
                ].map((option) => {
                  const active = settings.aloud === option.value
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={locked}
                      onClick={() => onSettings({ aloud: option.value })}
                      className={cn(
                        'flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[var(--natt)] px-2 font-bold whitespace-nowrap max-[380px]:text-sm',
                        FOCUS,
                        active ? LAMP : 'bg-card',
                        !active && (locked ? 'opacity-55' : 'hover:bg-muted'),
                      )}
                    >
                      <Mark active={active} small />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Rule />
            {/* Kasta saker: en brytare. Hela raden går att trycka på. */}
            <button
              type="button"
              role="switch"
              aria-checked={throwsAllowed}
              disabled={locked}
              onClick={() => onThrows(!throwsAllowed)}
              className={cn('flex min-h-12 w-full items-center justify-between gap-3 rounded-md text-left', FOCUS)}
            >
              <span className="min-w-0">
                <span className="block font-heading text-lg font-bold">Kasta saker</span>
                <span className="block text-sm leading-snug text-muted-foreground">Tomater, pajer, ägg, toapapper och gurkor på varandra</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 font-bold">
                <span
                  aria-hidden
                  className={cn(
                    'relative h-8 w-14 rounded-full border-2 border-[var(--natt)] transition-colors',
                    throwsAllowed ? LAMP : 'bg-muted',
                    locked && 'opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 flex size-6 items-center justify-center rounded-full bg-[var(--natt)] text-[var(--natt-kram)] transition-[left] duration-200',
                      throwsAllowed ? 'left-[1.6rem]' : 'left-0.5',
                    )}
                  >
                    {throwsAllowed && <Check className="size-4" strokeWidth={3} />}
                  </span>
                </span>
                <span className="w-6">{throwsAllowed ? 'På' : 'Av'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Sammanfattningen och Starta jakten, eller vem gästen väntar på. */}
        <div className="mt-5 flex flex-col gap-3 rounded-md bg-[#bccbd4] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-base leading-snug font-bold sm:text-lg">{caseSummary(settings, rounds)}</p>
            {playersText && <p className="text-sm font-bold">{playersText}</p>}
          </div>
          {isHost ? (
            <div className="shrink-0 space-y-1.5 lg:w-72">
              <Button
                key={blockedText ? 'vantar' : 'redo'}
                size="lg"
                className={cn('w-full text-lg', !blockedText && 'motion-safe:animate-wiggle')}
                disabled={blockedText !== null || starting}
                onClick={onStart}
              >
                Starta jakten
                <ArrowRight aria-hidden />
              </Button>
              {blockedText && (
                <p role="status" className="text-center text-sm font-bold">
                  {blockedText}
                </p>
              )}
            </div>
          ) : (
            <p role="status" className="shrink-0 rounded-md border-2 border-dashed border-[var(--natt)] px-4 py-3 text-center font-heading font-bold">
              {waitingText}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

// Den runda markeringen i ett val: en bock när det är valt, annars en tom ring.
function Mark({ active, small = false }: { active: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--natt)]',
        small ? 'size-5' : 'size-7',
        active ? 'bg-[var(--natt)] text-[var(--natt-lampa)]' : 'bg-card',
      )}
    >
      {active && <Check className={small ? 'size-3.5' : 'size-4.5'} strokeWidth={3.5} />}
    </span>
  )
}

function Rule() {
  return <div aria-hidden className="h-0.5 rounded-full bg-border" />
}

// Segmenterade knappar för korta sifferval. Det valda är lampgult.
function Segments({
  labelledBy,
  options,
  selected,
  disabled,
  onSelect,
  className,
}: {
  labelledBy: string
  options: readonly number[]
  selected: number
  disabled: boolean
  onSelect: (value: number) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={cn('mt-1.5 flex overflow-hidden rounded-md border-2 border-[var(--natt)]', className)}>
      {options.map((value) => {
        const active = value === selected
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(value)}
            className={cn(
              'min-h-12 flex-1 border-l-2 border-[var(--natt)] font-heading text-lg font-bold tabular-nums first:border-l-0',
              FOCUS,
              active ? LAMP : 'bg-card',
              !active && (disabled ? 'text-foreground/45' : 'hover:bg-muted'),
            )}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

// Kategorin: en väljare som fälls ut i mappen (ingen ruta ovanpå sidan), med Blandat först och alla kategorier i två
// spalter. Den fälls ihop när man valt.
function CategoryPicker({ category, disabled, onSelect }: { category: string | null; disabled: boolean; onSelect: (category: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const labelId = useId()
  const options: (string | null)[] = [null, ...CATEGORIES]
  return (
    <div>
      <h3 id={labelId} className="text-lg">
        Kategori
      </h3>
      <p className="text-sm leading-snug text-muted-foreground">Väljer du en kategori ser alla den, även impostern.</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setOpen((now) => !now)}
        className={cn('mt-2 flex min-h-12 w-full items-center gap-3 rounded-md border-2 border-[var(--natt)] bg-card px-3 text-left font-bold', FOCUS, !disabled && 'hover:bg-muted')}
      >
        {categoryIcon(category)}
        <span className="min-w-0 flex-1 truncate">{category ?? 'Blandat'}</span>
        {!disabled && <ChevronDown aria-hidden className={cn('size-5 shrink-0 transition-transform', open && 'rotate-180')} />}
      </button>
      {open && !disabled && (
        <div id={listId} role="radiogroup" aria-labelledby={labelId} className="mt-2 grid grid-cols-2 gap-1.5 rounded-md border-2 border-[var(--natt)] bg-card p-1.5 motion-safe:animate-fade">
          {options.map((option) => {
            const active = option === category
            return (
              <button
                key={option ?? 'blandat'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onSelect(option)
                  setOpen(false)
                }}
                className={cn(
                  'flex min-h-12 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm leading-tight font-semibold',
                  FOCUS,
                  active ? cn(LAMP, 'font-bold') : 'hover:bg-muted',
                  // Blandat står på en egen rad överst.
                  option === null && 'col-span-2',
                )}
              >
                {categoryIcon(option)}
                <span className="min-w-0">{option ?? 'Blandat'}</span>
                {active && <Check aria-hidden className="ml-auto size-4 shrink-0" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
