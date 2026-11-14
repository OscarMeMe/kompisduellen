import { useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Brain, Crosshair, Eye, Search, VenetianMask, type LucideIcon } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Figur } from '@/components/figurer/Figur'
import { ImposterMusik } from '@/components/imposterjakten/ImposterMusik'
import { useButtonsBelowContent } from '@/hooks/useButtonsBelowContent'
import { findBlob } from '@/lib/figurer'
import type { ImposterRound } from '@/lib/imposterjakten'
import { imposterAwards, imposterStats, imposterStatsLine, outcomeText, winnerLine, type ImposterAward, type ImposterAwardId } from '@/lib/imposterslut'
import { matchParticipants, matchWinners, rankPlayers, type GameState } from '@/lib/match'
import { ordinal } from '@/lib/tantslut'
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
// det gick), och under dem utmärkelserna som någon faktiskt fått och matchens siffror. Revansch och Byt spel ligger
// direkt under innehållet när allt får plats på skärmen, annars fast längst ner. Ett tryck var som helst hoppar över animationen. Med "minska rörelse" syns allt direkt.
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
  // Knapparna ligger direkt under innehållet när allt får plats på skärmen, annars fast längst ned.
  const { mainRef, buttonsRef, buttonsHeight, inline } = useButtonsBelowContent()
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
  // Placeringen: lika poäng ger samma placering.
  const place = (score: number) => 1 + ranked.filter((player) => player.score > score).length
  // Två kolumner på bredare skärm när de andra är många.
  const many = rest.length > 3
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
      {/* Ligger knapparna fast längst ner får sidan lika mycket luft nedtill, så att Kvällens ställning går att skrolla fram helt. */}
      <div
        className="relative mx-auto flex min-h-full max-w-md flex-col items-center px-4 pt-[max(0.625rem,env(safe-area-inset-top))] lg:max-w-2xl"
        style={{ paddingBottom: inline ? 24 : buttonsHeight + 16 }}
      >
       <div ref={mainRef} className="flex w-full flex-col items-center">
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

        {/* De andra, som tydliga rader: placeringen, figuren, namnet och poängen utskriven. */}
        {rest.length > 0 && (
          <ul className={cn('mt-4 grid w-full gap-1.5 short:mt-2.5 short:gap-1', many && 'sm:grid-cols-2')} aria-label="De andra spelarna">
            {rest.map((player, i) => (
              <li
                key={player.id}
                style={enter('motion-safe:animate-slut-up', AT.rest + i * AT.restStep).style}
                className={cn(
                  'flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pr-3.5 pl-3 short:py-1',
                  enter('motion-safe:animate-slut-up', AT.rest + i * AT.restStep).className,
                )}
              >
                <span className="w-9 shrink-0 font-heading text-lg font-bold text-[var(--natt-lampa)] tabular-nums lg:text-xl">{ordinal(place(player.score))}</span>
                <Emoji emoji={player.avatar} className="shrink-0 text-3xl short:text-2xl lg:text-4xl" />
                <span className="min-w-0 flex-1 truncate font-heading text-lg font-bold lg:text-xl">{name(player.id)}</span>
                <span className="shrink-0 font-heading text-base font-bold whitespace-nowrap tabular-nums lg:text-lg">
                  {player.score} poäng
                </span>
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
            className={cn('mt-3 w-full rounded-lg border-2 border-[var(--natt)] bg-background px-3 py-2 text-foreground shadow-[0_3px_0_rgb(0_0_0/0.4)] short:mt-2 lg:px-5 lg:py-3.5', enter('motion-safe:animate-slut-up', AT.file).className)}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base lg:text-xl">Akten</h2>
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

        {/* Utmärkelserna, bara de som någon fått: under varandra på smal mobil (så att namn och text inte bryts), och som
            brickor bredvid varandra på bredare skärm. */}
        {awards.length > 0 && (
          <ul className={cn('mt-3 grid w-full gap-2 short:mt-2', awards.length === 1 ? 'sm:mx-auto sm:max-w-xs' : awards.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')} aria-label="Utmärkelser">
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
          <p style={enter('motion-safe:animate-slut-fade', AT.stats).style} className={cn('mt-2.5 text-center text-sm font-extrabold text-muted-foreground short:mt-1.5 short:text-[13px] lg:mt-4 lg:text-lg', enter('motion-safe:animate-slut-fade', AT.stats).className)}>
            {imposterStatsLine(imposterStats(history))}
          </p>
        )}

       </div>

        {/* Får allt plats på skärmen ligger knapparna direkt under innehållet. */}
        {inline && (
          <div
            ref={buttonsRef}
            style={enter('motion-safe:animate-slut-fade', AT.buttons).style}
            onClick={(event) => event.stopPropagation()}
            className={cn('mt-5 flex w-full max-w-md flex-col items-center gap-1.5', enter('motion-safe:animate-slut-fade', AT.buttons).className)}
          >
            {actions}
          </div>
        )}

        {/* Kvällens ställning i spelets stil: krämvitt papper med lampgul kant. */}
        <div
          data-yta="papper"
          className="mt-8 w-full max-w-md text-foreground [&>section]:border-[3px] [&>section]:border-[var(--natt-lampa)] [&>section]:shadow-[0_4px_0_color-mix(in_oklch,var(--natt-lampa)_45%,black)]"
          onClick={(event) => event.stopPropagation()}
        >
          {leaderboard}
        </div>
      </div>

      {/* Annars ligger Revansch och Byt spel fast längst ner, och tonas in sist. Raden har samma mönster som sidan, så att
          mönstret går ända ned, och det som skrollas tonas bort under radens överkant. */}
      {!inline && (
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
      )}
    </div>
  )
}

// En omgång i akten: "1 · Paraply · Lisa · kom undan".
function RoundRow({ n, round, imposter, hiddenOnMobile }: { n: number; round: ImposterRound; imposter: string; hiddenOnMobile: boolean }) {
  const escaped = round.kind === 'undan'
  return (
    <li className={cn('flex items-baseline gap-2 text-sm leading-snug lg:text-lg', hiddenOnMobile && 'max-sm:hidden')}>
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

// En utmärkelse som en bricka: symbol, titel, vem och vad. På smal mobil ligger den på en rad med symbolen till vänster,
// så att namn och text får hela bredden.
function AwardTile({ award, who, className, style }: { award: ImposterAward; who: string[]; className: string; style?: CSSProperties }) {
  const Icon = AWARD_ICONS[award.id]
  return (
    <li
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-[14px] border-2 border-[var(--natt-lampa)] bg-card px-3 py-2 shadow-[0_2px_0_color-mix(in_oklch,var(--natt-lampa)_55%,black)] short:py-1.5 sm:flex-col sm:gap-0.5 sm:px-2 sm:pt-2.5 sm:pb-2 sm:text-center lg:px-3 lg:pt-3.5 lg:pb-3',
        className,
      )}
      style={style}
    >
      <Icon aria-hidden className="size-8 shrink-0 text-[var(--natt-lampa)] short:size-6 lg:size-9" strokeWidth={2.2} />
      <span className="flex min-w-0 flex-1 flex-col sm:flex-none sm:items-center">
        <span className="font-heading text-base leading-tight font-bold lg:text-lg">{award.title}</span>
        {/* Delade utmärkelser radbryts mellan namnen, aldrig mitt i ett namn, så att alla syns. */}
        <span className="max-w-full text-sm leading-tight font-extrabold text-[var(--natt-lampa)] lg:text-base">
          {who.map((one, i) => (
            <span key={i}>
              <span className="whitespace-nowrap">{one}</span>
              {i < who.length - 2 ? ', ' : i === who.length - 2 ? ' och ' : ''}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 text-right text-[13px] font-bold text-muted-foreground sm:mt-auto sm:text-center lg:text-[15px]">{award.what}</span>
    </li>
  )
}
