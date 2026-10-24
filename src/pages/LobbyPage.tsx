import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Copy, Crown, Lock, Loader2 } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { PlayerSetup } from '@/components/PlayerSetup'
import { Podium } from '@/components/Podium'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLobby, type OnlinePlayer } from '@/hooks/useLobby'
import { findGame, GAMES } from '@/lib/games'
import {
  GUESS_SECONDS,
  isValidGuess,
  MAX_NUMBER,
  MIN_NUMBER,
  rankPlayers,
  REVEAL_SECONDS,
  ROUND_OPTIONS,
  type GameState,
} from '@/lib/narmast'
import { hostedGame, loadPlayer, normalizeCode, type Player } from '@/lib/player'
import { cn } from '@/lib/utils'

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
  const isHost = hostedGame(code) !== null
  const game = findGame(hostedGame(code)) ?? GAMES[0]
  const { status, state, online, clockOffset, actions } = useLobby(code, me, isHost)

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
          gameName={game.name}
          gameEmoji={game.emoji}
          isHost={isHost}
          online={online}
          rounds={state.rounds}
          onSetRounds={actions.setRounds}
          onStart={actions.start}
        />
      )
    case 'guessing':
      return (
        <GuessingView
          key={state.round}
          state={state}
          me={me}
          online={online}
          clockOffset={clockOffset}
          onGuess={actions.guess}
        />
      )
    case 'reveal':
      return <RevealView state={state} me={me} isHost={isHost} clockOffset={clockOffset} onNext={actions.skipReveal} />
    case 'finished':
      return <FinishedView state={state} isHost={isHost} onPlayAgain={actions.playAgain} />
  }
}

function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">{children}</div>
}

function Wide({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-6">{children}</div>
}

function RoundBadge({ state }: { state: GameState }) {
  return (
    <span className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm">
      Runda {state.round} av {state.rounds}
    </span>
  )
}

/* ---------- Väntrum ---------- */

type WaitingRoomProps = {
  code: string
  gameName: string
  gameEmoji: string
  isHost: boolean
  online: OnlinePlayer[]
  rounds: number
  onSetRounds: (rounds: number) => void
  onStart: () => void
}

function WaitingRoom({ code, gameName, gameEmoji, isHost, online, rounds, onSetRounds, onStart }: WaitingRoomProps) {
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
            {gameEmoji} {gameName} · Lobbykod
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">Antal rundor</p>
          <div className="flex gap-2">
            {ROUND_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={rounds === option ? 'default' : 'outline'}
                className="h-11 min-w-16 rounded-2xl text-base"
                disabled={!isHost}
                onClick={() => onSetRounds(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Gissa ett tal mellan {MIN_NUMBER} och {MAX_NUMBER}. Ni har {GUESS_SECONDS} sekunder på er. Den som är närmast
          det slumpade talet får en poäng.
        </p>
        {isHost ? (
          <Button size="lg" className="h-14 w-full rounded-2xl text-lg shadow-lg shadow-primary/30" onClick={onStart}>
            Starta spelet
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-violet-50 py-4 font-semibold text-primary">
            <Loader2 className="size-5 animate-spin" /> Väntar på att värden startar…
          </p>
        )}
      </div>
    </Wide>
  )
}

/* ---------- Gissa ---------- */

type GuessingViewProps = {
  state: GameState
  me: Player
  online: OnlinePlayer[]
  clockOffset: number
  onGuess: (value: number) => void
}

function GuessingView({ state, me, online, clockOffset, onGuess }: GuessingViewProps) {
  const [value, setValue] = useState(50)
  const [sent, setSent] = useState<number | null>(null)
  const confirmed = state.guesses[me.id]
  const locked = confirmed ?? sent
  const hasGuessed = locked !== null && locked !== undefined
  const inGame = Boolean(state.players[me.id])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidGuess(value) || hasGuessed) return
    setSent(value)
    onGuess(value)
  }

  const activePlayers = online.filter((p) => state.players[p.id])

  return (
    <Wide>
      <div className="flex justify-center">
        <RoundBadge state={state} />
      </div>

      {state.deadline !== null && (
        <Countdown deadline={state.deadline} clockOffset={clockOffset} totalSeconds={GUESS_SECONDS} />
      )}

      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        {!inGame ? (
          <p className="py-8 text-center font-semibold text-muted-foreground">Du är med från nästa match. Häng kvar!</p>
        ) : hasGuessed ? (
          <div className="space-y-3 py-6 text-center">
            <Lock className="mx-auto size-8 text-primary" />
            <p className="text-muted-foreground">Din gissning</p>
            <p className="text-7xl font-black text-primary">{locked}</p>
            <p className="font-semibold text-muted-foreground">Väntar på de andra…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-center text-2xl font-black">
              Vilket tal mellan {MIN_NUMBER} och {MAX_NUMBER}?
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-2xl text-2xl"
                onClick={() => setValue((v) => Math.max(MIN_NUMBER, v - 1))}
                aria-label="Minska"
              >
                −
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_NUMBER}
                max={MAX_NUMBER}
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => setValue(e.target.valueAsNumber)}
                aria-label="Din gissning"
                className="h-20 w-36 rounded-2xl text-center text-5xl font-black"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-2xl text-2xl"
                onClick={() => setValue((v) => Math.min(MAX_NUMBER, v + 1))}
                aria-label="Öka"
              >
                +
              </Button>
            </div>
            <input
              type="range"
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              value={Number.isNaN(value) ? 50 : value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="Dra för att välja tal"
              className="w-full accent-primary"
            />
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full rounded-2xl text-lg shadow-lg shadow-primary/30"
              disabled={!isValidGuess(value)}
            >
              Lås in gissning
            </Button>
          </form>
        )}
      </div>

      <ul className="flex flex-wrap justify-center gap-2">
        {activePlayers.map((p) => {
          const done = state.guesses[p.id] !== undefined
          return (
            <li
              key={p.id}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors',
                done ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-muted-foreground',
              )}
            >
              <span className="text-lg">{p.avatar}</span>
              {p.name}
              {done ? <Check className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
            </li>
          )
        })}
      </ul>
    </Wide>
  )
}

/* ---------- Visa svaret ---------- */

type RevealViewProps = {
  state: GameState
  me: Player
  isHost: boolean
  clockOffset: number
  onNext: () => void
}

function RevealView({ state, me, isHost, clockOffset, onNext }: RevealViewProps) {
  const result = state.lastResult
  const [shownTarget, setShownTarget] = useState<number | null>(null)

  // Liten "rulle"-effekt innan rätt tal visas.
  const target = result?.target
  useEffect(() => {
    if (target === undefined) return
    let ticks = 0
    const timer = setInterval(() => {
      ticks++
      if (ticks >= 12) {
        setShownTarget(target)
        clearInterval(timer)
      } else {
        setShownTarget(Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER)
      }
    }, 70)
    return () => clearInterval(timer)
  }, [target, state.round])

  if (!result) return null
  const rolling = shownTarget !== result.target
  const isLast = state.round >= state.rounds

  const rows = Object.entries(state.players)
    .map(([id, info]) => {
      const guess = result.guesses[id]
      return {
        id,
        ...info,
        guess,
        diff: guess === undefined ? null : Math.abs(guess - result.target),
        winner: result.winners.includes(id),
      }
    })
    .sort((a, b) => (a.diff ?? Infinity) - (b.diff ?? Infinity))

  const iWon = result.winners.includes(me.id)

  return (
    <Wide>
      <div className="flex justify-center">
        <RoundBadge state={state} />
      </div>

      <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-muted-foreground">Det rätta talet var</p>
        <p className={cn('text-8xl font-black tabular-nums', rolling ? 'text-muted-foreground' : 'text-primary')}>
          {shownTarget ?? '?'}
        </p>
        {!rolling && (
          <p className="mt-2 text-lg font-bold">
            {result.winners.length === 0
              ? 'Ingen hann gissa den här gången 😅'
              : iWon
                ? 'Du var närmast! +1 poäng 🎉'
                : result.winners.length > 1
                  ? 'Delad seger!'
                  : `${state.players[result.winners[0]]?.name ?? 'Någon'} var närmast!`}
          </p>
        )}
      </div>

      {!rolling && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm animate-in fade-in slide-in-from-bottom-2',
                row.winner ? 'bg-amber-100 font-bold' : 'bg-white',
              )}
            >
              <span className="text-2xl">{row.avatar}</span>
              <span className="flex-1 truncate">{row.name}</span>
              <span className="w-24 text-right text-sm text-muted-foreground">
                {row.diff === null ? 'Ingen gissning' : `${row.diff} ifrån`}
              </span>
              <span className="w-10 text-right text-xl font-black tabular-nums">{row.guess ?? '–'}</span>
              <span className="w-24 text-right text-sm">
                {row.winner ? '+1 · ' : ''}
                {state.scores[row.id] ?? 0} p
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-center text-sm font-semibold text-muted-foreground">
          {isLast ? 'Prispallen kommer strax' : 'Nästa runda startar strax'}
        </p>
        {state.deadline !== null && (
          <Countdown deadline={state.deadline} clockOffset={clockOffset} totalSeconds={REVEAL_SECONDS} />
        )}
        {isHost && (
          <Button variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={onNext}>
            {isLast ? 'Visa prispallen nu' : 'Nästa runda nu'}
          </Button>
        )}
      </div>
    </Wide>
  )
}

/* ---------- Prispall ---------- */

function FinishedView({ state, isHost, onPlayAgain }: { state: GameState; isHost: boolean; onPlayAgain: () => void }) {
  const ranked = rankPlayers(state)

  return (
    <Wide>
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Matchen är slut!</h1>
        <p className="mt-1 text-muted-foreground">{state.rounds} rundor spelade</p>
      </div>

      <Podium players={ranked} />

      <div className="flex flex-col gap-3 sm:flex-row">
        {isHost ? (
          <Button size="lg" className="h-14 flex-1 rounded-2xl text-lg shadow-lg shadow-primary/30" onClick={onPlayAgain}>
            Spela igen
          </Button>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-2xl bg-white px-4 py-4 text-center font-semibold text-muted-foreground shadow-sm">
            Värden kan starta en ny match
          </p>
        )}
        <Button asChild size="lg" variant="outline" className="h-14 flex-1 rounded-2xl bg-white text-lg">
          <Link to="/#spel">Tillbaka till alla spel</Link>
        </Button>
      </div>
    </Wide>
  )
}
