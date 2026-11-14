import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Brain, Crosshair, Eye, Search, VenetianMask, type LucideIcon } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { ImposterMusik } from '@/components/imposterjakten/ImposterMusik'
import { findBlob } from '@/lib/figurer'
import type { ImposterRound } from '@/lib/imposterjakten'
import { imposterAwards, imposterStats, imposterStatsLine, outcomeText, winnerLine, type ImposterAward, type ImposterAwardId } from '@/lib/imposterslut'
import { matchParticipants, matchWinners, rankPlayers, type GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

const PATTERN = '/images/imposterjakten/monster-mork.webp'
const LOGO = '/images/imposterjakten/logga-800.webp'
const FOLDER = '/images/imposterjakten/fallet-avslutat-720.webp'
const FOLDER_LARGE = '/images/imposterjakten/fallet-avslutat.webp'
// Mönstret räknas från skärmens nedre vänstra hörn, både på sidan och på raden med knapparna längst ner, så att det
// fortsätter utan skarv bakom knapparna.
const PATTERN_STYLE: CSSProperties = { backgroundImage: `url(${PATTERN})`, backgroundSize: '256px 256px', backgroundPosition: 'left bottom' }

// När varje del kommer fram (ms): mappen landar på bordet, lampan tänds på vinnaren, namnskylten, de andra en i taget,
// akten, utmärkelserna, siffrorna och sist knapparna.
const AT = { folder: 150, winner: 900, name: 1350, rest: 1700, restStep: 180, file: 2400, award: 2900, awardStep: 220, stats: 3600, buttons: 3900 }
// På mobil visas så här många omgångar i akten, med resten bakom ett tryck.
const ROUNDS_ON_MOBILE = 3

// Imposterjaktens slutskärm "Fallet avslutat", i stilen Nattspanarna: mappen med stämpeln landar på bordet, vinnaren står
// under lampan med kronan, de andra står som rader i utredningen, omgångarna står som en akt (ordet, impostern och hur
// det gick), och under dem utmärkelserna som någon faktiskt fått och matchens siffror. Revansch och Byt spel ligger fast
// längst ner. Ett tryck var som helst hoppar över animationen. Med "minska rörelse" syns allt direkt.
export function ImposterSlutskarm({
  state,
  meId,
  actions,
  leaderboard,
}: {
  state: GameState
  meId: string
  // Knapparna längst ner (värdens val eller gästens önskemål), och Lämna lobby.
  actions: ReactNode
  // Kvällens ställning, under det andra.
  leaderboard: ReactNode
}) {
  const [skipped, setSkipped] = useState(false)
  const [allRounds, setAllRounds] = useState(false)
  // Knapparnas höjd, så att innehållet får lika mycket luft nedtill.
  const buttonsRef = useRef<HTMLDivElement>(null)
  const [buttonsHeight, setButtonsHeight] = useState(160)
  useLayoutEffect(() => {
    const element = buttonsRef.current
    if (!element) return
    const measure = () => setButtonsHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const reduced = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const still = skipped || reduced
  // En del som kommer fram: rörelsen (med "minska rörelse" ingen) och när den börjar. Överhoppad: allt på plats direkt.
  const enter = (animation: string, at: number): { className: string; style?: CSSProperties } =>
    still ? { className: '' } : { className: animation, style: { animationDelay: `${at}ms` } }

  const history = state.imposterMatch.history ?? []
  const ranked = rankPlayers(state)
  const winners = matchWinners(state)
  const rest = ranked.filter((player) => !winners.includes(player.id))
  const awards = imposterAwards(history, matchParticipants(state))
  const name = (id: string) => (id === meId ? 'Du' : (state.players[id]?.name ?? 'Någon'))
  const topScore = ranked[0]?.score ?? 0
  // Två kolumner så fort de är fler än en, så att akten och utmärkelserna får plats utan att skrolla.
  const many = rest.length > 1
  const hiddenRounds = Math.max(0, history.length - ROUNDS_ON_MOBILE)

  return (
    <div
      data-tema="nattspanarna"
      data-spel="imposterjakten"
      className="fixed inset-0 z-10 overflow-y-auto bg-background bg-repeat text-foreground"
      style={PATTERN_STYLE}
      onClick={() => setSkipped(true)}
    >
      {/* Väntrummets musik fortsätter på slutskärmen. */}
      <ImposterMusik level="lobby" />
      {/* Luft nedtill lika hög som knapparna som ligger fast längst ner, så att Kvällens ställning går att skrolla fram helt. */}
      <div
        className="relative mx-auto flex min-h-full max-w-md flex-col items-center px-4 pt-[max(0.625rem,env(safe-area-inset-top))]"
        style={{ paddingBottom: buttonsHeight + 16 }}
      >
        <img src={LOGO} alt="Imposterjakten" width={800} height={245} style={enter('motion-safe:animate-slut-fade', 0).style} className={cn('h-7 w-auto short:h-5', enter('motion-safe:animate-slut-fade', 0).className)} />

        {/* Mappen med stämpeln landar på bordet. Texten står i bilden, så rubriken är bara för skärmläsare. */}
        <h1 className="sr-only">Fallet avslutat</h1>
        <img
          src={FOLDER}
          srcSet={`${FOLDER} 720w, ${FOLDER_LARGE} 1200w`}
          sizes="(max-height: 860px) 150px, 210px"
          alt=""
          width={720}
          height={513}
          style={enter('motion-safe:animate-mapp-landar', AT.folder).style}
          className={cn('mt-1 h-auto w-52 -rotate-3 drop-shadow-[0_10px_14px_rgb(0_0_0/0.55)] short:w-32 tiny:w-28', enter('motion-safe:animate-mapp-landar', AT.folder).className)}
        />

        {/* Vinnaren under lampan, med kronan och namnskylten. Vid delad seger står de bredvid varandra under samma lampa. */}
        {winners.length > 0 ? (
          <div className="relative mt-1 flex w-full flex-col items-center">
            {/* Lampans ljuskägla. Lampan hänger utanför bild. */}
            <div
              aria-hidden
              style={enter('motion-safe:animate-slut-fade', AT.winner - 150).style}
              className={cn(
                'pointer-events-none absolute -top-6 bottom-2 left-1/2 w-72 -translate-x-1/2 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--natt-lampa)_10%,transparent),color-mix(in_oklch,var(--natt-lampa)_42%,transparent))] [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]',
                enter('motion-safe:animate-slut-fade', AT.winner - 150).className,
              )}
            />
            <div style={enter('motion-safe:animate-slut-pop', AT.winner).style} className={cn('relative flex items-end justify-center gap-1', enter('motion-safe:animate-slut-pop', AT.winner).className)}>
              {winners.slice(0, 4).map((id) => (
                <span key={id} className="flex flex-col items-center">
                  <WinnerFigure avatar={state.players[id]?.avatar ?? ''} label={`${name(id)} vinner, med krona`} small={winners.length > 1} />
                  {winners.length > 1 && (
                    <span className="-mt-1 max-w-24 truncate rounded-md border-2 border-[var(--natt)] bg-[var(--natt-kram)] px-2 font-heading text-sm font-bold text-[var(--natt)]">{name(id)}</span>
                  )}
                </span>
              ))}
            </div>
            <div style={enter('motion-safe:animate-slut-pop', AT.name).style} className={cn('relative -mt-1 flex flex-col items-center', enter('motion-safe:animate-slut-pop', AT.name).className)}>
              {winners.length === 1 && (
                <p className="max-w-64 truncate rounded-[10px] border-[3px] border-[var(--natt)] bg-[var(--natt-kram)] px-5 py-0.5 font-heading text-2xl font-bold text-[var(--natt)] shadow-[0_3px_0_var(--natt-lampa)] short:text-xl">
                  {name(winners[0])}
                </p>
              )}
              <p className="mt-1.5 text-center text-sm font-extrabold text-[var(--natt-lampa)] short:mt-1 short:text-[13px]">{winnerLine(history, winners, topScore)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center font-heading text-xl font-bold">Ingen fick poäng den här gången.</p>
        )}

        {/* De andra, som rader i utredningen, med poängen till höger. */}
        {rest.length > 0 && (
          <ul className={cn('mt-4 grid w-full gap-1.5 short:mt-2.5 short:gap-1', many && 'grid-cols-2')} aria-label="De andra spelarna">
            {rest.map((player, i) => (
              <li
                key={player.id}
                style={enter('motion-safe:animate-slut-up', AT.rest + i * AT.restStep).style}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card py-1 pr-3 pl-2 short:py-0.5',
                  enter('motion-safe:animate-slut-up', AT.rest + i * AT.restStep).className,
                )}
              >
                <Emoji emoji={player.avatar} className={cn('shrink-0', many ? 'text-2xl' : 'text-3xl short:text-2xl')} />
                <span className={cn('min-w-0 flex-1 truncate font-heading font-bold', many ? 'text-base' : 'text-lg short:text-base')}>{name(player.id)}</span>
                <span className="shrink-0 font-heading text-base font-bold text-muted-foreground tabular-nums">{player.score} p</span>
              </li>
            ))}
          </ul>
        )}

        {/* Akten: en rad per omgång med ordet, impostern och hur det gick. På mobil de tre senaste, resten bakom ett tryck. */}
        {history.length > 0 && (
          <section
            data-yta="papper"
            aria-label="Akten: omgångarna"
            style={enter('motion-safe:animate-slut-up', AT.file).style}
            className={cn('mt-3 w-full rounded-lg border-2 border-[var(--natt)] bg-background px-3 py-2 text-foreground shadow-[0_3px_0_rgb(0_0_0/0.4)] short:mt-2', enter('motion-safe:animate-slut-up', AT.file).className)}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base">Akten</h2>
            <ol className="mt-1 space-y-0.5">
              {history.map((round, i) => (
                <RoundRow key={i} n={i + 1} round={round} imposter={name(round.imposter)} hiddenOnMobile={!allRounds && i < hiddenRounds} />
              ))}
            </ol>
            {hiddenRounds > 0 && !allRounds && (
              <button type="button" className="mt-1 min-h-9 text-sm font-bold underline underline-offset-4 sm:hidden" onClick={() => setAllRounds(true)}>
                Visa alla {history.length} omgångar
              </button>
            )}
          </section>
        )}

        {/* Utmärkelserna, bara de som någon fått, som brickor bredvid varandra. */}
        {awards.length > 0 && (
          <ul className={cn('mt-3 grid w-full gap-2 short:mt-2', awards.length === 1 ? 'grid-cols-1' : awards.length === 2 ? 'grid-cols-2' : 'grid-cols-3')} aria-label="Utmärkelser">
            {awards.map((award, i) => (
              <AwardTile
                key={award.id}
                award={award}
                who={award.ids.map(name)}
                style={enter('motion-safe:animate-slut-flip', AT.award + i * AT.awardStep).style}
                className={enter('motion-safe:animate-slut-flip', AT.award + i * AT.awardStep).className}
              />
            ))}
          </ul>
        )}

        {history.length > 0 && (
          <p style={enter('motion-safe:animate-slut-fade', AT.stats).style} className={cn('mt-2.5 text-center text-sm font-extrabold text-muted-foreground short:mt-1.5 short:text-[13px]', enter('motion-safe:animate-slut-fade', AT.stats).className)}>
            {imposterStatsLine(imposterStats(history))}
          </p>
        )}

        <div data-yta="papper" className="mt-8 w-full text-foreground" onClick={(event) => event.stopPropagation()}>
          {leaderboard}
        </div>
      </div>

      {/* Revansch och Byt spel ligger alltid fast längst ner, och tonas in sist. Raden har samma mönster som sidan, så att
          mönstret går ända ned, och det som skrollas tonas bort under radens överkant. */}
      <div
        ref={buttonsRef}
        style={{ ...PATTERN_STYLE, ...enter('motion-safe:animate-slut-fade', AT.buttons).style }}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 bg-background bg-repeat [mask-image:linear-gradient(to_bottom,transparent,black_1rem)] px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] short:pt-4 short:pb-[max(0.375rem,env(safe-area-inset-bottom))]',
          enter('motion-safe:animate-slut-fade', AT.buttons).className,
        )}
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-1.5">{actions}</div>
      </div>
    </div>
  )
}

// En omgång i akten: "1 · Paraply · Lisa · kom undan".
function RoundRow({ n, round, imposter, hiddenOnMobile }: { n: number; round: ImposterRound; imposter: string; hiddenOnMobile: boolean }) {
  const escaped = round.kind === 'undan'
  return (
    <li className={cn('flex items-baseline gap-2 text-sm leading-snug', hiddenOnMobile && 'max-sm:hidden')}>
      <span className="w-4 shrink-0 text-right font-heading font-bold text-muted-foreground tabular-nums">{n}</span>
      <span className="min-w-0 flex-1">
        <strong className="font-heading">{round.word}</strong>
        <span className="text-muted-foreground"> · </span>
        {imposter}
        <span className="text-muted-foreground"> · </span>
        <span className={cn('font-semibold', escaped && 'text-primary')}>{outcomeText(round)}</span>
      </span>
    </li>
  )
}

// Knapparna på slutskärmen, i spelets stil: Revansch lampgul, Byt spel mörk med krämvit kant.
export function ImposterSlutKnapp({ children, primary = false, ...props }: { children: ReactNode; primary?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'h-[3.375rem] min-w-0 flex-1 rounded-2xl border-[3px] font-heading text-xl font-bold transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 short:h-12',
        primary
          ? 'flex-[1.25] border-[var(--natt)] bg-[var(--natt-lampa)] text-[1.375rem] text-[var(--natt)] shadow-[0_4px_0_var(--natt-kram)]'
          : 'border-[var(--natt-kram)] bg-[var(--natt-2)] text-[var(--natt-kram)] shadow-[0_4px_0_rgb(0_0_0/0.45)]',
        props.className,
      )}
    >
      {children}
    </button>
  )
}

// Vinnarens figur: minen vann och kronan. En emoji-figur visas som den är.
function WinnerFigure({ avatar, label, small }: { avatar: string; label: string; small: boolean }) {
  const blob = findBlob(avatar)
  const size = small ? 'text-[4.6rem] short:text-[3.6rem]' : 'text-[7rem] short:text-[4.6rem]'
  if (!blob) return <Emoji emoji={avatar} className={size} />
  return (
    <span role="img" aria-label={label}>
      <Figur figure={blob} mood="vann" crown className={size} />
    </span>
  )
}

const AWARD_ICONS: Record<ImposterAwardId, LucideIcon> = {
  bluffare: VenetianMask,
  sparhund: Search,
  syndabock: Crosshair,
  tankelasare: Brain,
  blaogd: Eye,
}

// En utmärkelse som en liten bricka: symbol, titel, vem och vad.
function AwardTile({ award, who, className, style }: { award: ImposterAward; who: string[]; className: string; style?: CSSProperties }) {
  const Icon = AWARD_ICONS[award.id]
  return (
    <li
      className={cn(
        'flex min-w-0 flex-col items-center gap-0.5 rounded-[14px] border-2 border-[var(--natt-lampa)] bg-card px-1 pt-2 pb-1.5 text-center shadow-[0_2px_0_color-mix(in_oklch,var(--natt-lampa)_55%,black)] short:gap-0 short:pt-1 short:pb-1',
        className,
      )}
      style={style}
    >
      <Icon aria-hidden className="size-7 text-[var(--natt-lampa)] short:size-5" strokeWidth={2.2} />
      <span className="font-heading text-sm leading-tight font-bold short:text-[11px]">{award.title}</span>
      {/* Delade utmärkelser radbryts mellan namnen, aldrig mitt i ett namn, så att alla syns. */}
      <span className="max-w-full text-[13px] leading-tight font-extrabold break-words text-[var(--natt-lampa)] short:text-[11px] short:leading-[1.15]">
        {who.map((one, i) => (
          <span key={i}>
            <span className="whitespace-nowrap">{one}</span>
            {i < who.length - 2 ? ', ' : i === who.length - 2 ? ' och ' : ''}
          </span>
        ))}
      </span>
      <span className="mt-auto text-[11.5px] font-bold text-muted-foreground">{award.what}</span>
    </li>
  )
}
