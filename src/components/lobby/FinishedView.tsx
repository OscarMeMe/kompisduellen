import { Link } from 'react-router'
import { Leaderboard } from '@/components/Leaderboard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Podium } from '@/components/Podium'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'
import { matchHighlights } from '@/lib/hojdpunkter'
import { matchWinners, rankLeaderboard, rankPlayers, type GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

type FinishedViewProps = {
  game: GameInfo
  state: GameState
  isHost: boolean
  onPlayAgain: () => void
}

export function FinishedView({ game, state, isHost, onPlayAgain }: FinishedViewProps) {
  const ranked = rankPlayers(state)
  const highlights = matchHighlights(state)

  return (
    <Wide>
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-2 text-4xl">{state.practice ? 'Provomgången är klar!' : 'Matchen är slut!'}</h1>
        <p className="mt-1 text-muted-foreground">
          {game.name} · {state.rounds} rundor spelade
        </p>
      </div>

      {state.practice && (
        <div className="space-y-1 rounded-lg border bg-lilac/40 p-4 text-center">
          <p className="font-heading font-bold">Testläge</p>
          <p className="text-sm">
            Provomgången räknas inte i topplistan. Vill du spela med kompisar? Tryck på Spela igen och dela koden eller
            länken i lobbyn, och starta när de är med.
          </p>
        </div>
      )}

      <Podium players={ranked} />

      {highlights.length > 0 && (
        <ul className={cn("grid gap-3", highlights.length > 1 && "sm:grid-cols-2")} aria-label="Matchens höjdpunkter">
          {highlights.map((highlight) => (
            <li key={highlight.id} className="flex gap-3 rounded-lg border bg-sun-soft p-4 shadow-soft-sm animate-pop">
              <span className="text-2xl leading-none" aria-hidden>
                {highlight.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-heading font-bold">{highlight.title}</span>
                <span className="block text-sm break-words text-muted-foreground">{highlight.text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Leaderboard
        entries={rankLeaderboard(state)}
        matchesPlayed={state.matchesPlayed}
        gamesPlayed={state.gamesPlayed}
        lastWinners={state.practice ? [] : matchWinners(state)}
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
