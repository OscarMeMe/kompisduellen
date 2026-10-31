import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { findGame } from '@/lib/games'
import { myHand, type CardMove, type CardSecrets, type MyHand } from '@/lib/kort'
import { track } from '@/lib/statistik'
import {
  HELLO_RETRY_MS,
  helloRetryAction,
  lobbyStatus,
  shouldRetryHello,
  STUCK_AFTER_MS,
  wakeAction,
} from '@/lib/anslutning'
import { closeChannel, waitForChannel } from '@/lib/kanaler'
import {
  isFromHost,
  parseGuess,
  parseHand,
  parseHandover,
  parseMove,
  parseRematchWish,
  parseStateMessage,
  type StateMessage,
} from '@/lib/meddelanden'
import { supabase } from '@/lib/supabase'
import { leaveHostRole, loadHostLobby, markAsHost, saveHostLobby, type Player } from '@/lib/player'
import { pickSuccessor, shouldYieldHost, takeOverState, TAKEOVER_MS, TAKEOVER_SETTLE_MS } from '@/lib/vardbyte'
import { acceptReaction, canSendReaction, findReaction, REACTION_VISIBLE_MS } from '@/lib/reaktioner'
import type { FloatingReaction } from '@/components/lobby/Reactions'
import {
  abortMatch,
  addGuess,
  addPlayers,
  backToWaiting,
  changeGame,
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
  setRematchWish,
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
  // Skickar alltid med sitt id i läget och händerna (se meddelanden.ts). Saknas hos äldre versioner av sajten.
  sendsFrom?: boolean
}

export type { LobbyStatus } from '@/lib/anslutning'

const NO_HOST_GRACE_MS = 4000
// Så länge räknas en spelare som tappat nätet (eller laddar om) fortfarande som med i ett kortspel,
// så att domaren inte byts och matchen inte tar slut i onödan.
const AWAY_GRACE_MS = 10_000

// game används bara av värden. Övriga får spelet från värdens tillstånd.
// onPromote / onDemote: sidan byter roll när jag tar över som värd eller lämnar över till en annan värd.
export type HostRoleHandlers = { onPromote: () => void; onDemote: () => void }

export function useLobby(code: string, me: Player | null, isHost: boolean, game?: string, roles?: HostRoleHandlers) {
  // Värden: fortsätt där vi var om sidan laddades om.
  const [restored] = useState(() => {
    const host = isHost ? restoreHostState(loadHostLobby(code)) : null
    return host && { ...host, at: Date.now() }
  })
  const [state, setState] = useState<GameState>(() => restored?.state ?? initialState(game))
  // Övriga spelare: har vi fått något tillstånd från värden än?
  const [received, setReceived] = useState(false)
  const receivedRef = useRef(false)
  const [online, setOnline] = useState<OnlinePlayer[]>([])
  const [connected, setConnected] = useState(false)
  const [failed, setFailed] = useState(false)
  const [graceOver, setGraceOver] = useState(false)
  // Ökas för att ansluta på nytt (Försök igen, fliken syns igen, nätet tillbaka, hello utan svar).
  const [connectKey, setConnectKey] = useState(0)
  // Ökas när ett nytt försök att komma in börjar (Försök igen, fliken syns igen). Tiden till Försök igen räknas
  // från det, så att gästens egen omanslutning (när hello inte får svar) inte skjuter upp beskedet.
  const [attempt, setAttempt] = useState(0)
  // Gästen har redan anslutit på nytt av sig själv i det här försöket (se helloRetryAction).
  const autoReconnectedRef = useRef(false)
  // Värden: ökas när fliken syns igen, så att rundor och nedräkningar som borde ha slutat körs direkt. Webbläsaren kan
  // ha hållit tillbaka klockorna medan fliken låg i bakgrunden.
  const [wakeTick, setWakeTick] = useState(0)
  // Gästen har försökt komma in längre än STUCK_AFTER_MS utan att få något tillstånd.
  const [waitedTooLong, setWaitedTooLong] = useState(false)
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
  // Värdbyte: skillnaden mellan min och förra värdens klocka, och att jag precis tagit över (tillståndet skickas ut när jag anslutit som värd).
  const clockOffsetRef = useRef(0)
  const takeoverRef = useRef<{ offset: number } | null>(null)
  // När jag tog över som värd. Den avgående värden syns en kort stund till, och då ska jag inte vika mig för den.
  const promotedAtRef = useRef(0)
  const rolesRef = useRef(roles)
  useEffect(() => {
    rolesRef.current = roles
  }, [roles])
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

  // Mitt id. Värden skickar med det (from), så att gästerna kan kolla att läget kommer från värden.
  const meId = me?.id ?? null
  // Gästen: ett läge från någon som ännu inte syns som värd i närvarolistan (t.ex. precis efter ett värdbyte).
  // Det används så snart närvarolistan visar att avsändaren är värd.
  const pendingStateRef = useRef<StateMessage | null>(null)

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
        payload: { state: next, sentAt: Date.now(), from: meId },
      })
    },
    [save, meId],
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
      void channelRef.current?.send({ type: 'broadcast', event: 'hand', payload: { to: id, from: meId, hand: view } })
    }
  }, [meId])

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

  // Gästen: be värden om det aktuella läget (och min hand i ett kortspel).
  const sendHello = useCallback(() => {
    if (!meId) return
    void channelRef.current?.send({ type: 'broadcast', event: 'hello', payload: { id: meId } })
  }, [meId])

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
    const player = me
    const myId = me.id
    // Värden: kollar närvaron igen när någon som gått varit borta för länge.
    let awayTimer: ReturnType<typeof setTimeout> | undefined
    // Värdbyte: tiden tills jag tar över om värden är borta.
    let takeoverTimer: ReturnType<typeof setTimeout> | undefined
    const stateReceived = () => receivedRef.current
    let cancelled = false
    let opened: RealtimeChannel | null = null

    // En kanal med samma namn kan hålla på att stängas (omladdning, kodkontrollen på startsidan). Då väntar vi,
    // annars får vi tillbaka den gamla kanalen som aldrig svarar.
    void waitForChannel(`lobby:${code}`).then(() => {
      if (!cancelled) opened = connect()
    })

    function connect(): RealtimeChannel {
      const channel = supabase.channel(`lobby:${code}`, {
        config: {
          broadcast: { self: true },
          presence: { key: myId },
        },
      })
      channelRef.current = channel
      // Vilka som är värd enligt närvarolistan (oftast en, två en kort stund vid ett värdbyte).
      const hosts = () => onlineRef.current.filter((p) => p.host).map((p) => ({ id: p.id, sendsFrom: p.sendsFrom === true }))

      channel.on('presence', { event: 'sync' }, () => {
        const raw = channel.presenceState<OnlinePlayer>()
        const players: OnlinePlayer[] = Object.values(raw)
          .map((metas) => metas[0])
          .filter((meta) => Boolean(meta?.id))
          .map(({ id, name, avatar, host, joinedAt, sendsFrom }) => ({ id, name, avatar, host, joinedAt, sendsFrom }))
          .sort((a, b) => a.joinedAt - b.joinedAt)
        const now = Date.now()
        for (const p of onlineRef.current) {
          if (!players.some((other) => other.id === p.id)) lastSeenRef.current[p.id] = now
        }
        for (const p of players) delete lastSeenRef.current[p.id]
        onlineRef.current = players
        setOnline(players)
        const pending = pendingStateRef.current
        if (!isHost && pending && isFromHost(pending.from, hosts())) {
          pendingStateRef.current = null
          applyState(pending)
        }

        // Två värdar: den gamla värden kom tillbaka efter att en annan tagit över. Den som anslöt senast viker sig.
        const mine = players.find((p) => p.id === myId)
        if (isHost && mine && Date.now() - promotedAtRef.current > TAKEOVER_SETTLE_MS && shouldYieldHost(mine, players)) {
          leaveHostRole(code)
          rolesRef.current?.onDemote()
          return
        }

        watchHost()

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

      // Läget från värden. Trasiga meddelanden slängs, och läget används bara om det kommer från värden.
      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (isHost) return
        const message = parseStateMessage(payload)
        if (!message) return
        if (!isFromHost(message.from, hosts())) {
          // Kanske en ny värd som inte syns i närvarolistan än. Sparas tills den gör det.
          if (message.from !== null) pendingStateRef.current = message
          return
        }
        pendingStateRef.current = null
        applyState(message)
      })

      function applyState({ state: next, sentAt }: StateMessage) {
        stateRef.current = next
        setState(next)
        setReceived(true)
        receivedRef.current = true
        if (!joinTrackedRef.current) {
          joinTrackedRef.current = true
          track('lobby_gick_med', { spel: next.game })
        }
        clockOffsetRef.current = Date.now() - sentAt
        setClockOffset(Date.now() - sentAt)
      }

      // Min hand i ett kortspel. Meddelanden till andra spelare slängs direkt.
      channel.on('broadcast', { event: 'hand' }, ({ payload }) => {
        const message = parseHand(payload)
        if (message?.to === myId && isFromHost(message.from, hosts())) setHand(message.hand)
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
          emoji: def.emoji,
        }
        setFloating((list) => [...list.slice(-7), item])
        setTimeout(() => setFloating((list) => list.filter((other) => other.key !== item.key)), REACTION_VISIBLE_MS)
      })

      channel.on('broadcast', { event: 'guess' }, ({ payload }) => {
        const guess = parseGuess(payload)
        if (!isHost || !guess) return
        const { id, value } = guess
        let next = addGuess(stateRef.current, id, value, Date.now())
        next = resolveIfEveryoneGuessed(next)
        publish(next)
      })

      // En spelare önskar revansch eller ångrar sig. Bara värden räknar, och alla ser det i läget.
      channel.on('broadcast', { event: 'wish' }, ({ payload }) => {
        const wish = parseRematchWish(payload)
        if (!isHost || !wish) return
        publish(setRematchWish(stateRef.current, wish.id, wish.wants))
      })

      channel.on('broadcast', { event: 'move' }, ({ payload }) => {
        const message = parseMove(payload)
        if (!isHost || !message) return
        const { id, move } = message
        commit(hostMove(current(), id, move, activeIds(), Date.now()))
      })

      // Värden lämnar med Lämna och pekar ut vem som tar över, så att lobbyn byter värd direkt.
      // Gäller bara om det kommer från den som är värd.
      channel.on('broadcast', { event: 'handover' }, ({ payload }) => {
        if (isHost) return
        const message = parseHandover(payload)
        if (message?.to === myId && message.from !== null && isFromHost(message.from, hosts())) promote()
      })

      channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
        // Någon har precis anslutit: skicka det aktuella läget till alla, och spelarens hand igen.
        if (!isHost) return
        void channel.send({
          type: 'broadcast',
          event: 'state',
          payload: { state: stateRef.current, sentAt: Date.now(), from: myId },
        })
        const id = (payload as { id?: unknown } | undefined)?.id
        if (typeof id === 'string') {
          delete sentHandsRef.current[id]
          sendHands()
        }
      })

      // Jag tar över som värd: spara rollen i fliken och gå med i kanalen på nytt som värd. Tillståndet skickas ut
      // så snart jag är ansluten (se nedan).
      function promote() {
        if (isHost || takeoverRef.current) return
        takeoverRef.current = { offset: clockOffsetRef.current }
        promotedAtRef.current = Date.now()
        markAsHost(code, stateRef.current.game)
        rolesRef.current?.onPromote()
      }

      // Värden är borta (stängd flik, tappat nät). Är jag den som varit med längst tar jag över efter en stund, så att
      // en omladdning hinner komma tillbaka först.
      function watchHost() {
        clearTimeout(takeoverTimer)
        if (isHost || !stateReceived() || onlineRef.current.some((p) => p.host)) return
        if (pickSuccessor(onlineRef.current)?.id !== myId) return
        takeoverTimer = setTimeout(() => {
          if (!onlineRef.current.some((p) => p.host) && pickSuccessor(onlineRef.current)?.id === myId) promote()
        }, TAKEOVER_MS)
      }

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          // Gästen frågar efter läget direkt, och igen med jämna mellanrum tills det kommer (se nedan).
          if (!isHost) sendHello()
          try {
            await channel.track({
              id: myId,
              name: player.name,
              avatar: player.avatar,
              host: isHost,
              joinedAt: Date.now(),
              sendsFrom: true,
            } satisfies OnlinePlayer)
          } catch {
            // Närvaron skickas igen när kanalen ansluter på nytt. Tillståndet kommer ändå via hello.
          }
          if (isHost) {
            // Efter en omladdning: skicka allas händer igen.
            sentHandsRef.current = {}
            sendHands()
            // Jag tog precis över: skicka ut tillståndet med klockorna omräknade till min klocka.
            const takeover = takeoverRef.current
            if (takeover) {
              takeoverRef.current = null
              publish(takeOverState(stateRef.current, takeover.offset))
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setFailed(true)
        }
      })
      return channel
    }

    const graceTimer = setTimeout(() => setGraceOver(true), NO_HOST_GRACE_MS)

    return () => {
      cancelled = true
      clearTimeout(graceTimer)
      clearTimeout(awayTimer)
      clearTimeout(takeoverTimer)
      channelRef.current = null
      setConnected(false)
      if (opened) closeChannel(opened)
    }
  }, [code, me, isHost, publish, commit, current, activeIds, sendHands, resolveIfEveryoneGuessed, sendHello, connectKey])

  // Gästen: frågar värden efter läget igen tills tillståndet kommer. Ett enstaka hello kan försvinna,
  // t.ex. om det skickas medan värdens flik ligger i bakgrunden. Får flera hello inget svar kan kanalen vara död
  // fast den ser öppen ut, och då ansluter gästen på nytt en gång (helloRetryAction).
  useEffect(() => {
    if (!shouldRetryHello({ isHost, connected, received })) return
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (helloRetryAction({ tries, autoReconnected: autoReconnectedRef.current }) === 'reconnect') {
        autoReconnectedRef.current = true
        setConnectKey((key) => key + 1)
      } else {
        sendHello()
      }
    }, HELLO_RETRY_MS)
    return () => clearInterval(timer)
  }, [isHost, connected, received, sendHello])

  // Gästen: har inget tillstånd kommit efter en stund visas ett meddelande med Försök igen.
  useEffect(() => {
    if (isHost || received) return
    const timer = setTimeout(() => setWaitedTooLong(true), STUCK_AFTER_MS)
    return () => clearTimeout(timer)
  }, [isHost, received, attempt])

  // Ansluter på nytt: en ny kanal och ett nytt hello, och ett nytt försök att komma in.
  const reconnect = useCallback(() => {
    setFailed(false)
    setGraceOver(false)
    setWaitedTooLong(false)
    autoReconnectedRef.current = false
    setAttempt((n) => n + 1)
    setConnectKey((key) => key + 1)
  }, [])

  // Fliken syns igen eller nätet kommer tillbaka: ny anslutning om kanalen har stängts, annars ett nytt hello,
  // eftersom meddelanden kan ha missats medan fliken låg i bakgrunden.
  useEffect(() => {
    if (!me) return
    function wake() {
      if (document.visibilityState === 'hidden') return
      const action = wakeAction({ isHost, channelState: channelRef.current?.state ?? null, received: receivedRef.current })
      if (action === 'reconnect') reconnect()
      else if (action === 'hello') sendHello()
      if (isHost) setWakeTick((tick) => tick + 1)
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    return () => {
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    }
  }, [me, isHost, reconnect, sendHello])

  // Värden: tidtagning för varje steg i rundan. Timern gäller bara sin egen deadline, så den gör
  // ingenting om rundan redan gått vidare eller värden hoppat fram (se handleDeadline).
  useEffect(() => {
    const deadline = state.deadline
    if (!isHost || deadline === null) return
    if (state.phase !== 'guessing' && state.phase !== 'reveal' && state.phase !== 'playing') return

    const delay = Math.max(0, deadline - Date.now()) + 300
    const timer = setTimeout(() => commit(hostDeadline(current(), Date.now(), deadline, activeIds())), delay)
    return () => clearTimeout(timer)
  }, [isHost, state.phase, state.deadline, state.round, commit, current, activeIds, wakeTick])

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
  }, [isHost, state.phase, state.rematchAt, commit, current, wakeTick])

  const hostOnline = online.some((p) => p.host)
  // Jag har ett tillstånd men värden är borta: någon tar över strax.
  const hostMissing = !isHost && connected && received && !hostOnline

  const status = lobbyStatus({ isHost, failed, connected, received, hostOnline, graceOver, waitedTooLong })

  const actions = useMemo(
    () => ({
      // Försök igen: ny kanal och nytt hello, t.ex. när en gäst inte kommer in.
      reconnect,
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
      // Värden lämnar: peka ut den som tar över, så att lobbyn finns kvar. Väntar tills meddelandet skickats.
      handOver: async () => {
        if (!isHost || !me) return
        const successor = pickSuccessor(onlineRef.current, me.id)
        if (!successor) return
        await channelRef.current?.send({ type: 'broadcast', event: 'handover', payload: { to: successor.id, from: me.id } })
      },
      // Värden avbryter en pågående match: alla tillbaka till väntrummet, och matchen räknas inte.
      abortMatch: () => {
        if (!isHost) return
        commit({ state: abortMatch(stateRef.current), secrets: null })
      },
      // Byt spel: samma lobby, grupp och ställning, och de andra ser att värden väljer nästa spel.
      changeGame: () => {
        if (!isHost) return
        commit({ state: changeGame(stateRef.current), secrets: null })
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
      // Jag vill ha revansch (eller ångra det) på slutskärmen. Startar inget, värden bestämmer.
      wishRematch: (wants: boolean) => {
        if (!me || isHost) return
        void channelRef.current?.send({ type: 'broadcast', event: 'wish', payload: { id: me.id, wants } })
      },
    }),
    [isHost, me, publish, commit, current, activeIds, reconnect],
  )

  // Handen gäller bara medan ett kortspel pågår.
  return { status, state, online, clockOffset, hand: state.phase === 'playing' ? hand : null, floating, hostMissing, actions }
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
