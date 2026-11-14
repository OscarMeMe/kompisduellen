import { useId, type ReactNode } from 'react'
import { ArrowRight, Check, Lock, Plus, Trash2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import type { BotRow } from '@/components/tantpanik/TantBotar'
import { BOT_LEVEL_NAMES, BOT_LEVELS, isBotLevel, MAX_BOTS, type BotLevel } from '@/lib/tantbot'
import { KAOS_MIN_PLAYERS, LEVEL_NAMES, levelFor, TANT_LEVELS, type TantLevel, type TantSettings } from '@/lib/tantpanik'
import { tantBombsLine, tantExtrasLine, tantSummary } from '@/lib/tantvantrum'
import { cn } from '@/lib/utils'

// Inställningsrutan "Dags för kafferep!" i Exploderande Tanters väntrum, i vinrött och krämvitt med en spetsdukskant:
// svårigheten som tre kort med kaffekoppar som blir farligare, botarna i en lista, "Extra bus" (Tantsnaran och Kasta
// saker) som brytare, och längst ned en sammanfattning med lacksigill och Starta matchen. Värden ändrar valen. Gästerna
// ser samma ruta låst, och i stället för knappen står vem de väntar på. Det som går att trycka på har en tydlig kant
// eller är en knapp. Kopparna, garnnystanet, tomaten och sigillet är bara dekoration.

const LEVEL_TEXT: Record<TantLevel, string> = {
  normal: 'En tant färre än antalet spelare.',
  svar: 'En tant till jämfört med Normal.',
  kaos: 'Två tanter till jämfört med Normal.',
}

const FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-tant-vinrod/50'

type TantInstallningarProps = {
  isHost: boolean
  hostName: string
  settings: TantSettings
  // Alla vid bordet, botarna inräknade.
  players: number
  bots: BotRow[]
  canAddBot: boolean
  throwsAllowed: boolean
  // För få eller för många: den korta förklaringen vid en avstängd knapp. null = det går att starta.
  blockedText: string | null
  // En nedräkning pågår redan.
  starting: boolean
  // Gästens rad i stället för knappen.
  waitingText: string
  onSettings: (settings: Partial<TantSettings>) => void
  onThrows: (allowed: boolean) => void
  onStart: () => void
  // Saknas för gäster.
  botActions?: { addBot: () => void; removeBot: (id: string) => void; setBotLevel: (id: string, level: BotLevel) => void }
}

export function TantInstallningar({
  isHost,
  hostName,
  settings,
  players,
  bots,
  canAddBot,
  throwsAllowed,
  blockedText,
  starting,
  waitingText,
  onSettings,
  onThrows,
  onStart,
  botActions,
}: TantInstallningarProps) {
  const locked = !isHost
  const chosen = settings.level ?? 'normal'
  const levelId = useId()

  return (
    // Spetsduken: en vinröd botten med en rad krämvita prickar runt den krämvita rutan (en prickad kant som sitter ihop
    // med rutan, så att kanten blir vågig).
    <section aria-labelledby="tant-installningar-rubrik" className="rounded-[1.9rem] bg-tant-vinrod p-1 shadow-soft">
      <div className="rounded-[1.6rem] border-[9px] border-dotted border-tant-kram-2 bg-tant-kram-2 bg-clip-padding px-3 pt-4 pb-3 text-tant-ink sm:px-6 sm:pt-6 sm:pb-5">
        <div className="text-center">
          <h2 id="tant-installningar-rubrik" className="text-3xl text-tant-vinrod italic sm:text-4xl">
            Dags för kafferep!
          </h2>
          <p className="mt-1 font-semibold">{isHost ? 'Du bestämmer hur stökigt det blir.' : `${hostName} bestämmer hur stökigt det blir.`}</p>
          <div aria-hidden className="mx-auto mt-2 flex max-w-xs items-center gap-3 text-tant-vinrod">
            <span className="h-0.5 flex-1 rounded-full bg-tant-vinrod/60" />
            <Kopp level="normal" className="size-7" />
            <span className="h-0.5 flex-1 rounded-full bg-tant-vinrod/60" />
          </div>
        </div>

        {/* Svårigheten: tre kort bredvid varandra (under varandra på mobil) med en kopp som blir farligare. */}
        <h3 id={levelId} className="mt-3 text-xl text-tant-vinrod">
          Svårighet
        </h3>
        <div role="radiogroup" aria-labelledby={levelId} className="mt-2 grid gap-2 sm:grid-cols-3">
          {TANT_LEVELS.map((level) => {
            const active = level === chosen
            const tooFew = level === 'kaos' && players < KAOS_MIN_PLAYERS
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={locked || (tooFew && !active)}
                onClick={() => onSettings({ level })}
                className={cn(
                  'relative flex min-h-[4.5rem] items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors sm:min-h-28 sm:items-start sm:pt-3',
                  FOCUS,
                  active ? 'border-tant-vinrod bg-[#fbe3e4] shadow-[0_3px_0_var(--tant-vinrod)]' : 'border-tant-ink/35 bg-white/70',
                  tooFew && !active ? 'border-dashed bg-tant-ink/[0.06] text-tant-ink/60' : !active && (locked ? 'opacity-60' : 'hover:bg-[#fdeeee]'),
                )}
              >
                <Kopp level={level} className={cn('size-11 shrink-0 text-tant-vinrod', tooFew && !active && 'opacity-60')} />
                <span className="min-w-0 flex-1 pr-6">
                  <span className={cn('block font-heading text-lg leading-tight font-bold', active && 'text-tant-vinrod')}>{LEVEL_NAMES[level]}</span>
                  <span className="block text-sm leading-snug">{LEVEL_TEXT[level]}</span>
                  {tooFew && (
                    <span className="mt-0.5 block text-xs leading-snug font-bold">
                      Kräver minst {KAOS_MIN_PLAYERS} spelare · ni är {players}
                    </span>
                  )}
                </span>
                {/* Uppe till höger: bocken på det valda, ett lås på Kaos när ni är för få, annars en tom ring. */}
                <span aria-hidden className="absolute top-2 right-2">
                  {active ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-tant-vinrod text-tant-kram-2">
                      <Check className="size-4" strokeWidth={3.5} />
                    </span>
                  ) : tooFew ? (
                    <Lock className="size-5" />
                  ) : (
                    <span className="block size-6 rounded-full border-2 border-tant-ink/45 bg-white" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <p role="status" className="mt-2 rounded-lg bg-[#f8e7c3] px-3 py-1.5 text-center text-sm font-bold text-tant-vin sm:text-base">
          {tantBombsLine(chosen, players)}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-0">
          {/* Botarna: en rad per bot med figuren, svårigheten och papperskorgen. */}
          <div className="min-w-0 sm:border-r-2 sm:border-tant-vinrod/25 sm:pr-5">
            <h3 className="text-xl text-tant-vinrod">
              Botar · {bots.length} av {MAX_BOTS}
            </h3>
            <p className="text-sm leading-snug">{isHost ? 'Svårighet per bot: Lätt, Normal eller Svår.' : 'Botarna spelar som vilka spelare som helst.'}</p>
            {bots.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {bots.map((bot) => (
                  <li key={bot.id} className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-tant-ink/20 bg-white/70 py-1 pr-1.5 pl-2 max-[400px]:gap-1 max-[400px]:pr-0.5 max-[400px]:pl-1">
                    <LobbyFigur playerId={bot.id} avatar={bot.avatar} lively={false} className="shrink-0 text-3xl max-[400px]:text-2xl" />
                    <span className="min-w-0 flex-1 truncate font-heading font-bold max-[400px]:text-[13px]">{bot.name}</span>
                    {botActions ? (
                      <>
                        <select
                          aria-label={`Svårighet för ${bot.name}`}
                          value={bot.level}
                          onChange={(event) => isBotLevel(event.target.value) && botActions.setBotLevel(bot.id, event.target.value)}
                          className={cn('h-11 shrink-0 cursor-pointer rounded-lg border-2 border-tant-ink/45 bg-white px-1.5 font-bold max-[400px]:w-[4.9rem] max-[400px]:px-0.5 max-[400px]:text-sm', FOCUS)}
                        >
                          {BOT_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {BOT_LEVEL_NAMES[level]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label={`Ta bort ${bot.name}`}
                          onClick={() => botActions.removeBot(bot.id)}
                          className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg text-tant-vinrod hover:bg-tant-vinrod/10 max-[400px]:w-9', FOCUS)}
                        >
                          <Trash2 aria-hidden className="size-5" />
                        </button>
                      </>
                    ) : (
                      <span className="shrink-0 pr-2 text-sm font-bold">{BOT_LEVEL_NAMES[bot.level]}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {botActions && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  disabled={!canAddBot}
                  onClick={botActions.addBot}
                  className={cn(
                    'flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-tant-vinrod bg-white px-4 font-heading font-bold text-tant-vinrod hover:bg-[#fdeeee] disabled:border-tant-ink/30 disabled:text-tant-ink/45 disabled:hover:bg-white',
                    FOCUS,
                  )}
                >
                  <Plus aria-hidden className="size-5" />
                  Lägg till bot
                </button>
                <span className="text-sm font-semibold">Högst {MAX_BOTS} botar</span>
              </div>
            )}
          </div>

          {/* Extra bus: två brytare. */}
          <div className="min-w-0 sm:pl-5">
            <h3 className="text-xl text-tant-vinrod">Extra bus</h3>
            <div className="mt-1 divide-y-2 divide-tant-vinrod/20">
              <Brytare
                label="Tantsnaran"
                text="En fälla som slår igen när någon stjäl."
                icon={<Garnnystan className="size-10" />}
                on={settings.trap}
                disabled={locked}
                onChange={(trap) => onSettings({ trap })}
              />
              <Brytare
                label="Kasta saker"
                text="Tomater, pajer och annat bus."
                icon={<Emoji emoji="🍅" className="text-[2.1rem]" />}
                on={throwsAllowed}
                disabled={locked}
                onChange={onThrows}
              />
            </div>
          </div>
        </div>

        {/* Sammanfattningen med lacksigillet, och Starta matchen eller vem gästen väntar på. */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-tant-vinrod bg-white/60 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sigill className="size-14 shrink-0 sm:size-16" />
            <div className="min-w-0">
              <p className="font-heading text-lg leading-tight font-bold text-tant-vinrod sm:text-xl">{tantSummary(levelFor(chosen, players), players, bots.length)}</p>
              <p className="text-sm font-semibold sm:text-base">{tantExtrasLine(settings.trap, throwsAllowed)}</p>
            </div>
          </div>
          {isHost ? (
            <div className="shrink-0 space-y-1 sm:w-64">
              <button
                type="button"
                disabled={blockedText !== null || starting}
                onClick={onStart}
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 rounded-full bg-tant-vinrod font-heading text-xl font-bold text-tant-kram-2 shadow-[0_4px_0_var(--tant-vinrod-mork)] transition-transform hover:bg-[var(--tant-vinrod-mork)] active:translate-y-0.5 disabled:opacity-50 disabled:hover:bg-tant-vinrod disabled:active:translate-y-0',
                  FOCUS,
                )}
              >
                Starta matchen
                <ArrowRight aria-hidden className="size-5" />
              </button>
              <p role="status" className="text-center text-sm leading-snug font-semibold">
                {blockedText ?? 'Du är värd. Gästerna ser valen, men bara du kan ändra och starta.'}
              </p>
            </div>
          ) : (
            <p role="status" className="shrink-0 rounded-full border-2 border-dashed border-tant-vinrod px-5 py-3 text-center font-heading font-bold text-tant-vinrod">
              {waitingText}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// En brytare med rubrik, förklaring och ikon. Hela raden går att trycka på, och läget står också i ord (På eller Av).
function Brytare({ label, text, icon, on, disabled, onChange }: { label: string; text: string; icon: ReactNode; on: boolean; disabled: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn('flex min-h-16 w-full items-center gap-3 rounded-lg py-2 text-left', FOCUS)}
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg leading-tight font-bold">{label}</span>
        <span className="block text-sm leading-snug">{text}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          'relative flex h-9 w-[4.75rem] shrink-0 items-center rounded-full border-2 px-2.5 text-sm font-extrabold transition-colors',
          on ? 'justify-start border-tant-vinrod bg-tant-vinrod text-tant-kram-2' : 'justify-end border-tant-ink/50 bg-tant-ink/15 text-tant-ink',
          disabled && 'opacity-75',
        )}
      >
        {on ? 'På' : 'Av'}
        <span className={cn('absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-[left] duration-200', on ? 'left-[2.9rem]' : 'left-1')} />
      </span>
    </button>
  )
}

// Kaffekoppen som blir farligare: lugn med en blomma (Normal), ångande (Svår) och en smäll (Kaos). Bara dekoration.
function Kopp({ level, className }: { level: TantLevel; className?: string }) {
  if (level === 'kaos') {
    return (
      <svg aria-hidden viewBox="0 0 48 48" className={className}>
        <path
          d="M24 3l4.2 9.6L38 7.5l-2.4 10.3L46 20l-8.4 6.2L43 35.5l-10.4-1.3L31 45l-7-7.8L17 45l-1.6-10.8L5 35.5l5.4-9.3L2 20l10.4-2.2L10 7.5l9.8 5.1z"
          fill="#f6c343"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M24 16v9M24 30.5v.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {level === 'svar' && <path d="M17 13c-2.5-3 2.5-5 0-8M25 13c-2.5-3 2.5-5 0-8M33 13c-2.5-3 2.5-5 0-8" />}
      <path d="M9 19h28v8a12 12 0 0 1-12 12h-4A12 12 0 0 1 9 27z" fill="#fffdf8" />
      <path d="M37 22h3a5 5 0 0 1 0 10h-4.5" />
      <path d="M6 43h34" />
      {level === 'normal' ? (
        <g stroke="none" fill="currentColor">
          <circle cx="23" cy="25.5" r="2" />
          <circle cx="19.4" cy="28" r="2" />
          <circle cx="26.6" cy="28" r="2" />
          <circle cx="20.8" cy="32" r="2" />
          <circle cx="25.2" cy="32" r="2" />
          <circle cx="23" cy="29.3" r="1.7" fill="#f6c343" />
        </g>
      ) : (
        <path d="M13 23h20" strokeWidth="5" stroke="#5a3424" />
      )}
    </svg>
  )
}

// Garnnystanet med stickor, till Tantsnaran. Bara dekoration.
function Garnnystan({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className} fill="none" stroke="#6c1424" strokeWidth="2.2" strokeLinecap="round">
      <path d="M33 6l-9 16M40 9L27 22" />
      <circle cx="33.5" cy="5.5" r="2" fill="#6c1424" />
      <circle cx="40.5" cy="8.5" r="2" fill="#6c1424" />
      <circle cx="21" cy="28" r="15" fill="#e58b96" />
      <path d="M8 24c7-6 19-6 26 0M7 31c8-6 20-6 28 0M11 38c6-4 14-4 20 0M14 15c-3 8-3 18 0 25M22 13c-3 9-3 21 0 30M30 16c3 8 3 17 0 24" strokeWidth="1.7" />
      <path d="M33 39c4 3 8 3 11 0" />
    </svg>
  )
}

// Lacksigillet vid sammanfattningen: en vinröd, vågig rundel med en kopp. Bara dekoration.
function Sigill({ className }: { className?: string }) {
  const bumps = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    return { x: 32 + Math.cos(angle) * 21, y: 30 + Math.sin(angle) * 21 }
  })
  return (
    <svg aria-hidden viewBox="0 0 64 68" className={className}>
      <path d="M22 44l-5 20 9-5 6 8 6-8 9 5-5-20z" fill="#6c1424" />
      {bumps.map((bump, i) => (
        <circle key={i} cx={bump.x} cy={bump.y} r="7" fill="#8e1b30" />
      ))}
      <circle cx="32" cy="30" r="21" fill="#8e1b30" />
      <circle cx="32" cy="30" r="16" fill="none" stroke="#fff8ec" strokeWidth="1.6" opacity="0.7" />
      <g fill="none" stroke="#fff8ec" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 27h16v4a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" />
        <path d="M39 29h1.5a3 3 0 0 1 0 6H38" />
        <path d="M28 23c-1.5-1.8 1.5-3 0-5M34 23c-1.5-1.8 1.5-3 0-5" />
      </g>
    </svg>
  )
}
