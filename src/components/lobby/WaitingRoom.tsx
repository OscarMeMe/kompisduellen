import { useId } from 'react'
import { Check, Crown, Loader2 } from 'lucide-react'
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
  online,
  onSetRounds,
  onSetGame,
  onSetTempo,
  onStart,
}: WaitingRoomProps) {
  const rules = rulesFor(state.game)
  // Kortspelen har egen beskrivning och poängförklaring.
  const cardRules = cardRulesFor(state.game)
  const howTo = cardRules ? cardRules.howTo : rules.howTo(guessSecondsFor(state))
  const scoringDetails = cardRules ? cardRules.scoringDetails : rules.scoringDetails
  const startable = canStart(state.game, online.length)
  const practice = startable && online.length === 1

  return (
    <Wide>
      <div className="grid gap-6 md:grid-cols-2">
        <InviteCard code={code} game={game} />

        <div className="min-w-0 space-y-3 rounded-lg border bg-card p-6 shadow-soft">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl">Spelare</h2>
            <span className="text-sm text-muted-foreground">{online.length} i lobbyn</span>
          </div>
          <ul className="grid gap-2 min-[360px]:grid-cols-2">
            {online.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-3 py-2 animate-pop">
                <Emoji emoji={p.avatar} className="text-2xl" />
                <span className="flex-1 truncate font-semibold">{p.name}</span>
                {p.host && <Crown className="size-4 shrink-0 text-amber-500" aria-label="Värd" />}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-5 rounded-lg border bg-card p-6 shadow-soft">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Välj spel</h2>
            {!isHost && <span className="text-sm text-muted-foreground">Värden väljer</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {GAMES.filter((g) => g.playable).map((option) => {
              const selected = option.id === game.id
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  aria-pressed={selected}
                  disabled={!isHost}
                  onClick={() => onSetGame(option.id)}
                  className={cn(
                    'h-auto justify-start gap-3 rounded-lg border-2 p-4 text-left whitespace-normal',
                    selected ? 'border-primary bg-coral-soft disabled:opacity-100' : 'bg-card',
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
          disabled={!isHost}
          onSelect={onSetRounds}
        />

        {/* Tempo för spel som har det (Gissa priset). Gäller hela lobbyn. */}
        {hasTempoSettings(state.game) && (
          <>
            <Choice
              label="Svarstid"
              options={(rules.guessSecondsOptions ?? []).map((s) => ({ value: s, label: `${s} s` }))}
              selected={guessSecondsFor(state)}
              disabled={!isHost}
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
              disabled={!isHost}
              onSelect={(value) => onSetTempo({ autoAdvance: value === 1 })}
            />
          </>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{howTo}</p>
          <details className="rounded-md bg-muted px-4 text-sm">
            {/* Hela raden är tryckbar, minst 44 px hög. */}
            <summary className="-mx-4 cursor-pointer px-4 py-3 font-semibold">Så räknas poängen</summary>
            <ul className="list-disc space-y-1 pb-3 pl-5 text-muted-foreground">
              {scoringDetails.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </div>

        {practice && (
          <p className="rounded-md bg-lilac/40 px-4 py-3 text-sm">
            <strong>Testläge:</strong> du är ensam i lobbyn, så det blir en provomgång som inte räknas i kvällens ställning.
            Vill du spela med kompisar? Dela koden eller länken ovan och starta när de är med.
          </p>
        )}

        {isHost ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={onStart} disabled={!startable}>
              {practice ? `Testa ${game.name} själv` : `Starta ${game.name}`}
            </Button>
            {!startable && (
              <p className="text-center text-sm text-muted-foreground">
                Minst {game.minPlayers} spelare behövs. Bjud in {game.minPlayers > 2 ? 'fler kompisar' : 'en kompis'} med koden ovan.
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-md bg-coral-soft py-4 font-semibold">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Väntar på att värden startar {game.name}…
          </p>
        )}
      </div>

      <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />
    </Wide>
  )
}

type ChoiceProps = {
  label: string
  hint?: string
  options: { value: number; label: string }[]
  selected: number
  disabled: boolean
  onSelect: (value: number) => void
}

// En rad med val, t.ex. antal rundor. Valt alternativ har en bock, så att det inte bara syns på färgen.
function Choice({ label, hint, options, selected, disabled, onSelect }: ChoiceProps) {
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
              className="h-11 min-w-16 text-base disabled:opacity-100 data-[active=false]:disabled:opacity-60"
              data-active={active}
              disabled={disabled}
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
