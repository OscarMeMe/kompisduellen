import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Leaderboard } from '@/components/Leaderboard'
import { InviteCard } from '@/components/lobby/InviteCard'
import { Choice, NextQuestionChoice } from '@/components/lobby/Choice'
import { LobbyHeader } from '@/components/lobby/LobbyHeader'
import { Wide } from '@/components/lobby/LobbyLayout'
import { LobbyPlayers } from '@/components/lobby/LobbyPlayers'
import { ImposterSettingsChoices } from '@/components/imposterjakten/ImposterSettingsChoices'
import { AcceptThrowsChoice, ThrowBar, ThrowCounter } from '@/components/lobby/Kast'
import { ReactionBar } from '@/components/lobby/Reactions'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { GAMES, playersLabel, roundWords, type GameInfo } from '@/lib/games'
import {
  canStart,
  gameHasBots,
  tooManyPlayers,
  guessSecondsFor,
  hasTempoSettings,
  rankLeaderboard,
  REMATCH_SECONDS,
  roundOptionsFor,
  type CountdownKind,
  type GameState,
} from '@/lib/match'
import { IMPOSTER_GAME, IMPOSTER_HOW_TO, IMPOSTER_SCORING, wordsRunningOutText, type ImposterSettings } from '@/lib/imposterjakten'
import { TANT_GAME, TANT_HOW_TO, TANT_SCORING, type TantSettings } from '@/lib/tantpanik'
import { TantSvarighet } from '@/components/tantpanik/TantSvarighet'
import { TantVantrum } from '@/components/tantpanik/TantVantrum'
import { TantBotar } from '@/components/tantpanik/TantBotar'
import { TantKafferep, TantKortFlakt, TantRubrik, TantVanta } from '@/components/tantpanik/TantVantrumVy'
import { waitingText } from '@/lib/tantvantrum'
import { MAX_BOTS, type BotLevel } from '@/lib/tantbot'
import { emptySeats, lobbyStatus, lobbyThemeFor, settingsLine } from '@/lib/vantrum'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { canKeepScreenOn, hasFinePointer } from '@/lib/device'
import { totalThrows } from '@/lib/kast'
import { loadSoundOn, playCountdownTick } from '@/lib/ljud'
import { cn } from '@/lib/utils'

type WaitingRoomProps = {
  code: string
  game: GameInfo
  state: GameState
  isHost: boolean
  // Den egna spelaren, som markeras med "Du".
  meId: string
  online: OnlinePlayer[]
  // Skillnaden mellan min klocka och värdens (för revanschens nedräkning).
  clockOffset: number
  // Värden kom hit via Byt spel: sidan scrollar till inställningarna med spelvalet.
  scrollToGames?: boolean
  onCancelRematch: () => void
  onSetRounds: (rounds: number) => void
  onSetGame: (game: string) => void
  onSetTempo: (tempo: { guessSeconds?: number; autoAdvance?: boolean }) => void
  onSetThrowsAllowed: (allowed: boolean) => void
  onSetImposterSettings: (settings: Partial<ImposterSettings>) => void
  onSetTantSettings: (settings: Partial<TantSettings>) => void
  // Botar i Exploderande Tanter (bara värden).
  botActions?: { addBot: () => void; removeBot: (id: string) => void; setBotLevel: (id: string, level: BotLevel) => void }
  // Solotestet: startar direkt. Starta med flera spelare går via nedräkningen (onStartCountdown).
  onStart: () => void
  onStartCountdown: () => void
}

export function WaitingRoom({
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
  onSetTempo,
  onSetThrowsAllowed,
  onSetImposterSettings,
  onSetTantSettings,
  botActions,
  onStart,
  onStartCountdown,
}: WaitingRoomProps) {
  // Efter Byt spel scrollar sidan till inställningarna med spelvalet.
  const settingsRef = useRef<HTMLElement>(null)
  // Ett dubbeltryck på Byt spel ska inte också välja ett spel: det andra trycket landar på spelvalet i väntrummet.
  const [canChoose, setCanChoose] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setCanChoose(true), 700)
    return () => clearTimeout(timer)
  }, [])
  function chooseGame(id: string) {
    if (state.choosingGame && !canChoose) return
    onSetGame(id)
  }
  useEffect(() => {
    if (scrollToGames && isHost) settingsRef.current?.scrollIntoView({ block: 'start' })
  }, [scrollToGames, isHost])
  const rules = rulesFor(state.game)
  // Kortspelen och Imposterjakten har egen beskrivning och poängförklaring, och Imposterjakten har egna val.
  const cardRules = cardRulesFor(state.game)
  const imposter = state.game === IMPOSTER_GAME
  const tant = state.game === TANT_GAME
  // Botar spelar bara i spel med stöd för botar. Annars tittar de på och räknas inte som spelare.
  const hasBots = gameHasBots(state.game)
  const playing = hasBots ? online : online.filter((p) => !p.bot)
  const watchingBots = online.length - playing.length
  const dressWearer = online.find((p) => p.id === state.dressId)
  const theme = lobbyThemeFor(game)
  const howTo = tant ? TANT_HOW_TO : imposter ? IMPOSTER_HOW_TO : cardRules ? cardRules.howTo : rules.howTo(guessSecondsFor(state))
  const scoringDetails = tant ? TANT_SCORING : imposter ? IMPOSTER_SCORING : cardRules ? cardRules.scoringDetails : rules.scoringDetails
  const roundsLabel = `Antal ${roundWords(state.game).many}`
  // Starta kräver spelets minsta antal spelare. Provomgången (Testa själv) går med en spelare, om spelet tillåter det.
  const enoughPlayers = playing.length >= game.minPlayers
  const canPractice = canStart(state.game, 1) && playing.length === 1
  // För många för spelet som är valt. Sajten säger t.ex. 3–9 spelare i Kortkaos.
  const tooMany = tooManyPlayers(state.game, playing.length)
  // En revansch är på väg: matchen startar av sig själv när nedräkningen är slut.
  const rematching = state.rematchAt !== null
  // Namnen från läget, där den som heter likadant som någon annan har fått en siffra.
  const lobbyName = (player: OnlinePlayer) => state.players[player.id]?.name ?? player.name
  const hostPlayer = online.find((p) => p.host)
  // Exploderande Tanter: raden när man är för få, om en bot får plats, och om spellistan är utfälld (Byt spel).
  const tantWaiting = tant ? waitingText(playing.length, game.minPlayers) : null
  const canAddBot = hasBots && online.filter((p) => p.bot).length < MAX_BOTS && !tooManyPlayers(state.game, playing.length + 1)
  const [showGames, setShowGames] = useState(false)
  const gamesOpen = showGames || state.choosingGame || scrollToGames === true
  const status = lobbyStatus({
    count: playing.length,
    game,
    tooMany,
    isHost,
    hostName: hostPlayer && lobbyName(hostPlayer),
    choosingGame: state.choosingGame,
  })

  return (
    <Wide>
      {/* Exploderande Tanter: mönstret, musiken och volymknappen. */}
      {tant && <TantVantrum />}
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

      {/* Spelet, antal spelare och startknappen först, så att värden inte behöver scrolla. */}
      <section
        className={cn('space-y-3 rounded-lg border p-4 shadow-soft sm:p-5', tant ? 'border-tant-vin/20 bg-tant-kram' : 'bg-card')}
        aria-label="Spelet"
      >
        {/* Exploderande Tanter har sin logga och roliga rader i stället för rubrikraden. */}
        {tant ? <TantRubrik /> : <LobbyHeader key={game.id} gameId={game.id} name={game.name} theme={theme} />}

        {state.notice && (
          <p className="rounded-md bg-sun-soft px-3 py-2 text-center text-sm font-semibold" role="status">
            {state.notice}
          </p>
        )}

        {tant && tantWaiting ? (
          // Exploderande Tanter: en hjälpsam rad med Dela och Lägg till bot i stället för en knapp som väntar.
          <TantVanta
            text={tantWaiting}
            code={code}
            gameName={game.name}
            canAddBot={canAddBot}
            onAddBot={isHost && botActions ? botActions.addBot : null}
          />
        ) : isHost ? (
          <div className="space-y-2">
            {/* Knappen vickar en gång när tillräckligt många har gått med (ny key startar om vickningen). */}
            <Button
              key={enoughPlayers ? 'redo' : 'vantar'}
              size="lg"
              className={cn('w-full', enoughPlayers && 'motion-safe:animate-wiggle')}
              onClick={onStartCountdown}
              disabled={!enoughPlayers || tooMany || rematching}
            >
              {tooMany ? 'För många spelare' : enoughPlayers ? `Starta ${game.name}` : 'Väntar på spelare…'}
            </Button>
            <p className="text-center font-semibold" role="status">
              {status}
            </p>
            {state.choosingGame && enoughPlayers && (
              <p className="text-center text-sm text-muted-foreground">Välj nästa spel under Inställningar.</p>
            )}
            {/* Telefoner som inte kan hålla skärmen tänd själva (se useWakeLock) får ett tips. */}
            {enoughPlayers && !canKeepScreenOn() && !hasFinePointer() && (
              <p className="text-center text-sm text-muted-foreground">Håll skärmen tänd under matchen, annars stannar spelet.</p>
            )}
            {canPractice && (
              <Button variant="outline" className="w-full" onClick={onStart} disabled={rematching}>
                Testa själv
              </Button>
            )}
          </div>
        ) : (
          <p className={cn('rounded-md px-3 py-3 text-center font-semibold', tant ? 'bg-tant-vin text-tant-kram' : 'bg-coral-soft')} role="status">
            {status}
          </p>
        )}
      </section>

      {/* Gästerna har reglerna direkt under statusen, värden längst ner. Hopfällda för alla. */}
      {!isHost && <HowToPlay howTo={howTo} scoringDetails={scoringDetails} />}

      <section
        className={cn('min-w-0 space-y-4 rounded-lg border p-4 shadow-soft sm:p-5', tant ? 'border-tant-vin/20 bg-tant-kram' : 'bg-card')}
        aria-label={theme.playersTitle}
      >
        <h2 className={cn('text-xl', tant && 'text-tant-vin')}>
          {/* Botar som tittar på räknas inte. */}
          {tant ? 'Vid kafferepsbordet' : theme.playersTitle} ({playing.length})
        </h2>
        {tant ? (
          // Spelarna sitter runt ett kafferepsbord, med stol och kaffekopp.
          <TantKafferep
            guests={online.map((p) => ({ id: p.id, name: lobbyName(p), avatar: p.avatar, host: p.host === true, bot: p.bot !== undefined, dress: p.id === state.dressId }))}
            meId={meId}
            maxPlayers={game.maxPlayers ?? 10}
          />
        ) : (
          <LobbyPlayers
            players={online.map((p) => ({
              id: p.id,
              name: lobbyName(p),
              avatar: p.avatar,
              host: p.host === true,
              bot: p.bot !== undefined,
              watching: p.bot !== undefined && !hasBots,
              dress: p.id === state.dressId,
            }))}
            meId={meId}
            emptySeats={emptySeats(playing.length, game)}
          />
        )}
        {/* Den som vann senast bär tantklänningen, i alla spel i lobbyn. */}
        {dressWearer && (
          <p className="rounded-lg border-2 border-tant-guld-mork bg-sun-soft px-3 py-2.5 text-center text-sm leading-snug font-bold">
            {lobbyName(dressWearer)} bär tantklänningen tills någon annan vinner. Den följer med i alla spel i lobbyn.
          </p>
        )}
        {watchingBots > 0 && (
          <p className="rounded-md bg-muted px-3 py-2 text-center text-sm font-semibold text-muted-foreground">
            Botarna kan inte spela {game.name} än. De tittar på.
          </p>
        )}
        <ReactionBar className="pt-1" />
        {state.throwsAllowed && online.length > 1 && <ThrowBar />}
        {state.throwsAllowed && (online.length > 1 || totalThrows(state.throwStats) > 0) && <ThrowCounter stats={state.throwStats} />}
        {state.throwsAllowed && online.length > 1 && <AcceptThrowsChoice />}
      </section>

      {/* Några av korten att titta på medan man väntar. */}
      {tant && (
        <section aria-label="Några av korten" className="rounded-lg border border-tant-vin/20 bg-tant-kram p-4 shadow-soft">
          <TantKortFlakt />
        </section>
      )}

      <InviteCard code={code} game={game} />

      {/* Inställningarna syns alltid. Värden ändrar dem, de andra ser en sammanfattning. */}
      <section
        ref={settingsRef}
        className="scroll-mt-4 space-y-5 rounded-lg border bg-card p-4 shadow-soft sm:p-6"
        aria-label="Inställningar"
      >
        <h2 className="text-xl">Inställningar</h2>
        {isHost ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">Spel</p>
                {/* Exploderande Tanter: bara det valda spelet, och de andra bakom Byt spel. */}
                {tant && !gamesOpen && (
                  <Button variant="outline" size="sm" className="h-9" onClick={() => setShowGames(true)}>
                    Byt spel
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Det valda spelet först, de andra under i vanlig ordning. */}
                {GAMES.filter((g) => g.playable && (!tant || gamesOpen || g.id === game.id))
                  .sort((a, b) => Number(b.id === game.id) - Number(a.id === game.id))
                  .map((option) => {
                  const selected = option.id === game.id
                  // Spelet kräver fler spelare än de som är med nu. Det går att välja, men startknappen väntar.
                  const tooFew = online.length < option.minPlayers
                  const tooManyHere = tooManyPlayers(option.id, online.length)
                  return (
                    <Button
                      key={option.id}
                      variant="outline"
                      aria-pressed={selected}
                      onClick={() => chooseGame(option.id)}
                      className={cn(
                        'h-auto justify-start gap-3 rounded-lg border-2 p-4 text-left whitespace-normal',
                        selected ? 'border-primary bg-coral-soft' : 'bg-card',
                      )}
                    >
                      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-md text-2xl', option.color)}>
                        <Emoji emoji={option.emoji} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-base font-bold">{option.name}</span>
                        <span className="block text-sm font-normal text-muted-foreground">{option.tagline}</span>
                        <span className={cn('mt-1 block text-xs font-semibold', tooFew || tooManyHere ? 'text-primary' : 'text-muted-foreground')}>
                          👥 {playersLabel(option)}
                          {tooFew && (online.length === 1 ? ' · Du är själv här just nu' : ` · ni är ${online.length} just nu`)}
                          {tooManyHere && ` · ni är ${online.length} just nu`}
                        </span>
                      </span>
                      {selected && <Check className="size-5 shrink-0 text-primary" aria-label="Valt" />}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Exploderande Tanter har inga rundor: sist kvar vinner. */}
            {!tant && (
              <Choice
                label={roundsLabel}
                compact
                hint={imposter ? (wordsRunningOutText(state.imposterSettings, state.rounds, state.usedWordIds) ?? undefined) : undefined}
                options={roundOptionsFor(state.game).map((n) => ({ value: n, label: String(n) }))}
                selected={state.rounds}
                onSelect={onSetRounds}
              />
            )}

            {/* Tempo för spel som har det (Gissa priset). Gäller hela lobbyn. */}
            {hasTempoSettings(state.game) && (
              <>
                <Choice
                  label="Svarstid"
                  options={(rules.guessSecondsOptions ?? []).map((s) => ({ value: s, label: `${s} s` }))}
                  selected={guessSecondsFor(state)}
                  onSelect={(guessSeconds) => onSetTempo({ guessSeconds })}
                />
                <NextQuestionChoice autoAdvance={state.autoAdvance} onSelect={(autoAdvance) => onSetTempo({ autoAdvance })} />
              </>
            )}

            {/* Botar i andra spel än Exploderande Tanter (som har dem i sin egen ruta). I ett spel utan botar kan värden
                bara ta bort dem. */}
            {!tant && botActions && (hasBots || watchingBots > 0) && (
              <TantBotar
                bots={online.flatMap((p) => (p.bot ? [{ id: p.id, name: p.name, avatar: p.avatar, level: p.bot }] : []))}
                canAdd={canAddBot}
                canPlay={hasBots}
                gameName={game.name}
                onAdd={botActions.addBot}
                onRemove={botActions.removeBot}
                onLevel={botActions.setBotLevel}
              />
            )}

            {imposter && <ImposterSettingsChoices settings={state.imposterSettings} onChange={onSetImposterSettings} />}

            {tant && (
              // Spelets egna val i en egen ruta.
              <div className="space-y-5 rounded-lg border-2 border-tant-vin/25 bg-tant-kram/70 p-4">
                <h3 className="text-lg text-tant-vin">Inställningar för Exploderande Tanter</h3>
                <TantSvarighet settings={state.tantSettings} players={online.length} isHost onChange={onSetTantSettings} />
                {botActions && (
                  <TantBotar
                    bots={online.flatMap((p) => (p.bot ? [{ id: p.id, name: p.name, avatar: p.avatar, level: p.bot }] : []))}
                    canAdd={canAddBot}
                    onAdd={botActions.addBot}
                    onRemove={botActions.removeBot}
                    onLevel={botActions.setBotLevel}
                  />
                )}
                <Choice
                  label="Tantsnara"
                  hint="En fälla i leken: stjäl någon den väljer ägaren två kort ur tjuvens hand"
                  options={[
                    { value: 1, label: 'På' },
                    { value: 0, label: 'Av' },
                  ]}
                  selected={state.tantSettings.trap ? 1 : 0}
                  onSelect={(value) => onSetTantSettings({ trap: value === 1 })}
                />
              </div>
            )}

            <Choice
              label="Kasta saker"
              hint="Tomater, pajer, ägg, toapapper och gurkor på varandra"
              options={[
                { value: 1, label: 'På' },
                { value: 0, label: 'Av' },
              ]}
              selected={state.throwsAllowed ? 1 : 0}
              onSelect={(value) => onSetThrowsAllowed(value === 1)}
            />
          </>
        ) : (
          <p className="text-muted-foreground">{settingsLine(state)}</p>
        )}
      </section>

      <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />

      {isHost && <HowToPlay howTo={howTo} scoringDetails={scoringDetails} />}
    </Wide>
  )
}

// Så spelas det: hur spelet går till och hur poängen räknas, för spelet som är valt just nu. Hopfällt för alla.
function HowToPlay({ howTo, scoringDetails }: { howTo: string; scoringDetails: string[] }) {
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
function RematchCountdown({
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
