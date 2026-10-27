import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { PriceGuessingView } from '@/components/gissa-priset/PriceGuessingView'
import { PriceRevealView } from '@/components/gissa-priset/PriceRevealView'
import { KortkaosView } from '@/components/kortkaos/KortkaosView'
import { FinishedView } from '@/components/lobby/FinishedView'
import { Narrow } from '@/components/lobby/LobbyLayout'
import type { CardViewProps, GuessingViewProps, RevealViewProps } from '@/components/lobby/types'
import { WaitingRoom } from '@/components/lobby/WaitingRoom'
import { GuessingView } from '@/components/narmast/GuessingView'
import { RevealView } from '@/components/narmast/RevealView'
import { PlayerSetup } from '@/components/PlayerSetup'
import { Button } from '@/components/ui/button'
import { useLayout } from '@/hooks/useLayout'
import { useLobby } from '@/hooks/useLobby'
import { useOneTab } from '@/hooks/useOneTab'
import { findGame, GAMES } from '@/lib/games'
import {
  adoptPlayer,
  clearPracticeRequest,
  forgetLobbyIdentity,
  hasJoinedInThisTab,
  hasPracticeRequest,
  hostedGame,
  leaveHostRole,
  loadLobbyIdentity,
  loadPlayer,
  loadPlayerInThisTab,
  markJoinedInThisTab,
  normalizeCode,
  rememberLobbyIdentity,
  startNewIdentity,
  type Player,
} from '@/lib/player'

// Vyerna i varje spel. Gissningsspelen har en vy för att gissa och en för att visa svaret, kortspelen
// en vy för hela rundan. Väntrum och prispall är gemensamma.
type GameViews =
  | { Guessing: ComponentType<GuessingViewProps>; Reveal: ComponentType<RevealViewProps> }
  | { Play: ComponentType<CardViewProps> }

const GAME_VIEWS: Record<string, GameViews> = {
  narmast: { Guessing: GuessingView, Reveal: RevealView },
  'gissa-priset': { Guessing: PriceGuessingView, Reveal: PriceRevealView },
  kortkaos: { Play: KortkaosView },
}

export function LobbyPage() {
  const params = useParams()
  const code = normalizeCode(params.code ?? '')
  // Fliken minns vem den är i den här lobbyn. Annars gäller namnet och figuren som webbläsaren har sparat.
  const [me, setMe] = useState<Player | null>(() => loadPlayerInThisTab(code) ?? loadPlayer())
  // Spelaren som den här webbläsaren hade i lobbyn förut (t.ex. i en annan flik). Om den här fliken inte redan
  // har valt vem den är får man välja: fortsätta som den spelaren eller gå med som en annan.
  const [earlier] = useState(() => {
    if (hostedGame(code) !== null || hasJoinedInThisTab(code)) return null
    const saved = loadLobbyIdentity(code)
    return saved && saved.id !== loadPlayer()?.id ? saved : null
  })
  const [choosing, setChoosing] = useState(earlier !== null)

  function continueAs(player: Player) {
    markJoinedInThisTab(code)
    setMe(adoptPlayer(player))
    setChoosing(false)
  }

  // Samma person med ett annat namn, eller en annan person på samma webbläsare.
  function joinAsAnother() {
    markJoinedInThisTab(code)
    setMe(null)
    setChoosing(false)
  }

  if (choosing && earlier) {
    return (
      <Narrow>
        <div className="rounded-lg border bg-card p-5 text-center shadow-soft">
          <p className="text-sm font-semibold text-muted-foreground">Du har varit med i lobby</p>
          <p className="font-heading text-4xl font-bold tracking-[0.3em] text-primary">{code}</p>
          <p className="mt-3 flex items-center justify-center gap-2 font-bold">
            <Emoji emoji={earlier.avatar} className="text-2xl" />
            <span className="truncate">{earlier.name}</span>
          </p>
        </div>
        <Button size="lg" onClick={() => continueAs(earlier)}>
          Fortsätt som {earlier.name}
        </Button>
        <Button size="lg" variant="outline" onClick={joinAsAnother}>
          Gå med som en annan spelare
        </Button>
      </Narrow>
    )
  }

  if (!me) {
    return (
      <Narrow>
        <div className="rounded-lg border bg-card p-5 text-center shadow-soft">
          <p className="text-sm font-semibold text-muted-foreground">Du går med i lobby</p>
          <p className="font-heading text-4xl font-bold tracking-[0.3em] text-primary">{code}</p>
        </div>
        <PlayerSetup submitLabel="Gå med i lobbyn" onDone={setMe} />
      </Narrow>
    )
  }

  return <OnePlayerOneTab code={code} me={me} onJoinAsAnother={() => setMe(null)} />
}

// En spelare i en flik åt gången. Är samma spelare redan med i en annan flik visas ett besked, så att det
// aldrig blir två flikar som svarar åt samma spelare (se useOneTab).
function OnePlayerOneTab({ code, me, onJoinAsAnother }: { code: string; me: Player; onJoinAsAnother: () => void }) {
  const { status, retry } = useOneTab(code, me.id)

  useEffect(() => {
    if (status !== 'ok') return
    markJoinedInThisTab(code, me)
    rememberLobbyIdentity(code, me)
  }, [status, code, me])

  if (status === 'checking') {
    return (
      <Narrow>
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p>Ansluter till lobby {code}…</p>
        </div>
      </Narrow>
    )
  }

  if (status === 'taken') {
    return (
      <Narrow>
        <div className="space-y-3 rounded-lg border bg-card p-8 text-center shadow-soft">
          <p className="text-5xl">🪟</p>
          <h1 className="text-2xl">Du är redan med i den här lobbyn</h1>
          <p className="text-muted-foreground">
            {me.name} är med i en annan flik. Använd den fliken, eller stäng den och försök igen här. Är det en annan
            person kan du gå med som en annan spelare.
          </p>
        </div>
        <Button size="lg" onClick={retry}>
          Försök igen
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            // En kopierad värdflik ärver värdrollen. Den här fliken ska bli en vanlig spelare.
            leaveHostRole(code)
            startNewIdentity()
            onJoinAsAnother()
          }}
        >
          Gå med som en annan spelare
        </Button>
      </Narrow>
    )
  }

  return <Lobby code={code} me={me} />
}

function Lobby({ code, me }: { code: string; me: Player }) {
  const hosted = hostedGame(code)
  const isHost = hosted !== null
  const { status, state, online, clockOffset, hand, actions } = useLobby(code, me, isHost, hosted ?? undefined)
  // Spelet kommer från värdens tillstånd, så att alla ser samma spel.
  const game = findGame(state.game) ?? GAMES[0]
  const views = GAME_VIEWS[state.game] ?? GAME_VIEWS.narmast
  // Värden valde Byt spel på prispallen: väntrummet scrollar då till spelvalet.
  const [pickGame, setPickGame] = useState(false)

  // "Testa själv": starta provomgången så snart värden finns med i lobbyn. Önskemålet tas bort när
  // den startar, och startGame gör ingenting om matchen redan har startat.
  const meInLobby = Boolean(state.players[me.id]) && online.some((p) => p.id === me.id)
  useEffect(() => {
    if (!isHost || status !== 'ready' || state.phase !== 'waiting' || !meInLobby) return
    if (!hasPracticeRequest(code)) return
    clearPracticeRequest(code)
    actions.start()
  }, [isHost, status, state.phase, meInLobby, actions, code])

  // Dölj menyn medan rundorna pågår, så att ingen lämnar lobbyn av misstag.
  const { setInMatch } = useLayout()
  const inMatch =
    status === 'ready' && (state.phase === 'guessing' || state.phase === 'reveal' || state.phase === 'playing')
  useEffect(() => {
    setInMatch(inMatch)
    return () => setInMatch(false)
  }, [inMatch, setInMatch])

  if (status === 'connecting') {
    return (
      <Narrow>
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p>Ansluter till lobby {code}…</p>
        </div>
      </Narrow>
    )
  }

  if (status === 'no-host' || status === 'error') {
    // Lobbyn finns inte längre, så det går inte heller att fortsätta som tidigare spelare.
    if (status === 'no-host') forgetLobbyIdentity(code)
    return (
      <Narrow>
        <div className="space-y-3 rounded-lg border bg-card p-8 text-center shadow-soft">
          <p className="text-5xl">🤷</p>
          <h1 className="text-2xl">
            {status === 'error' ? 'Kunde inte ansluta' : `Ingen lobby med koden ${code}`}
          </h1>
          <p className="text-muted-foreground">
            {status === 'error'
              ? 'Kontrollera din internetanslutning och försök igen.'
              : 'Kolla att koden stämmer. Lobbyn finns bara så länge värden är kvar. Har värden stängt sidan går det inte att fortsätta som tidigare spelare.'}
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/ga-med">Testa en annan kod</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/#spel">Tillbaka till alla spel</Link>
        </Button>
      </Narrow>
    )
  }

  switch (state.phase) {
    case 'waiting':
      return (
        <WaitingRoom
          code={code}
          game={game}
          state={state}
          isHost={isHost}
          meId={me.id}
          online={online}
          clockOffset={clockOffset}
          scrollToGames={pickGame}
          onCancelRematch={actions.cancelRematch}
          onSetRounds={actions.setRounds}
          onSetGame={actions.setGame}
          onSetTempo={actions.setTempo}
          onStart={actions.start}
        />
      )
    case 'playing':
      if (!('Play' in views)) return null
      return (
        <views.Play
          // Ny vy för varje frågekort, så att val och utkast börjar om (även när rundan görs om).
          key={`${state.round}-${state.cards?.prompt}`}
          state={state}
          me={me}
          online={online}
          isHost={isHost}
          clockOffset={clockOffset}
          hand={hand}
          onMove={actions.move}
          onNext={actions.skipReveal}
        />
      )
    case 'guessing':
      if (!('Guessing' in views)) return null
      return (
        <views.Guessing
          key={state.round}
          state={state}
          me={me}
          online={online}
          clockOffset={clockOffset}
          onGuess={actions.guess}
        />
      )
    case 'reveal':
      if (!('Reveal' in views)) return null
      return (
        <views.Reveal
          key={state.round}
          state={state}
          me={me}
          isHost={isHost}
          clockOffset={clockOffset}
          onNext={actions.skipReveal}
        />
      )
    case 'finished':
      return (
        <FinishedView
          game={game}
          state={state}
          isHost={isHost}
          onlineCount={online.length}
          onRematch={() => {
            setPickGame(false)
            actions.rematch()
          }}
          onToWaitingRoom={() => {
            setPickGame(false)
            actions.playAgain()
          }}
          onChangeGame={() => {
            setPickGame(true)
            actions.playAgain()
          }}
        />
      )
  }
}
