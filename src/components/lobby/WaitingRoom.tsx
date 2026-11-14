import { Leaderboard } from '@/components/Leaderboard'
import { InviteCard } from '@/components/lobby/InviteCard'
import { Choice, NextQuestionChoice } from '@/components/lobby/Choice'
import { LobbyHeader } from '@/components/lobby/LobbyHeader'
import { Wide } from '@/components/lobby/LobbyLayout'
import { LobbyPlayers } from '@/components/lobby/LobbyPlayers'
import { BytSpel, HowToPlay, RematchCountdown, ValtSpel } from '@/components/lobby/VantrumDelar'
import { ImposterVantrum } from '@/components/imposterjakten/ImposterVantrum'
import { AcceptThrowsChoice, ThrowBar, ThrowCounter } from '@/components/lobby/Kast'
import { ReactionBar } from '@/components/lobby/Reactions'
import { Button } from '@/components/ui/button'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { roundWords, type GameInfo } from '@/lib/games'
import {
  canStart,
  gameHasBots,
  tooManyPlayers,
  guessSecondsFor,
  hasTempoSettings,
  rankLeaderboard,
  roundOptionsFor,
  type GameState,
} from '@/lib/match'
import { IMPOSTER_GAME, type ImposterSettings } from '@/lib/imposterjakten'
import { TANT_GAME, TANT_HOW_TO, TANT_SCORING, type TantSettings } from '@/lib/tantpanik'
import { TantInstallningar } from '@/components/tantpanik/TantInstallningar'
import { TantVantrum } from '@/components/tantpanik/TantVantrum'
import { TantBotar } from '@/components/tantpanik/TantBotar'
import { TantKafferep, TantKortFlakt, TantRubrik, TantVanta } from '@/components/tantpanik/TantVantrumVy'
import { tantStartBlocked, waitingText } from '@/lib/tantvantrum'
import { MAX_BOTS, type BotLevel } from '@/lib/tantbot'
import { emptySeats, lobbyStatus, lobbyThemeFor, settingsLine } from '@/lib/vantrum'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { canKeepScreenOn, hasFinePointer } from '@/lib/device'
import { totalThrows } from '@/lib/kast'
import { cn } from '@/lib/utils'

export type WaitingRoomProps = {
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

// Imposterjakten har sitt eget väntrum i spelets stil. De andra spelen delar det vanliga.
export function WaitingRoom(props: WaitingRoomProps) {
  return props.state.game === IMPOSTER_GAME ? <ImposterVantrum {...props} /> : <StandardWaitingRoom {...props} />
}

function StandardWaitingRoom({
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
  onSetTantSettings,
  botActions,
  onStart,
  onStartCountdown,
}: WaitingRoomProps) {
  const rules = rulesFor(state.game)
  // Kortspelen har egen beskrivning och poängförklaring.
  const cardRules = cardRulesFor(state.game)
  const tant = state.game === TANT_GAME
  // Botar spelar bara i spel med stöd för botar. Annars tittar de på och räknas inte som spelare.
  const hasBots = gameHasBots(state.game)
  const playing = hasBots ? online : online.filter((p) => !p.bot)
  const watchingBots = online.length - playing.length
  const dressWearer = online.find((p) => p.id === state.dressId)
  const theme = lobbyThemeFor(game)
  const howTo = tant ? TANT_HOW_TO : cardRules ? cardRules.howTo : rules.howTo(guessSecondsFor(state))
  const scoringDetails = tant ? TANT_SCORING : cardRules ? cardRules.scoringDetails : rules.scoringDetails
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
  // Exploderande Tanter: raden när man är för få, och om en bot får plats.
  const tantWaiting = tant ? waitingText(playing.length, game.minPlayers) : null
  const canAddBot = hasBots && online.filter((p) => p.bot).length < MAX_BOTS && !tooManyPlayers(state.game, playing.length + 1)
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

      {/* Inställningarna syns alltid. Värden ändrar dem, de andra ser en sammanfattning. Exploderande Tanter har sina
          val i en egen ruta under (TantInstallningar), så här står bara spelet, och bara för värden. */}
      {!(tant && !isHost) && (
      <section
        className="space-y-5 rounded-lg border bg-card p-4 shadow-soft sm:p-6"
        aria-label={tant ? 'Spel' : 'Inställningar'}
      >
        <h2 className="text-xl">{tant ? 'Spel' : 'Inställningar'}</h2>
        {isHost ? (
          <>
            <div className="space-y-3">
              {!tant && <p className="font-bold">Spel</p>}
              {/* Det valda spelet. De andra finns bakom Byt spel, som öppnar spelvalet mitt på skärmen. */}
              <ValtSpel game={game}>
                <BytSpel game={game} players={online.length} choosingGame={state.choosingGame} openAtStart={scrollToGames} onSetGame={onSetGame} />
              </ValtSpel>
            </div>

            {/* Exploderande Tanter har inga rundor: sist kvar vinner. */}
            {!tant && (
              <Choice
                label={roundsLabel}
                compact
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

            {!tant && (
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
            )}
          </>
        ) : (
          <p className="text-muted-foreground">{settingsLine(state)}</p>
        )}
      </section>
      )}

      {/* Exploderande Tanters inställningar i spelets stil. Gästerna ser samma ruta, låst. */}
      {tant && (
        <TantInstallningar
          isHost={isHost}
          hostName={hostPlayer ? lobbyName(hostPlayer) : 'värden'}
          settings={state.tantSettings}
          players={online.length}
          bots={online.flatMap((p) => (p.bot ? [{ id: p.id, name: p.name, avatar: p.avatar, level: p.bot }] : []))}
          canAddBot={canAddBot}
          throwsAllowed={state.throwsAllowed}
          blockedText={tantStartBlocked(playing.length, game.minPlayers, tooMany)}
          starting={rematching}
          waitingText={state.choosingGame ? `${hostPlayer ? lobbyName(hostPlayer) : 'Värden'} väljer nästa spel…` : `Väntar på att ${hostPlayer ? lobbyName(hostPlayer) : 'värden'} startar`}
          onSettings={onSetTantSettings}
          onThrows={onSetThrowsAllowed}
          onStart={onStartCountdown}
          botActions={isHost ? botActions : undefined}
        />
      )}


      <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />

      {isHost && <HowToPlay howTo={howTo} scoringDetails={scoringDetails} />}
    </Wide>
  )
}
