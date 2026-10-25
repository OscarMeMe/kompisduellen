import { useState } from 'react'
import { Check, Copy, Crown, Loader2 } from 'lucide-react'
import { Leaderboard } from '@/components/Leaderboard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Button } from '@/components/ui/button'
import type { OnlinePlayer } from '@/hooks/useLobby'
import { GAMES, type GameInfo } from '@/lib/games'
import { rankLeaderboard, ROUND_OPTIONS, type GameState } from '@/lib/match'
import { rulesFor } from '@/lib/spelregler'
import { cn } from '@/lib/utils'

type WaitingRoomProps = {
  code: string
  game: GameInfo
  state: GameState
  isHost: boolean
  online: OnlinePlayer[]
  onSetRounds: (rounds: number) => void
  onSetGame: (game: string) => void
  onStart: () => void
}

export function WaitingRoom({ code, game, state, isHost, online, onSetRounds, onSetGame, onStart }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/lobby/${code}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Urklipp blockerat: koden syns ändå på skärmen.
    }
  }

  return (
    <Wide>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">
            {game.emoji} {game.name} · Lobbykod
          </p>
          <p className="text-6xl font-black tracking-[0.25em] text-primary">{code}</p>
          <Button variant="outline" size="lg" className="h-12 w-full rounded-2xl text-base" onClick={copyLink}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Länken är kopierad' : 'Kopiera inbjudningslänk'}
          </Button>
          <p className="text-sm text-muted-foreground">Kompisarna går in på sidan och skriver koden, eller öppnar länken.</p>
        </div>

        <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-black">Spelare</h2>
            <span className="text-sm text-muted-foreground">{online.length} i lobbyn</span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {online.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 animate-in fade-in zoom-in-95">
                <span className="text-2xl">{p.avatar}</span>
                <span className="flex-1 truncate font-semibold">{p.name}</span>
                {p.host && <Crown className="size-4 text-amber-500" aria-label="Värd" />}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-black">Välj spel</h2>
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
                    'h-auto justify-start gap-3 rounded-2xl border-2 p-4 text-left whitespace-normal',
                    selected ? 'border-primary bg-violet-50 disabled:opacity-100' : 'bg-white',
                  )}
                >
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', option.color)}>
                    <option.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-violet-900">{option.name}</span>
                    <span className="block text-sm font-normal text-muted-foreground">{option.tagline}</span>
                  </span>
                  {selected && <Check className="size-5 shrink-0 text-primary" aria-label="Valt" />}
                </Button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">Antal rundor</p>
          <div className="flex gap-2">
            {ROUND_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={state.rounds === option ? 'default' : 'outline'}
                className="h-11 min-w-16 rounded-2xl text-base"
                disabled={!isHost}
                onClick={() => onSetRounds(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{rulesFor(state.game).howTo}</p>
        {isHost ? (
          <Button size="lg" className="h-14 w-full rounded-2xl text-lg shadow-lg shadow-primary/30" onClick={onStart}>
            Starta {game.name}
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-violet-50 py-4 font-semibold text-primary">
            <Loader2 className="size-5 animate-spin" /> Väntar på att värden startar {game.name}…
          </p>
        )}
      </div>

      <Leaderboard entries={rankLeaderboard(state)} matchesPlayed={state.matchesPlayed} gamesPlayed={state.gamesPlayed} />
    </Wide>
  )
}
