import { Link } from 'react-router'
import { Emoji } from '@/components/Emoji'
import { Sentence } from '@/components/kort/PlayingCard'
import { Leaderboard } from '@/components/Leaderboard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Podium } from '@/components/Podium'
import { Button } from '@/components/ui/button'
import type { GameInfo } from '@/lib/games'
import { matchHighlights } from '@/lib/hojdpunkter'
import { bestCard, kortkaosRules } from '@/lib/kortkaos'
import { canStart, matchWinners, rankLeaderboard, rankPlayers, type GameState } from '@/lib/match'
import { cn } from '@/lib/utils'

type FinishedViewProps = {
  game: GameInfo
  state: GameState
  isHost: boolean
  // Hur många som är online just nu. En revansch kräver spelets minsta antal spelare.
  onlineCount: number
  // Revansch (och Testa igen efter ett solotest): samma spel och inställningar efter en nedräkning.
  onRematch: () => void
  // Tillbaka till väntrummet med samma grupp, t.ex. för att bjuda in kompisar efter ett solotest.
  onToWaitingRoom: () => void
  // Till väntrummet med spelvalet i bild.
  onChangeGame: () => void
}

export function FinishedView({
  game,
  state,
  isHost,
  onlineCount,
  onRematch,
  onToWaitingRoom,
  onChangeGame,
}: FinishedViewProps) {
  const ranked = rankPlayers(state)
  const highlights = matchHighlights(state)
  const best = state.cards ? bestCard(state.cards, matchWinners(state)) : null
  const bestPlayer = best ? state.players[best.player] : undefined
  // Kortspelen slutar i förtid om för få spelare är kvar.
  const endedEarly = state.round < state.rounds
  const canRematch = canStart(state.game, onlineCount)

  return (
    <Wide>
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-2 text-4xl">{state.practice ? 'Provomgången är klar!' : 'Matchen är slut!'}</h1>
        <p className="mt-1 text-muted-foreground">
          {game.name} ·{' '}
          {endedEarly ? `slutade i runda ${state.round} av ${state.rounds}` : `${state.rounds} rundor spelade`}
        </p>
      </div>

      {state.practice && (
        <div className="space-y-1 rounded-lg border bg-lilac/40 p-4 text-center">
          <p className="font-heading font-bold">Testläge</p>
          <p className="text-sm">
            Provomgången räknas inte i kvällens ställning. Vill du spela med kompisar? Tryck på Bjud in kompisar och
            dela koden eller länken i lobbyn, och starta när de är med.
          </p>
        </div>
      )}

      {endedEarly && (
        <p className="rounded-md bg-coral-soft px-4 py-3 text-center text-sm font-semibold">
          Matchen tog slut i förtid eftersom för få spelare var kvar.
        </p>
      )}

      <Podium players={ranked} />

      {best && (
        <section className="space-y-3 rounded-lg bg-foreground p-6 text-background shadow-soft animate-pop sm:p-8">
          <h2 className="text-sm tracking-wide uppercase opacity-70">Matchens bästa kort</h2>
          <p className="font-heading text-2xl leading-snug font-bold break-words sm:text-3xl">
            <Sentence prompt={kortkaosRules.promptText(best.prompt)} answer={best.text} highlight="text-sun" />
          </p>
          {bestPlayer && (
            <p className="flex items-center gap-2 font-semibold">
              <Emoji emoji={bestPlayer.avatar} className="text-2xl" /> {bestPlayer.name}
            </p>
          )}
        </section>
      )}

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

      <div className="flex flex-col gap-3">
        {isHost ? (
          state.practice ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="sm:flex-1" onClick={onToWaitingRoom}>
                Bjud in kompisar
              </Button>
              <Button size="lg" variant="outline" className="sm:flex-1" onClick={onRematch}>
                Testa igen
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="sm:flex-1" onClick={onRematch} disabled={!canRematch}>
                  Revansch
                </Button>
                <Button size="lg" variant="outline" className="sm:flex-1" onClick={onChangeGame}>
                  Byt spel
                </Button>
              </div>
              {!canRematch && (
                <p className="text-center text-sm text-muted-foreground">
                  Revansch i {game.name} kräver minst {game.minPlayers} spelare, och några har lämnat lobbyn. Byt spel eller
                  vänta på att de kommer tillbaka.
                </p>
              )}
            </>
          )
        ) : (
          <p className="flex items-center justify-center rounded-md border bg-card px-4 py-4 text-center font-semibold text-muted-foreground shadow-soft-sm">
            Värden väljer nästa steg
          </p>
        )}
        <Button asChild size="lg" variant="ghost">
          <Link to="/#spel">Tillbaka till alla spel</Link>
        </Button>
      </div>
    </Wide>
  )
}
