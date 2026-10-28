import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { findGame } from '@/lib/games'
import { myHand, type CardMove, type CardSecrets, type MyHand } from '@/lib/kort'
import { track } from '@/lib/statistik'
import { supabase } from '@/lib/supabase'
import { loadHostLobby, saveHostLobby, type Player } from '@/lib/player'
import { acceptReaction, canSendReaction, findReaction, REACTION_VISIBLE_MS } from '@/lib/reaktioner'
import type { FloatingReaction } from '@/components/lobby/Reactions'
import {
  addGuess,
  addPlayers,
  backToWaiting,
  cancelRematch,
  everyoneHasGuessed,
  hostAdvance,
  hostDeadline,
  hostMove,
  hostPresence,
  hostCountdownStart,
  hostRematch,
  hostRematchStart,
  hostStart,
  initialState,
  pauseReveal,
  resolveRound,
  resumeReveal,
  restoreHostState,
  setGame,
  setRounds,
  setTempo,
  type GameState,
  type HostState,
  type PlayerInfo,
  type RematchSettings,
} from '@/lib/match'

// Hur lobbyn fungerar:
// - Alla i lobbyn ansluter till samma Supabase Realtime-kanal (lobby:KOD). Inga databastabeller behövs.
// - Presence visar vilka som är online just nu.
// - Värden (den som skapade lobbyn) äger spelets tillstånd och skickar ut det till alla med broadcast.
// - Övriga spelare skickar bara sina gissningar (guess) eller kortdrag (move) till värden.
// - Kortspelen: värden har hemlig data (leken, allas händer och vem som spelade vad) som aldrig skickas
//   med tillståndet. Varje spelare får sin egen hand i ett eget meddelande (hand), som andra flikar
//   slänger. Det räcker för ett kompisspel, men den som läser nätverkstrafiken kan se andras händer.
// - Värden sparar allt i fliken (sessionStorage), så att matchen fortsätter om värden laddar om sidan.

export type OnlinePlayer = Player & {
  host: boolean
  joinedAt: number
}

export type LobbyStatus = 'connecting' | 'ready' | 'no-host' | 'error'

const NO_HOST_GRACE_MS = 4000
// Så länge räknas en spelare som tappat nätet (eller laddar om) fortfarande som med i ett kortspel,
// så att domaren inte byts och matchen inte tar slut i onödan.
const AWAY_GRACE_MS = 10_000

// game används bara av värden. Övriga får spelet från värdens tillstånd.
export function useLobby(code: string, me: Player | null, isHost: boolean, game?: string) {
  // Värden: fortsätt där vi var om sidan laddades om.
  const [restored] = useState(() => {
    const host = isHost ? restoreHostState(loadHostLobby(code)) : null
    return host && { ...host, at: Date.now() }
  })
  const [state, setState] = useState<GameState>(() => restored?.state ?? initialState(game))
  // Övriga spelare: har vi fått något tillstånd från värden än?
  const [received, setReceived] = useState(false)
  const [online, setOnline] = useState<OnlinePlayer[]>([])
  const [connected, setConnected] = useState(false)
  const [failed, setFailed] = useState(false)
  const [graceOver, setGraceOver] = useState(false)
  // Skillnaden mellan min klocka och värdens klocka (ms). Används för nedräkningen.
  const [clockOffset, setClockOffset] = useState(0)
  // Kortspelen: min egen hand, som värden skickar bara till mig.
  const [hand, setHand] = useState<MyHand | null>(null)
  // Reaktioner som syns på skärmen just nu.
  const [floating, setFloating] = useState<FloatingReaction[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef<GameState>(state)
  const onlineRef = useRef<OnlinePlayer[]>([])
  // Reaktioner: när jag skickade senast, och vad som släppts igenom från varje spelare (se reaktioner.ts).
  const lastReactionRef = useRef<number | null>(null)
  const reactionHistoryRef = useRef<Record<string, number[]>>({})
  // Värden: kortspelens hemliga data, och händerna som senast skickades till varje spelare.
  const secretsRef = useRef<CardSecrets | null>(restored?.secrets ?? null)
  const sentHandsRef = useRef<Record<string, string>>({})
  // Värden: när spelare som inte längre är online sågs senast. Efter en omladdning räknas alla i
  // matchen som nyss sedda, så att de hinner ansluta igen.
  const lastSeenRef = useRef<Record<string, number>>(
    Object.fromEntries(Object.keys(restored?.state.players ?? {}).map((id) => [id, restored!.at])),
  )
  // När matchen startade (ms), för statistiken.
  const matchStartRef = useRef(0)
  // Övriga spelare: har vi räknat att vi gick med i lobbyn?
  const joinTrackedRef = useRef(false)

  const save = useCallback(() => {
    saveHostLobby(code, { state: stateRef.current, secrets: secretsRef.current } satisfies HostState)
  }, [code])

  // Värden: uppdatera lokalt och skicka ut till alla.
  const publish = useCallback(
    (next: GameState) => {
      const prev = stateRef.current
      if (next === prev) return
      trackMatch(prev, next, matchStartRef)
      stateRef.current = next
      setState(next)
      save()
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'state',
        payload: { state: next, sentAt: Date.now() },
      })
    },
    [save],
  )

  // Värden: skicka varje spelares hand till spelaren, men bara när den har ändrats.
  const sendHands = useCallback(() => {
    const secrets = secretsRef.current
    if (!secrets) {
      sentHandsRef.current = {}
      return
    }
    for (const id of Object.keys(secrets.hands)) {
      const view = myHand(secrets, id)
      const json = JSON.stringify(view)
      if (sentHandsRef.current[id] === json) continue
      sentHandsRef.current[id] = json
      void channelRef.current?.send({ type: 'broadcast', event: 'hand', payload: { to: id, hand: view } })
    }
  }, [])

  // Värden: ta emot ett nytt tillstånd med hemlig data, skicka ut det och de händer som ändrats.
  const commit = useCallback(
    (next: HostState) => {
      const secretsChanged = next.secrets !== secretsRef.current
      secretsRef.current = next.secrets
      publish(next.state)
      if (secretsChanged) {
        save()
        sendHands()
      }
    },
    [publish, save, sendHands],
  )

  const current = useCallback((): HostState => ({ state: stateRef.current, secrets: secretsRef.current }), [])

  // Spelare som är med: online nu, eller borta kortare tid än AWAY_GRACE_MS.
  const activeIds = useCallback((): string[] => {
    const now = Date.now()
    const ids = new Set(onlineRef.current.map((p) => p.id))
    for (const [id, seen] of Object.entries(lastSeenRef.current)) {
      if (now - seen < AWAY_GRACE_MS) ids.add(id)
    }
    return [...ids]
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
    // Värden: kollar närvaron igen när någon som gått varit borta för länge.
    let awayTimer: ReturnType<typeof setTimeout> | undefined

    channel.on('presence', { event: 'sync' }, () => {
      const raw = channel.presenceState<OnlinePlayer>()
      const players: OnlinePlayer[] = Object.values(raw)
        .map((metas) => metas[0])
        .filter((meta) => Boolean(meta?.id))
        .map(({ id, name, avatar, host, joinedAt }) => ({ id, name, avatar, host, joinedAt }))
        .sort((a, b) => a.joinedAt - b.joinedAt)
      const now = Date.now()
      for (const p of onlineRef.current) {
        if (!players.some((other) => other.id === p.id)) lastSeenRef.current[p.id] = now
      }
      for (const p of players) delete lastSeenRef.current[p.id]
      onlineRef.current = players
      setOnline(players)

      if (isHost) {
        const infos: Record<string, PlayerInfo> = {}
        for (const p of players) infos[p.id] = { name: p.name, avatar: p.avatar }
        // Nya spelare får vara med direkt i väntrummet. Under en match kommer de in med noll poäng.
        let next = addPlayers(stateRef.current, infos)
        next = resolveIfEveryoneGuessed(next)
        commit(hostPresence({ state: next, secrets: secretsRef.current }, activeIds(), now))

        clearTimeout(awayTimer)
        if (Object.keys(lastSeenRef.current).length > 0) {
          awayTimer = setTimeout(() => commit(hostPresence(current(), activeIds(), Date.now())), AWAY_GRACE_MS + 300)
        }
      }
    })

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isHost) return
      const { state: next, sentAt } = payload as { state: GameState; sentAt: number }
      stateRef.current = next
      setState(next)
      setReceived(true)
      if (!joinTrackedRef.current) {
        joinTrackedRef.current = true
        track('lobby_gick_med', { spel: next.game })
      }
      setClockOffset(Date.now() - sentAt)
    })

    // Min hand i ett kortspel. Meddelanden till andra spelare slängs direkt.
    channel.on('broadcast', { event: 'hand' }, ({ payload }) => {
      const { to, hand: next } = payload as { to: string; hand: MyHand | null }
      if (to === me.id) setHand(next)
    })

    // En reaktion från någon i lobbyn. Okända reaktioner och för många från samma spelare slängs.
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const { id, reaction } = (payload ?? {}) as { id?: string; reaction?: string }
      const def = findReaction(reaction)
      if (!id || !def) return
      const who = onlineRef.current.find((p) => p.id === id) ?? stateRef.current.players[id]
      if (!who) return
      const now = Date.now()
      const history = acceptReaction(reactionHistoryRef.current[id] ?? [], now)
      if (!history) return
      reactionHistoryRef.current[id] = history
      const item: FloatingReaction = {
        key: `${id}-${now}-${Math.random()}`,
        name: who.name,
        avatar: who.avatar,
        emoji: def.emoji,
        left: 15 + Math.random() * 70,
      }
      setFloating((list) => [...list.slice(-7), item])
      setTimeout(() => setFloating((list) => list.filter((other) => other.key !== item.key)), REACTION_VISIBLE_MS)
    })

    channel.on('broadcast', { event: 'guess' }, ({ payload }) => {
      if (!isHost) return
      const { id, value } = payload as { id: string; value: number }
      let next = addGuess(stateRef.current, id, value, Date.now())
      next = resolveIfEveryoneGuessed(next)
      publish(next)
    })

    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      if (!isHost) return
      const { id, move } = payload as { id: string; move: CardMove }
      commit(hostMove(current(), id, move, activeIds(), Date.now()))
    })

    channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
      // Någon har precis anslutit: skicka det aktuella läget till alla, och spelarens hand igen.
      if (!isHost) return
      void channel.send({
        type: 'broadcast',
        event: 'state',
        payload: { state: stateRef.current, sentAt: Date.now() },
      })
      const id = (payload as { id?: string } | undefined)?.id
      if (id) {
        delete sentHandsRef.current[id]
        sendHands()
      }
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
        if (isHost) {
          // Efter en omladdning: skicka allas händer igen.
          sentHandsRef.current = {}
          sendHands()
        } else {
          void channel.send({ type: 'broadcast', event: 'hello', payload: { id: me.id } })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setFailed(true)
      }
    })

    const graceTimer = setTimeout(() => setGraceOver(true), NO_HOST_GRACE_MS)

    return () => {
      clearTimeout(graceTimer)
      clearTimeout(awayTimer)
      channelRef.current = null
      setConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [code, me, isHost, publish, commit, current, activeIds, sendHands, resolveIfEveryoneGuessed])

  // Värden: tidtagning för varje steg i rundan. Timern gäller bara sin egen deadline, så den gör
  // ingenting om rundan redan gått vidare eller värden hoppat fram (se handleDeadline).
  useEffect(() => {
    const deadline = state.deadline
    if (!isHost || deadline === null) return
    if (state.phase !== 'guessing' && state.phase !== 'reveal' && state.phase !== 'playing') return

    const delay = Math.max(0, deadline - Date.now()) + 300
    const timer = setTimeout(() => commit(hostDeadline(current(), Date.now(), deadline, activeIds())), delay)
    return () => clearTimeout(timer)
  }, [isHost, state.phase, state.deadline, state.round, commit, current, activeIds])

  // Värden: revanschens nedräkning är slut, så matchen startar. Timern gäller bara sin egen klocka (rematchAt),
  // så en gammal eller avbruten nedräkning startar ingenting (se hostRematchStart).
  useEffect(() => {
    const at = state.rematchAt
    if (!isHost || state.phase !== 'waiting' || at === null) return
    const delay = Math.max(0, at - Date.now()) + 100
    const timer = setTimeout(() => {
      const ids = onlineRef.current.map((p) => p.id)
      commit(hostRematchStart(current(), ids, Date.now(), at))
    }, delay)
    return () => clearTimeout(timer)
  }, [isHost, state.phase, state.rematchAt, commit, current])

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
        if (!isHost || !findGame(game)?.playable) return
        const from = stateRef.current.game
        const next = setGame(stateRef.current, game)
        if (next.game !== from) track('bytte_spel', { fran_spel: from, till_spel: next.game })
        publish(next)
      },
      setTempo: (tempo: { guessSeconds?: number; autoAdvance?: boolean }) => {
        if (isHost) publish(setTempo(stateRef.current, tempo))
      },
      start: () => {
        if (!isHost) return
        const ids = onlineRef.current.map((p) => p.id)
        commit(hostStart(current(), ids, Date.now()))
      },
      // Första starten med nedräkning (Starta när flera är med). Solotestet startar direkt med start.
      startCountdown: () => {
        if (!isHost) return
        const ids = onlineRef.current.map((p) => p.id)
        commit(hostCountdownStart(current(), ids, Date.now()))
      },
      guess: (value: number) => {
        if (!me) return
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'guess',
          payload: { id: me.id, value },
        })
      },
      // Kortspelen: välja kort, klicka Klar eller (för domaren) välja vinnare.
      move: (move: CardMove) => {
        if (!me) return
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: { id: me.id, move },
        })
      },
      // round = rundan som visades när värden klickade. Ett dubbelklick hoppar inte över en runda.
      skipReveal: (round: number) => {
        if (isHost) commit(hostAdvance(current(), Date.now(), round, activeIds()))
      },
      // En liten reaktion till alla i lobbyn. Knapparna väntar en stund efter varje tryck.
      react: (reactionId: string) => {
        if (!me || !findReaction(reactionId)) return
        const now = Date.now()
        if (!canSendReaction(lastReactionRef.current, now)) return
        lastReactionRef.current = now
        void channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { id: me.id, reaction: reactionId } })
      },
      // Värden pausar och fortsätter nedräkningen efter facit. round = rundan som visades.
      pauseReveal: (round: number) => {
        if (isHost && me) publish(pauseReveal(stateRef.current, Date.now(), round, me.name))
      },
      resumeReveal: (round: number) => {
        if (isHost) publish(resumeReveal(stateRef.current, Date.now(), round))
      },
      // Tillbaka till väntrummet med samma grupp och kvällens ställning (Byt spel, Bjud in kompisar).
      playAgain: () => {
        if (!isHost) return
        commit({ state: backToWaiting(stateRef.current), secrets: null })
      },
      // Revansch: samma spel och inställningar efter en gemensam nedräkning som alla ser.
      rematch: (settings?: RematchSettings) => {
        if (!isHost) return
        const next = hostRematch(current(), Date.now(), settings)
        if (next.state !== stateRef.current) track('spelade_igen', { spel: next.state.game })
        commit(next)
      },
      cancelRematch: () => {
        if (isHost) commit(cancelRematch(current()))
      },
    }),
    [isHost, me, publish, commit, current, activeIds],
  )

  // Handen gäller bara medan ett kortspel pågår.
  return { status, state, online, clockOffset, hand: state.phase === 'playing' ? hand : null, floating, actions }
}

// Värden: statistik när en match startar eller tar slut. Bara värden skickar, så varje match räknas en gång.
function trackMatch(prev: GameState, next: GameState, matchStart: { current: number }) {
  const props = {
    spel: next.game,
    antal_spelare: Object.keys(next.players).length,
    antal_rundor: next.rounds,
  }
  if (prev.phase === 'waiting' && (next.phase === 'guessing' || next.phase === 'playing')) {
    matchStart.current = Date.now()
    track('match_startad', props)
  } else if (prev.phase !== 'finished' && next.phase === 'finished') {
    const seconds = matchStart.current ? Math.round((Date.now() - matchStart.current) / 1000) : 0
    track('match_avslutad', { ...props, langd_sekunder: seconds })
  }
}
