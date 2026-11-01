import { useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { Sentence } from '@/components/kort/PlayingCard'
import { Leaderboard } from '@/components/Leaderboard'
import { AwardCard } from '@/components/lobby/AwardCard'
import { Choice, NextQuestionChoice } from '@/components/lobby/Choice'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Podium } from '@/components/Podium'
import { Button } from '@/components/ui/button'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { roundWords, type GameInfo } from '@/lib/games'
import { matchHighlights, winnerSummary } from '@/lib/hojdpunkter'
import { bestCard, kortkaosRules } from '@/lib/kortkaos'
import {
  canStart,
  type GameState,
  guessSecondsFor,
  hasTempoSettings,
  leaderboardOrderBefore,
  matchWinners,
  rankLeaderboard,
  rankPlayers,
  type RematchSettings,
  rematchWishCount,
  roundOptionsFor,
} from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

type FinishedViewProps = {
  game: GameInfo
  state: GameState
  isHost: boolean
  meId: string
  // De som är online just nu. En revansch kräver spelets minsta antal spelare.
  online: OnlinePlayer[]
  // Jag vill ha revansch (true) eller ångra (false). Bara för de som inte är värd.
  onWishRematch: (wants: boolean) => void
  // Revansch (och Testa igen efter ett solotest): samma spel och inställningar efter en nedräkning.
  // settings = valen på resultatsidan som gäller nästa match.
  onRematch: (settings: RematchSettings) => void
  // Tillbaka till väntrummet med samma grupp, t.ex. för att bjuda in kompisar efter ett solotest.
  onToWaitingRoom: () => void
  // Till väntrummet med spelvalet i bild.
  onChangeGame: () => void
  // Tillbaka till alla spel. Är andra med får man en fråga först.
  onLeave: () => void
}

export function FinishedView({
  game,
  state,
  isHost,
  meId,
  online,
  onWishRematch,
  onRematch,
  onToWaitingRoom,
  onChangeGame,
  onLeave,
}: FinishedViewProps) {
  const ranked = rankPlayers(state)
  const highlights = matchHighlights(state)
  const best = state.cards ? bestCard(state.cards, matchWinners(state)) : null
  const bestPlayer = best ? state.players[best.player] : undefined
  // Kortspelen slutar i förtid om för få spelare är kvar.
  const endedEarly = state.round < state.rounds
  const canRematch = canStart(state.game, online.length)
  // Önskemål om revansch från de som inte är värd: "3 av 5 vill ha revansch".
  const wishes = rematchWishCount(
    state,
    online.map((p) => p.id),
    online.filter((p) => p.host).map((p) => p.id),
  )
  const iWish = state.rematchWishes.includes(meId)
  const canWish = !state.practice && state.players[meId] !== undefined

  // Snabbval inför nästa match. De skickas med när värden trycker Revansch.
  const tempo = hasTempoSettings(state.game)
  const [rounds, setRounds] = useState(state.rounds)
  const [guessSeconds, setGuessSeconds] = useState(guessSecondsFor(state))
  const [autoAdvance, setAutoAdvance] = useState(state.autoAdvance)
  const [editing, setEditing] = useState(false)
  // En provomgång har inga snabbval: lobbyns inställningar ligger kvar tills ni spelar på riktigt.
  const rematch = () => onRematch(state.practice ? {} : { rounds, ...(tempo ? { guessSeconds, autoAdvance } : {}) })
  const words = roundWords(state.game)
  const settingsSummary = tempo ? `${rounds} ${words.many} · ${guessSeconds} s` : `${rounds} ${words.many}`

  return (
    <Wide>
      <div className="text-center">
        <h1 className="text-4xl">{state.practice ? 'Provrundan är klar!' : 'Matchen är slut!'}</h1>
        <p className="mt-1 text-muted-foreground">
          {game.name} ·{' '}
          {endedEarly
            ? `slutade i ${words.one} ${state.round} av ${state.rounds}`
            : state.rounds === 1
              ? `1 ${words.one} spelad`
              : `${state.rounds} ${words.many} spelade`}
        </p>
      </div>

      {state.practice && (
        <div className="space-y-1 rounded-lg border bg-lilac/40 p-4 text-center">
          <p className="font-heading font-bold">Testläge</p>
          <p className="text-sm">
            Provrundan räknas inte i kvällens ställning. Vill du spela med kompisar? Tryck på Bjud in kompisar, dela
            koden eller länken i lobbyn och starta när de är med.
          </p>
        </div>
      )}

      {endedEarly && (
        <p className="rounded-md bg-coral-soft px-4 py-3 text-center text-sm font-semibold">
          Matchen tog slut i förtid eftersom för få spelare var kvar.
        </p>
      )}

      {state.practice ? (
        <div className="space-y-1 rounded-lg border bg-mint-soft p-5 text-center shadow-soft animate-pop">
          <Emoji emoji={ranked[0]?.avatar ?? '🏆'} className="text-5xl" />
          <p className="font-heading text-2xl font-bold text-balance sm:text-3xl">{winnerSummary(state)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Podium players={ranked} />
          <p className="rounded-full bg-sun-soft px-5 py-2.5 text-center font-heading text-lg font-bold text-balance animate-pop sm:text-xl">
            {winnerSummary(state)}
          </p>
        </div>
      )}

      {/* Valen kommer direkt efter prispallen. På mobil ligger knapparna fast i nederkant (utan att täcka innehållet,
          eftersom sidan har en tom yta längst ner), så att värden alltid når Revansch. */}
      <div
        className={cn(
          'flex flex-col gap-2',
          isHost &&
            'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-20 max-sm:border-t max-sm:bg-background/95 max-sm:p-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur-sm',
        )}
      >
        {isHost ? (
          state.practice ? (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={onToWaitingRoom}>
                Bjud in kompisar
              </Button>
              <Button size="lg" variant="outline" onClick={rematch}>
                Testa mer
              </Button>
            </div>
          ) : (
            <>
              {wishes.wanting > 0 && (
                <p className="text-center font-heading font-bold text-balance motion-safe:animate-pop">
                  {wishes.wanting} vill försöka igen. Kör vi?
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button size="lg" onClick={rematch} disabled={!canRematch}>
                  Revansch
                </Button>
                <Button size="lg" variant="outline" onClick={onChangeGame}>
                  Byt spel
                </Button>
              </div>
              {!canRematch && (
                <p className="text-center text-xs text-muted-foreground sm:text-sm">
                  Revansch i {game.name} kräver minst {game.minPlayers} spelare, och några har lämnat lobbyn. Byt spel eller
                  vänta på att de kommer tillbaka.
                </p>
              )}
            </>
          )
        ) : (
          <div className="space-y-3 rounded-lg border bg-card p-4 text-center shadow-soft-sm">
            <p className="font-semibold text-muted-foreground">Värden väljer nästa steg</p>
            {canWish && (
              <Button
                size="lg"
                variant={iWish ? 'outline' : 'default'}
                className="w-full"
                aria-pressed={iWish}
                onClick={() => onWishRematch(!iWish)}
              >
                {iWish ? 'Ångra önskemålet' : 'Jag vill ha revansch'}
              </Button>
            )}
            {wishes.wanting > 0 && (
              <p className="text-sm font-semibold text-balance">
                {wishes.wanting} av {wishes.of} vill ha revansch
              </p>
            )}
          </div>
        )}
      </div>

      {isHost && !state.practice && (
        <div className="space-y-3">
          <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <span>{settingsSummary} ·</span>
            <Button
              variant="link"
              className="h-11 px-2 text-sm"
              aria-expanded={editing}
              onClick={() => setEditing((open) => !open)}
            >
              {editing ? 'dölj' : 'ändra'}
            </Button>
          </p>
          {editing && (
            <div className="space-y-4 rounded-lg border bg-card p-4 shadow-soft-sm animate-pop">
              <Choice
                label={`Antal ${words.many}`}
                options={roundOptionsFor(state.game).map((n) => ({ value: n, label: String(n) }))}
                selected={rounds}
                onSelect={setRounds}
              />
              {tempo && (
                <>
                  <Choice
                    label="Svarstid"
                    options={(rulesFor(state.game).guessSecondsOptions ?? []).map((s) => ({ value: s, label: `${s} s` }))}
                    selected={guessSeconds}
                    onSelect={setGuessSeconds}
                  />
                  <NextQuestionChoice autoAdvance={autoAdvance} onSelect={setAutoAdvance} />
                </>
              )}
            </div>
          )}
        </div>
      )}

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
        <ul className={cn('grid gap-3', highlights.length > 1 && 'sm:grid-cols-2')} aria-label="Matchens utmärkelser">
          {highlights.map((highlight) => (
            <AwardCard key={highlight.id} highlight={highlight} />
          ))}
        </ul>
      )}

      {/* Raderna glider från ställningen före matchen till den nya. */}
      <Leaderboard
        entries={rankLeaderboard(state)}
        matchesPlayed={state.matchesPlayed}
        gamesPlayed={state.gamesPlayed}
        lastWinners={state.practice ? [] : matchWinners(state)}
        glideFrom={state.practice ? undefined : leaderboardOrderBefore(rankLeaderboard(state), matchWinners(state))}
      />

      <Button size="lg" variant="ghost" onClick={onLeave}>
        Tillbaka till alla spel
      </Button>
      {/* Plats för den fasta knappraden på mobil. */}
      {isHost && <div className="h-24 sm:hidden" aria-hidden />}
    </Wide>
  )
}
