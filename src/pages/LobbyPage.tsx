import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { PriceGuessingView } from '@/components/gissa-priset/PriceGuessingView'
import { PriceRevealView } from '@/components/gissa-priset/PriceRevealView'
import { FinishedView } from '@/components/lobby/FinishedView'
import { Narrow } from '@/components/lobby/LobbyLayout'
import type { GuessingViewProps, RevealViewProps } from '@/components/lobby/types'
import { WaitingRoom } from '@/components/lobby/WaitingRoom'
import { GuessingView } from '@/components/narmast/GuessingView'
import { RevealView } from '@/components/narmast/RevealView'
import { PlayerSetup } from '@/components/PlayerSetup'
import { Button } from '@/components/ui/button'
import { useLayout } from '@/hooks/useLayout'
import { useLobby } from '@/hooks/useLobby'
import { findGame, GAMES } from '@/lib/games'
import { hostedGame, loadPlayer, normalizeCode, type Player } from '@/lib/player'

// Vyerna för att gissa och visa svaret i varje spel. Väntrum och prispall är gemensamma.
const GAME_VIEWS: Record<string, { Guessing: ComponentType<GuessingViewProps>; Reveal: ComponentType<RevealViewProps> }> =
  {
    narmast: { Guessing: GuessingView, Reveal: RevealView },
    'gissa-priset': { Guessing: PriceGuessingView, Reveal: PriceRevealView },
  }

export function LobbyPage() {
  const params = useParams()
  const code = normalizeCode(params.code ?? '')
  const [me, setMe] = useState<Player | null>(() => loadPlayer())

  if (!me) {
    return (
      <Narrow>
        <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Du går med i lobby</p>
          <p className="text-4xl font-black tracking-[0.3em] text-primary">{code}</p>
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
  const { status, state, online, clockOffset, actions } = useLobby(code, me, isHost, hosted ?? undefined)
  // Spelet kommer från värdens tillstånd, så att alla ser samma spel.
  const game = findGame(state.game) ?? GAMES[0]
  const views = GAME_VIEWS[state.game] ?? GAME_VIEWS.narmast

  // Dölj menyn medan rundorna pågår, så att ingen lämnar lobbyn av misstag.
  const { setInMatch } = useLayout()
  const inMatch = status === 'ready' && (state.phase === 'guessing' || state.phase === 'reveal')
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
        <div className="space-y-3 rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-5xl">🤷</p>
          <h1 className="text-2xl font-black">
            {status === 'error' ? 'Kunde inte ansluta' : `Ingen lobby med koden ${code}`}
          </h1>
          <p className="text-muted-foreground">
            {status === 'error'
              ? 'Kontrollera din internetanslutning och försök igen.'
              : 'Kolla att koden stämmer. Lobbyn finns bara så länge värden är kvar.'}
          </p>
        </div>
        <Button asChild size="lg" className="h-14 rounded-2xl text-lg">
          <Link to="/ga-med">Testa en annan kod</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl bg-white text-lg">
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
          online={online}
          onSetRounds={actions.setRounds}
          onSetGame={actions.setGame}
          onStart={actions.start}
        />
      )
    case 'guessing':
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
