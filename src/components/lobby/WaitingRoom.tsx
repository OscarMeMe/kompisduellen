import { useId, useState } from 'react'
import { Check, ChevronDown, Crown, Loader2 } from 'lucide-react'
import { Emoji } from '@/components/Emoji'
import { Leaderboard } from '@/components/Leaderboard'
import { InviteCard } from '@/components/lobby/InviteCard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Button } from '@/components/ui/button'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { GAMES, type GameInfo } from '@/lib/games'
import {
  canStart,
  guessSecondsFor,
  hasTempoSettings,
  rankLeaderboard,
  roundOptionsFor,
  type GameState,
} from '@/lib/match'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

type WaitingRoomProps = {
  code: string
  game: GameInfo
  state: GameState
  isHost: boolean
  // Den egna spelaren, som markeras med "Du".
  meId: string
  online: OnlinePlayer[]
  onSetRounds: (rounds: number) => void
  onSetGame: (game: string) => void
  onSetTempo: (tempo: { guessSeconds?: number; autoAdvance?: boolean }) => void
  onStart: () => void
}

export function WaitingRoom({
  code,
  game,
  state,
  isHost,
  meId,
  online,
  onSetRounds,
  onSetGame,
  onSetTempo,
  onStart,
}: WaitingRoomProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsId = useId()
  const rules = rulesFor(state.game)
  // Kortspelen har egen beskrivning och poängförklaring.
  const cardRules = cardRulesFor(state.game)
  const howTo = cardRules ? cardRules.howTo : rules.howTo(guessSecondsFor(state))
  const scoringDetails = cardRules ? cardRules.scoringDetails : rules.scoringDetails
  const startable = canStart(state.game, online.length)
  const practice = startable && online.length === 1
  const hostName = online.find((p) => p.host)?.name

  // En rad som sammanfattar inställningarna: antal rundor och, för spel med tempo, svarstid och vad som händer efter facit.
  const summary = [
    `${state.rounds} rundor`,
    ...(hasTempoSettings(state.game)
      ? [`${guessSecondsFor(state)} s svarstid`, state.autoAdvance ? 'automatiskt vidare' : 'värden går vidare']
      : []),
  ].join(' · ')

  return (
    <Wide>
      {/* Spelet, antal spelare och startknappen först, så att värden inte behöver scrolla. */}
      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-soft sm:p-5" aria-label="Spelet">
        <div className="flex items-center gap-3">
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-md text-3xl', game.color)}>
            <Emoji emoji={game.emoji} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight">{game.name}</h1>
            <p className="text-sm text-muted-foreground">
              👥 {online.length} i lobbyn · {summary}
            </p>
          </div>
        </div>

        {practice && (
          <p className="rounded-md bg-lilac/40 px-3 py-2 text-sm">
            <strong>Testläge:</strong> du är ensam, så det blir en provomgång som inte räknas i kvällens ställning. Dela
            koden nedan om du vill spela med kompisar.
          </p>
        )}

        {isHost ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={onStart} disabled={!startable}>
              {practice ? `Testa ${game.name} själv` : `Starta ${game.name}`}
            </Button>
            {!startable && (
              <p className="text-center text-sm text-muted-foreground">
                Minst {game.minPlayers} spelare behövs. Bjud in {game.minPlayers > 2 ? 'fler kompisar' : 'en kompis'} med koden nedan.
              </p>
            )}
            <Button
              variant="ghost"
              className="w-full"
              aria-expanded={settingsOpen}
              aria-controls={settingsId}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              Ändra inställningar
              <ChevronDown className={cn('transition-transform', settingsOpen && 'rotate-180')} aria-hidden />
            </Button>
          </div>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-md bg-coral-soft px-3 py-3 text-center font-semibold">
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            Väntar på att {hostName ?? 'värden'} startar {game.name}…
          </p>
        )}
      </section>

      {/* Inställningarna ligger bakom "Ändra inställningar" och visas bara för värden. */}
      {isHost && settingsOpen && (
        <section id={settingsId} className="space-y-5 rounded-lg border bg-card p-4 shadow-soft sm:p-6" aria-label="Inställningar">
          <div className="space-y-3">
            <h2 className="text-xl">Välj spel</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {GAMES.filter((g) => g.playable).map((option) => {
                const selected = option.id === game.id
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    aria-pressed={selected}
                    onClick={() => onSetGame(option.id)}
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
                    </span>
                    {selected && <Check className="size-5 shrink-0 text-primary" aria-label="Valt" />}
                  </Button>
                )
              })}
            </div>
          </div>

          <Choice
            label="Antal rundor"
            options={roundOptionsFor(state.game).map((n) => ({ value: n, label: String(n) }))}
            selected={state.rounds}
            onSelect={onSetRounds}
          />

          {/* Tempo för spel som har det (Gissa priset). Gäller hela lobbyn. */}
          {hasTempoSettings(state.game) && (
            <>
              <Choice
                label="Svarstid"
                options={(rules.guessSecondsOptions ?? []).map((s) => ({ value: s, label: `${s} s` }))}
                selected={guessSecondsFor(state)}
                onSelect={(guessSeconds) => onSetTempo({ guessSeconds })}
              />
              <Choice
                label="Efter facit"
                hint={state.autoAdvance ? undefined : 'Facit står kvar tills värden går vidare.'}
                options={[
                  { value: 1, label: 'Automatiskt' },
                  { value: 0, label: 'Värden går vidare' },
                ]}
                selected={state.autoAdvance ? 1 : 0}
                onSelect={(value) => onSetTempo({ autoAdvance: value === 1 })}
              />
            </>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <InviteCard code={code} game={game} />

        <section className="min-w-0 space-y-3 rounded-lg border bg-card p-4 shadow-soft sm:p-5" aria-label="Spelare">
          <h2 className="text-xl">Spelare</h2>
          <ul className="flex flex-wrap gap-2">
            {online.map((p) => (
              <li key={p.id} className="flex max-w-full min-w-0 items-center gap-2 rounded-full bg-muted py-1.5 pr-3 pl-2 animate-pop">
                <Emoji emoji={p.avatar} className="text-xl" />
                <span className="truncate font-semibold">{p.name}</span>
                {p.id === meId && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Du</span>
                )}
                {p.host && <Crown className="size-4 shrink-0 text-amber-500" aria-label="Värd" />}
              </li>
            ))}
          </ul>
        </section>
      </div>

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

      <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />
    </Wide>
  )
}

type ChoiceProps = {
  label: string
  hint?: string
  options: { value: number; label: string }[]
  selected: number
  onSelect: (value: number) => void
}

// En rad med val, t.ex. antal rundor. Valt alternativ har en bock, så att det inte bara syns på färgen.
function Choice({ label, hint, options, selected, onSelect }: ChoiceProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p id={labelId} className="font-bold">
          {label}
        </p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <Button
              key={option.value}
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              className="h-11 min-w-16 text-base"
              onClick={() => onSelect(option.value)}
            >
              {active && <Check aria-hidden />}
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
