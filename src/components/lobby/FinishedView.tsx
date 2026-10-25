import { Link } from 'react-router'
import { Leaderboard } from '@/components/Leaderboard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Podium } from '@/components/Podium'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'
import { matchWinners, rankLeaderboard, rankPlayers, type GameState } from '@/lib/match'

type FinishedViewProps = {
  game: GameInfo
  state: GameState
  isHost: boolean
  onPlayAgain: () => void
}

export function FinishedView({ game, state, isHost, onPlayAgain }: FinishedViewProps) {
  const ranked = rankPlayers(state)

  return (
    <Wide>
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-2 text-4xl">Matchen är slut!</h1>
        <p className="mt-1 text-muted-foreground">
          {game.name} · {state.rounds} rundor spelade
        </p>
      </div>

      <Podium players={ranked} />

      <Leaderboard
        entries={rankLeaderboard(state)}
        matchesPlayed={state.matchesPlayed}
        gamesPlayed={state.gamesPlayed}
        lastWinners={matchWinners(state)}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        {isHost ? (
          <Button size="lg" className="sm:flex-1" onClick={onPlayAgain}>
            Spela igen
          </Button>
        ) : (
          <p className="flex items-center justify-center rounded-md border bg-card px-4 py-4 text-center font-semibold text-muted-foreground shadow-soft-sm sm:flex-1">
            Värden väljer nästa spel
          </p>
        )}
        <Button asChild size="lg" variant="outline" className="sm:flex-1">
          <Link to="/#spel">Tillbaka till alla spel</Link>
        </Button>
      </div>
    </Wide>
  )
}
