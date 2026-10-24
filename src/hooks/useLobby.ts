import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { findGame } from '@/lib/games'
import { supabase } from '@/lib/supabase'
import type { Player } from '@/lib/player'
import {
  addGuess,
  addPlayers,
  backToWaiting,
  everyoneHasGuessed,
  initialState,
  nextRound,
  resolveRound,
  setGame,
  setRounds,
  startGame,
  type GameState,
  type PlayerInfo,
} from '@/lib/narmast'

// Hur lobbyn fungerar:
// - Alla i lobbyn ansluter till samma Supabase Realtime-kanal (lobby:KOD). Inga databastabeller behövs.
// - Presence visar vilka som är online just nu.
// - Värden (den som skapade lobbyn) äger spelets tillstånd och skickar ut det till alla med broadcast.
// - Övriga spelare skickar bara sina gissningar till värden.

export type OnlinePlayer = Player & {
  host: boolean
  joinedAt: number
}

export type LobbyStatus = 'connecting' | 'ready' | 'no-host' | 'error'

const NO_HOST_GRACE_MS = 4000

// game används bara av värden. Övriga får spelet från värdens tillstånd.
export function useLobby(code: string, me: Player | null, isHost: boolean, game?: string) {
  const [state, setState] = useState<GameState>(() => initialState(game))
  // Övriga spelare: har vi fått något tillstånd från värden än?
  const [received, setReceived] = useState(false)
  const [online, setOnline] = useState<OnlinePlayer[]>([])
  const [connected, setConnected] = useState(false)
  const [failed, setFailed] = useState(false)
  const [graceOver, setGraceOver] = useState(false)
  // Skillnaden mellan min klocka och värdens klocka (ms). Används för nedräkningen.
  const [clockOffset, setClockOffset] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef<GameState>(state)
  const onlineRef = useRef<OnlinePlayer[]>([])

  // Värden: uppdatera lokalt och skicka ut till alla.
  const publish = useCallback((next: GameState) => {
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'state',
      payload: { state: next, sentAt: Date.now() },
    })
  }, [])

  // Värden: avsluta rundan direkt om alla som är online har gissat.
  const resolveIfEveryoneGuessed = useCallback(
    (current: GameState) => {
      const ids = onlineRef.current.map((p) => p.id)
      if (current.phase === 'guessing' && everyoneHasGuessed(current, ids)) {
        return resolveRound(current, Date.now())
      }
      return current
    },
    [],
  )

  useEffect(() => {
    if (!me || !code) return

    const channel = supabase.channel(`lobby:${code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: me.id },
      },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const raw = channel.presenceState<OnlinePlayer>()
      const players: OnlinePlayer[] = Object.values(raw)
        .map((metas) => metas[0])
        .filter((meta) => Boolean(meta?.id))
        .map(({ id, name, avatar, host, joinedAt }) => ({ id, name, avatar, host, joinedAt }))
        .sort((a, b) => a.joinedAt - b.joinedAt)
      onlineRef.current = players
      setOnline(players)

      if (isHost) {
        const infos: Record<string, PlayerInfo> = {}
        for (const p of players) infos[p.id] = { name: p.name, avatar: p.avatar }
        // Nya spelare får vara med direkt i väntrummet. Under en match kommer de in med noll poäng.
        let next = addPlayers(stateRef.current, infos)
        next = resolveIfEveryoneGuessed(next)
        publish(next)
      }
    })

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isHost) return
      const { state: next, sentAt } = payload as { state: GameState; sentAt: number }
      stateRef.current = next
      setState(next)
      setReceived(true)
      setClockOffset(Date.now() - sentAt)
    })

    channel.on('broadcast', { event: 'guess' }, ({ payload }) => {
      if (!isHost) return
      const { id, value } = payload as { id: string; value: number }
      let next = addGuess(stateRef.current, id, value)
      next = resolveIfEveryoneGuessed(next)
      publish(next)
    })

    channel.on('broadcast', { event: 'hello' }, () => {
      // Någon har precis anslutit: skicka det aktuella läget till alla.
      if (!isHost) return
      void channel.send({
        type: 'broadcast',
        event: 'state',
        payload: { state: stateRef.current, sentAt: Date.now() },
      })
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true)
        await channel.track({
          id: me.id,
          name: me.name,
          avatar: me.avatar,
          host: isHost,
          joinedAt: Date.now(),
        } satisfies OnlinePlayer)
        if (!isHost) {
          void channel.send({ type: 'broadcast', event: 'hello', payload: {} })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setFailed(true)
      }
    })

    const graceTimer = setTimeout(() => setGraceOver(true), NO_HOST_GRACE_MS)

    return () => {
      clearTimeout(graceTimer)
      channelRef.current = null
      setConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [code, me, isHost, publish, resolveIfEveryoneGuessed])

  // Värden: tidtagning för gissning och visning av svaret.
  useEffect(() => {
    if (!isHost || state.deadline === null) return
    if (state.phase !== 'guessing' && state.phase !== 'reveal') return

    const delay = Math.max(0, state.deadline - Date.now()) + 300
    const timer = setTimeout(() => {
      const current = stateRef.current
      if (current.phase === 'guessing') publish(resolveRound(current, Date.now()))
      else if (current.phase === 'reveal') publish(nextRound(current, Date.now()))
    }, delay)
    return () => clearTimeout(timer)
  }, [isHost, state.phase, state.deadline, state.round, publish])

  const hostOnline = online.some((p) => p.host)

  let status: LobbyStatus = 'connecting'
  if (failed) status = 'error'
  else if (connected && (isHost || (hostOnline && received))) status = 'ready'
  else if (connected && graceOver && !hostOnline) status = 'no-host'

  const actions = useMemo(
    () => ({
      setRounds: (rounds: number) => {
        if (isHost) publish(setRounds(stateRef.current, rounds))
      },
      setGame: (game: string) => {
        if (isHost && findGame(game)?.playable) publish(setGame(stateRef.current, game))
      },
      start: () => {
        if (!isHost) return
        const ids = onlineRef.current.map((p) => p.id)
        publish(startGame(stateRef.current, ids, Date.now()))
      },
      guess: (value: number) => {
        if (!me) return
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'guess',
          payload: { id: me.id, value },
        })
      },
      skipReveal: () => {
        if (isHost) publish(nextRound(stateRef.current, Date.now()))
      },
      playAgain: () => {
        if (isHost) publish(backToWaiting(stateRef.current))
      },
    }),
    [isHost, me, publish],
  )

  return { status, state, online, clockOffset, actions }
}
