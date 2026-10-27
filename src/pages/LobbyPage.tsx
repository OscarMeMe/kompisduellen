import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
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
import { findGame, GAMES } from '@/lib/games'
import { clearPracticeRequest, hasPracticeRequest, hostedGame, loadPlayer, normalizeCode, type Player } from '@/lib/player'

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
  const [me, setMe] = useState<Player | null>(() => loadPlayer())

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

  return <Lobby code={code} me={me} />
}

function Lobby({ code, me }: { code: string; me: Player }) {
  const hosted = hostedGame(code)
  const isHost = hosted !== null
  const { status, state, online, clockOffset, hand, actions } = useLobby(code, me, isHost, hosted ?? undefined)
  // Spelet kommer från värdens tillstånd, så att alla ser samma spel.
  const game = findGame(state.game) ?? GAMES[0]
  const views = GAME_VIEWS[state.game] ?? GAME_VIEWS.narmast

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
              : 'Kolla att koden stämmer. Lobbyn finns bara så länge värden är kvar.'}
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
      return <FinishedView game={game} state={state} isHost={isHost} onPlayAgain={actions.playAgain} />
  }
}
