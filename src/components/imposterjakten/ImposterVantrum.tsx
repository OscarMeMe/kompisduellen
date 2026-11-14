import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bot, ChevronDown, Crown, Plus } from 'lucide-react'
import { LobbyFigur } from '@/components/figurer/LobbyFigur'
import { ForberedFallet } from '@/components/imposterjakten/ForberedFallet'
import { ImposterMusik } from '@/components/imposterjakten/ImposterMusik'
import { ImposterRegler } from '@/components/imposterjakten/ImposterRegler'
import { Leaderboard } from '@/components/Leaderboard'
import { InviteCard } from '@/components/lobby/InviteCard'
import { AcceptThrowsChoice, ThrowBar, ThrowCounter } from '@/components/lobby/Kast'
import { Wide } from '@/components/lobby/LobbyLayout'
import { ReactionBar } from '@/components/lobby/Reactions'
import { VannSenast } from '@/components/lobby/VannSenast'
import { BytSpel, RematchCountdown } from '@/components/lobby/VantrumDelar'
import type { WaitingRoomProps } from '@/components/lobby/WaitingRoom'
import { SpelIkon } from '@/components/SpelIkon'
import { TantBotar } from '@/components/tantpanik/TantBotar'
import { Button } from '@/components/ui/button'
import { useGazeFollow } from '@/hooks/useGazeFollow'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { useReactions } from '@/hooks/useReactions'
import { canKeepScreenOn, hasFinePointer } from '@/lib/device'
import { findBlob, lookDirection, SLEEP_AFTER_MS } from '@/lib/figurer'
import { playersLabel } from '@/lib/games'
import { wordsRunningOutText } from '@/lib/imposterjakten'
import { caseSummary, IMPOSTER_LINE_MS, IMPOSTER_LOBBY_LINES, playersShortText, seatCount, seatPlaces, startBlockedText } from '@/lib/impostervantrum'
import { totalThrows } from '@/lib/kast'
import { loadSoundOn, playPop } from '@/lib/ljud'
import { rankLeaderboard, roundOptionsFor, tooManyPlayers } from '@/lib/match'
import { cn } from '@/lib/utils'

// Imposterjaktens väntrum i stilen Nattspanarna, som TantVantrum för Exploderande Tanter: det mörka mönstret över hela
// sidan, loggan med en replik i detektivstil, spelarna runt bordet under lampans ljus med lobbykoden som "Fall nr" mitt
// på bordet, inbjudan och spelet på krämvita papper, och spelets val i mappen "Förbered fallet" (ForberedFallet) med
// Starta jakten längst ned. Bara när Imposterjakten är valt. De andra spelen ser ut som förut.

const PATTERN = '/images/imposterjakten/monster-mork.webp'
const LOGO = '/images/imposterjakten/logga.webp'
const LOGO_SMALL = '/images/imposterjakten/logga-800.webp'

// Temat gäller hela sidan så länge väntrummet visas (även sidhuvudet, sidfoten och rutor som öppnas), och mönstret
// ligger som bakgrund. Allt tas bort när man byter spel, startar eller lämnar.
function useNattspanarna() {
  useEffect(() => {
    // På body och inte på html: sajtens egna färger står på :root och skulle annars gälla före temat.
    const root = document.body
    const body = document.body.style
    const before = { tema: root.dataset.tema, color: body.backgroundColor, image: body.backgroundImage, size: body.backgroundSize, repeat: body.backgroundRepeat }
    root.dataset.tema = 'nattspanarna'
    body.backgroundColor = 'var(--natt)'
    body.backgroundImage = `url(${PATTERN})`
    body.backgroundSize = '256px 256px'
    body.backgroundRepeat = 'repeat'
    return () => {
      if (before.tema === undefined) delete root.dataset.tema
      else root.dataset.tema = before.tema
      body.backgroundColor = before.color
      body.backgroundImage = before.image
      body.backgroundSize = before.size
      body.backgroundRepeat = before.repeat
    }
  }, [])
}

export function ImposterVantrum({
  code,
  game,
  state,
  isHost,
  meId,
  online,
  clockOffset,
  scrollToGames = false,
  onCancelRematch,
  onSetRounds,
  onSetGame,
  onSetThrowsAllowed,
  onSetImposterSettings,
  botActions,
  onStartCountdown,
}: WaitingRoomProps) {
  useNattspanarna()
  // Syns mappen med Starta jakten? När den inte gör det har värden en liten startknapp fast längst ned på mobil.
  const [folderSeen, setFolderSeen] = useState(true)
  useEffect(() => {
    const folder = document.getElementById('forbered-fallet')
    if (!folder || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setFolderSeen(entry.isIntersecting))
    observer.observe(folder)
    return () => observer.disconnect()
  }, [])

  // Botar kan inte spela Imposterjakten. De tittar på och räknas inte som spelare.
  const playing = online.filter((p) => !p.bot)
  const bots = online.filter((p) => p.bot)
  const tooMany = tooManyPlayers(state.game, playing.length)
  const rematching = state.rematchAt !== null
  const lobbyName = (player: OnlinePlayer) => state.players[player.id]?.name ?? player.name
  const hostPlayer = online.find((p) => p.host)
  const hostName = hostPlayer ? lobbyName(hostPlayer) : 'värden'
  const dressWearer = online.find((p) => p.id === state.dressId)
  const playersText = playersShortText(playing.length, game.minPlayers, tooMany, game.maxPlayers)
  const blockedText = startBlockedText(playing.length, game.minPlayers, tooMany)
  const waitingText = state.choosingGame ? `${hostName} väljer nästa spel…` : `Väntar på att ${hostName} startar`
  // Raden under bordet: hur många som är på plats och vad som händer härnäst.
  const tableStatus = blockedText
    ? `${playersText} ${isHost ? blockedText : 'Bjud in fler med koden.'}`
    : isHost
      ? 'Alla är på plats. Förbered fallet och starta jakten.'
      : waitingText

  return (
    <Wide className="max-w-5xl">
      <ImposterMusik level="lobby" />
      {state.rematchAt !== null && (
        <RematchCountdown
          at={state.rematchAt}
          kind={state.countdownKind}
          rule={game.quickRule ?? game.tagline}
          clockOffset={clockOffset}
          isHost={isHost}
          onCancel={onCancelRematch}
        />
      )}

      <Rubrik />

      {state.notice && (
        <p data-yta="papper" className="rounded-md bg-sun-soft px-3 py-2 text-center text-sm font-semibold text-foreground" role="status">
          {state.notice}
        </p>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Misstänkta" className="min-w-0">
          <Spaningsbord
            guests={[...playing, ...bots].map((p) => ({ id: p.id, name: lobbyName(p), avatar: p.avatar, host: p.host === true, bot: p.bot !== undefined, dress: p.id === state.dressId }))}
            meId={meId}
            code={code}
            playing={playing.length}
            playersLabel={playersLabel(game)}
            maxPlayers={game.maxPlayers ?? 10}
          />
          <h2 className="mt-1 text-center text-2xl">Misstänkta ({playing.length})</h2>
          <p role="status" className="mt-1 text-center font-semibold text-muted-foreground">
            {tableStatus}
          </p>
          {/* På dator ligger mappen långt under bordet, så värden har Starta jakten direkt här också (avstängd med
              förklaringen på raden ovanför när ni är för få). På mobil gäller den fasta knappen längst ned. */}
          {isHost && (
            <Button
              key={blockedText ? 'vantar' : 'redo'}
              size="lg"
              className={cn('mx-auto mt-3 hidden w-full max-w-xs text-lg lg:flex', !blockedText && 'motion-safe:animate-wiggle')}
              disabled={blockedText !== null || rematching}
              onClick={onStartCountdown}
            >
              Starta jakten
              <ArrowRight aria-hidden />
            </Button>
          )}
          {dressWearer && (
            <p data-yta="papper" className="mt-3 rounded-lg border-2 border-tant-guld-mork bg-sun-soft px-3 py-2.5 text-center text-sm leading-snug font-bold text-foreground">
              {lobbyName(dressWearer)} bär tantklänningen tills någon annan vinner. Den följer med i alla spel i lobbyn.
            </p>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <div data-yta="papper">
            <InviteCard code={code} game={game} />
          </div>

          {/* Spelet som är valt. Värden byter spel med Byt spel, som öppnar spelvalet mitt på skärmen. */}
          <section data-yta="papper" aria-label="Spel" className="space-y-3 rounded-lg border bg-background p-4 text-foreground shadow-soft">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center text-3xl sm:size-12 sm:text-4xl">
                <SpelIkon game={game} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[0.9375rem] leading-tight font-bold sm:text-lg">{game.name}</p>
                <p className="text-sm text-muted-foreground">{[playersLabel(game), game.feel].filter(Boolean).join(' · ')}</p>
              </div>
              {isHost && <BytSpel game={game} players={online.length} choosingGame={state.choosingGame} openAtStart={scrollToGames} onSetGame={onSetGame} className="px-3" />}
            </div>
            {/* Botar från ett annat spel: värden kan bara ta bort dem. */}
            {bots.length > 0 &&
              (isHost && botActions ? (
                <TantBotar
                  bots={bots.flatMap((p) => (p.bot ? [{ id: p.id, name: p.name, avatar: p.avatar, level: p.bot }] : []))}
                  canAdd={false}
                  canPlay={false}
                  gameName={game.name}
                  onAdd={botActions.addBot}
                  onRemove={botActions.removeBot}
                  onLevel={botActions.setBotLevel}
                />
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-center text-sm font-semibold text-muted-foreground">Botarna kan inte spela {game.name} än. De tittar på.</p>
              ))}
          </section>

          {/* Reaktioner och kast finns först när någon annan är med. */}
          {(online.length > 1 || (state.throwsAllowed && totalThrows(state.throwStats) > 0)) && (
            <section aria-label="Reaktioner och kast" className="min-w-0 space-y-3 rounded-lg border bg-card p-4 shadow-soft">
              <ReactionBar />
              {state.throwsAllowed && online.length > 1 && <ThrowBar />}
              {state.throwsAllowed && <ThrowCounter stats={state.throwStats} />}
              {state.throwsAllowed && online.length > 1 && <AcceptThrowsChoice />}
            </section>
          )}
        </div>
      </div>

      <ForberedFallet
        isHost={isHost}
        hostName={hostName}
        settings={state.imposterSettings}
        rounds={state.rounds}
        roundOptions={roundOptionsFor(state.game)}
        throwsAllowed={state.throwsAllowed}
        wordsWarning={wordsRunningOutText(state.imposterSettings, state.rounds, state.usedWordIds)}
        playersText={playersText}
        blockedText={blockedText}
        starting={rematching}
        waitingText={waitingText}
        onSettings={onSetImposterSettings}
        onRounds={onSetRounds}
        onThrows={onSetThrowsAllowed}
        onStart={onStartCountdown}
      >
        {/* Telefoner som inte kan hålla skärmen tänd själva (se useWakeLock) får ett tips. */}
        {isHost && !blockedText && !canKeepScreenOn() && !hasFinePointer() && (
          <p className="mt-2 text-center text-sm text-muted-foreground">Håll skärmen tänd under matchen, annars stannar spelet.</p>
        )}
      </ForberedFallet>

      <div data-yta="papper">
        <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />
      </div>

      {/* Så spelas det: samma steg som i rutan "Så spelar man" på startsidan, på ett krämvitt papper. Hopfällt för alla. */}
      <details data-yta="papper" className="group rounded-lg border-2 border-[var(--natt)] bg-background px-4 text-foreground shadow-[0_8px_22px_rgb(0_0_0/0.4)] sm:px-6">
        <summary className="-mx-4 flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 font-heading text-xl font-bold sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
          Så spelas det
          <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-5">
          {game.intro && <p className="mb-4 text-lg leading-snug font-semibold text-balance">{game.intro.pitch}</p>}
          <ImposterRegler />
        </div>
      </details>

      {/* På mobil ligger mappen långt ned. När den inte syns har värden en liten startknapp fast längst ned på skärmen,
          med samma sammanfattning och samma spärr som i mappen. Raden tar plats i sidan, så att den aldrig täcker
          sidans sista rader. */}
      {isHost && !folderSeen && (
        <>
          <div aria-hidden className="h-16 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[color-mix(in_oklch,var(--natt)_94%,transparent)] px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-sm motion-safe:animate-fade lg:hidden">
            <div className="mx-auto flex max-w-md items-center gap-3">
              <p className="min-w-0 flex-1 text-sm leading-tight font-semibold">
                <span className="block truncate">{caseSummary(state.imposterSettings, state.rounds)}</span>
                {blockedText && <span className="block truncate text-muted-foreground">{playersText}</span>}
              </p>
              <Button className="h-12 shrink-0 px-4" disabled={blockedText !== null || rematching} onClick={onStartCountdown}>
                Starta jakten
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </Wide>
  )
}

// Loggan centrerad, med en replik i detektivstil under som byts var sjätte sekund. Replikerna är dolda för skärmläsare,
// som annars skulle läsa upp en ny med jämna mellanrum.
function Rubrik() {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setLine((n) => (n + 1) % IMPOSTER_LOBBY_LINES.length), IMPOSTER_LINE_MS)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="w-full">
        <img
          src={LOGO}
          srcSet={`${LOGO_SMALL} 800w, ${LOGO} 1400w`}
          sizes="(max-width: 640px) 80vw, 460px"
          width={1400}
          height={429}
          alt="Imposterjakten"
          className="mx-auto h-auto w-[min(80%,28rem)] drop-shadow-[0_4px_10px_rgb(0_0_0/0.5)]"
        />
      </h1>
      <p key={line} aria-hidden className="flex min-h-12 items-center text-base leading-snug font-semibold text-muted-foreground italic motion-safe:animate-fade sm:min-h-7 sm:text-lg">
        {IMPOSTER_LOBBY_LINES[line]}
      </p>
    </div>
  )
}

type Guest = { id: string; name: string; avatar: string; host: boolean; bot: boolean; dress: boolean }

// Bordet under lampans ljus, sett ovanifrån som på spelplanen: jag sitter längst ned och de andra medurs, värden har
// kronan, lediga platser är streckade ringar och lobbykoden står mitt på bordet som fallets nummer. Den som går med
// hoppar in med ett litet ljud. Botar tittar på (gråa). Figurerna krymper när många är med, så att alla får plats.
function Spaningsbord({ guests: all, meId, code, playing, playersLabel: label, maxPlayers }: { guests: Guest[]; meId: string; code: string; playing: number; playersLabel: string; maxPlayers: number }) {
  const guests = [...all.filter((guest) => guest.id === meId), ...all.filter((guest) => guest.id !== meId)]
  const count = seatCount(guests.length, maxPlayers)
  const places = seatPlaces(count)
  const reactions = useReactions()
  const soundOn = reactions ? reactions.soundOn : loadSoundOn()
  const rootRef = useRef<HTMLDivElement>(null)
  const gaze = useGazeFollow(rootRef)
  // Som i de andra väntrummen (LobbyPlayers): Sjusovaren somnar när inget har hänt på SLEEP_AFTER_MS (ingen har gått med,
  // lämnat, reagerat eller kastat) och vaknar så fort något händer, och Ögat tittar mot den som nyss reagerade eller kastade.
  const latest = reactions?.floating.at(-1)
  const hits = Object.entries(reactions?.throws.hits ?? {}).map(([id, n]) => `${id}:${n}`).join()
  const happening = `${guests.map((guest) => guest.id).join()}|${latest?.key ?? ''}|${hits}`
  const [quietSince, setQuietSince] = useState<string | null>(null)
  const asleep = quietSince === happening
  useEffect(() => {
    const timer = setTimeout(() => setQuietSince(happening), SLEEP_AFTER_MS)
    return () => clearTimeout(timer)
  }, [happening])
  const lookAt = latest?.from ? guests.findIndex((guest) => guest.id === latest.from) : -1
  // De som redan satt vid bordet när det visades hoppar inte in.
  const seen = useRef(new Set(guests.map((guest) => guest.id)))
  const [arrived, setArrived] = useState<string[]>([])
  const ids = guests.map((guest) => guest.id).join()
  useEffect(() => {
    const fresh = guests.filter((guest) => !seen.current.has(guest.id)).map((guest) => guest.id)
    if (fresh.length === 0) return
    for (const id of fresh) seen.current.add(id)
    setArrived(fresh)
    if (soundOn) playPop()
    // Bara när någon ny sätter sig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])
  // Figurens storlek följer bordets bredd, och är mindre när många sitter runt det.
  // På mobil är bordet ovalt på höjden när många sitter runt det (från sju platser), så att ringen blir längre och
  // figurerna kan vara större.
  const tall = count >= 7
  const figure =
    count <= 6
      ? 'text-[min(17cqw,5rem)]'
      : count <= 8
        ? 'text-[min(14cqw,4.25rem)] max-sm:text-[min(17cqw,4.25rem)]'
        : 'text-[min(11.5cqw,3.75rem)] max-sm:text-[min(15cqw,3.75rem)]'

  return (
    <div ref={rootRef} className={cn('relative mx-auto mt-2 mb-5 aspect-[1/0.92] w-full max-w-[34rem] [container-type:inline-size]', tall && 'max-sm:aspect-[1/1.32]')}>
      {/* Lampan hänger utanför bild. Bara ljuset syns. */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-[12%] -top-[10%] h-[112%] bg-[radial-gradient(ellipse_closest_side_at_50%_42%,color-mix(in_oklch,var(--natt-lampa)_30%,transparent),color-mix(in_oklch,var(--natt-lampa)_10%,transparent)_60%,transparent_100%)]" />
      <div
        data-yta="papper"
        className="absolute inset-x-[23%] inset-y-[25%] flex flex-col items-center justify-center rounded-[50%] border-[5px] border-wood-edge bg-[radial-gradient(ellipse_at_50%_36%,#fff3d2_0%,#f1dcae_48%,#d9bd86_100%)] px-[6%] text-center text-foreground shadow-[0_0_0_3px_var(--chair),0_14px_30px_rgb(0_0_0/0.5),0_0_70px_22px_color-mix(in_oklch,var(--natt-lampa)_20%,transparent)] sm:border-[7px]"
      >
        <p className="text-[min(2.9cqw,0.875rem)] font-extrabold tracking-[0.12em] uppercase opacity-70">Fall nr</p>
        <p className="font-heading text-[min(10.5cqw,3.5rem)] leading-none font-bold tracking-[0.1em]" aria-label={`Lobbykod ${code.split('').join(' ')}`}>
          {code}
        </p>
        <p className="mt-[1cqw] text-[min(3.1cqw,0.9375rem)] leading-tight font-bold opacity-75">
          {playing} på plats · {label}
        </p>
      </div>

      {places.map((place, i) => {
        const guest = guests[i]
        return (
          <div
            key={guest?.id ?? `ledig-${i}`}
            className="absolute flex w-[24cqw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[0.4cqw]"
            style={{ left: `${place.x}%`, top: `${place.y}%` }}
          >
            {guest ? (
              <>
                <span
                  data-gaze={findBlob(guest.avatar) ? '' : undefined}
                  className={cn(
                    'relative block leading-none drop-shadow-[0_4px_5px_rgb(0_0_0/0.5)]',
                    figure,
                    guest.bot && 'opacity-55 grayscale-[0.4]',
                    arrived.includes(guest.id) && 'motion-safe:animate-hop',
                  )}
                >
                  <LobbyFigur playerId={guest.id} avatar={guest.avatar} delay={i * 0.7} asleep={asleep} look={lookDirection(i, lookAt)} gaze={gaze} dress={guest.dress} className="block" />
                  {guest.host && (
                    <span className="absolute -top-[0.15em] -right-[0.2em] flex size-[0.42em] min-h-5 min-w-5 items-center justify-center rounded-full border border-border bg-card">
                      <Crown className="size-[62%] text-crown" aria-label="Värd" />
                    </span>
                  )}
                  {guest.bot && (
                    <span className="absolute -top-[0.15em] -left-[0.2em] flex size-[0.42em] min-h-5 min-w-5 items-center justify-center rounded-full border border-border bg-card">
                      <Bot className="size-[62%]" aria-label="Bot" />
                    </span>
                  )}
                </span>
                <span
                  title={guest.name}
                  className={cn(
                    'max-w-full truncate rounded-full border px-[1.8cqw] text-[min(3.3cqw,0.9375rem)] leading-[1.5] font-bold',
                    guest.id === meId ? 'border-[var(--natt)] bg-[var(--natt-lampa)] text-[var(--natt)]' : 'border-border bg-card',
                  )}
                >
                  {guest.name}
                  {guest.id === meId && <span className="font-extrabold"> (du)</span>}
                </span>
                {guest.bot && <span className="text-[min(2.8cqw,0.75rem)] font-semibold text-muted-foreground">tittar på</span>}
                {guest.dress && <VannSenast />}
              </>
            ) : (
              <>
                <span className={cn('flex items-center justify-center leading-none', figure)}>
                  <span className="flex size-[0.82em] items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/60 text-muted-foreground">
                    <Plus aria-hidden className="size-[40%]" />
                  </span>
                </span>
                <span className="text-[min(3cqw,0.8125rem)] leading-tight font-semibold text-muted-foreground">Ledig plats</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
