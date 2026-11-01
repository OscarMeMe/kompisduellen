import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { findGame } from '@/lib/games'
import { currentTurn, isImposterSecrets, myImposterCard, type ImposterMove, type ImposterSettings, type MyImposterCard } from '@/lib/imposterjakten'
import { myHand, type CardMove, type MyHand } from '@/lib/kort'
import { track } from '@/lib/statistik'
import {
  awaitsAnswer,
  handIsMissing,
  HELLO_RETRY_MS,
  helloRetryAction,
  isSameContent,
  lobbyStatus,
  shouldResendState,
  shouldRetryHello,
  STUCK_AFTER_MS,
  wakeAction,
} from '@/lib/anslutning'
import { closeChannel, waitForChannel } from '@/lib/kanaler'
import {
  addPendingMove,
  isSeenMove,
  lostMove,
  lostMoveText,
  moveArrived,
  moveDelivery,
  newPendingMove,
  rememberMove,
  resendMoves,
  retryMoves,
  type Delivery,
  type LostMove,
  type PendingMove,
} from '@/lib/leverans'
import {
  isFromHost,
  parseGuess,
  parseHand,
  parseHandover,
  parseImposterCard,
  parseMove,
  parseRematchWish,
  parseStateMessage,
  parseThrow,
  parseTyping,
  type StateMessage,
} from '@/lib/meddelanden'
import { measureSplatPlace } from '@/lib/splatt'
import { APP_VERSION, versionStatus } from '@/lib/version'
import { supabase } from '@/lib/supabase'
import { leaveHostRole, loadHostLobby, markAsHost, saveHostLobby, type Player } from '@/lib/player'
import { pickSuccessor, shouldYieldHost, takeOverState, TAKEOVER_MS, TAKEOVER_SETTLE_MS } from '@/lib/vardbyte'
import { acceptReaction, canSendReaction, findReaction, REACTION_VISIBLE_MS } from '@/lib/reaktioner'
import {
  acceptThrow,
  canThrow,
  findThrowItem,
  loadAcceptsThrows,
  nextSplat,
  saveAcceptsThrows,
  SPLAT_VISIBLE_MS,
  throwTargets,
  THROWN_VISIBLE_MS,
  type Splat,
  type Thrown,
  type ThrowItemId,
} from '@/lib/kast'
import type { FloatingReaction } from '@/hooks/useReactions'
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
  hostImposterNewWord,
  hostImposterAbortRound,
  hostImposterNextRound,
  hostImposterSkipTurn,
  hostImposterStartAnyway,
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
  setImposterSettings,
  setRematchWish,
  setRounds,
  setTempo,
  setThrowsAllowed,
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
  // Vill inte ta emot kast (kast.ts). Syns då inte som mål.
  noThrows?: boolean
}

export type { LobbyStatus } from '@/lib/anslutning'

const NO_HOST_GRACE_MS = 4000
// Så länge räknas en spelare som tappat nätet (eller laddar om) fortfarande som med i ett kortspel,
// så att domaren inte byts och matchen inte tar slut i onödan.
const AWAY_GRACE_MS = 10_000
// Imposterjakten: "skriver…" skickas högst så här ofta och syns så länge efter senaste tecknet.
const TYPING_EVERY_MS = 2000
const TYPING_VISIBLE_MS = 3500
// Gästen med nyare version än värden säger till värden så här ofta (ms).
const TELL_VERSION_EVERY_MS = 10_000

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
  // Imposterjakten: mitt eget kort, som värden skickar bara till mig (på samma sätt som handen).
  const [imposterCard, setImposterCard] = useState<MyImposterCard | null>(null)
  const handRef = useRef<MyHand | null>(null)
  const imposterCardRef = useRef<MyImposterCard | null>(null)
  useEffect(() => {
    handRef.current = hand
    imposterCardRef.current = imposterCard
  }, [hand, imposterCard])
  // Mina drag som läget ännu inte visar, och (hos värden) vilka drag som redan räknats (se leverans.ts).
  const pendingMovesRef = useRef<PendingMove[]>([])
  const [delivery, setDelivery] = useState<Delivery>('ok')
  // Det som aldrig nådde värden, för raden i facit: rundan då jag gissade, och senaste kortet eller domarvalet.
  const [guessRound, setGuessRound] = useState<number | null>(null)
  const [lostCard, setLostCard] = useState<LostMove | null>(null)
  const moveCountRef = useRef(0)
  const seenMovesRef = useRef<Record<string, string[]>>({})
  // Reaktioner som syns på skärmen just nu.
  const [floating, setFloating] = useState<FloatingReaction[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef<GameState>(state)
  const onlineRef = useRef<OnlinePlayer[]>([])
  // Reaktioner: när jag skickade senast, och vad som släppts igenom från varje spelare (se reaktioner.ts).
  const lastReactionRef = useRef<number | null>(null)
  // Imposterjakten: vem som skriver på sitt ord just nu (bara den som har tur), och när jag senast skickade det.
  const [typing, setTyping] = useState<{ id: string; at: number } | null>(null)
  const lastTypingRef = useRef(0)
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
  // Kast: när jag kastade senast, när ett kast från varje spelare släpptes igenom senast, och splatten som visas
  // för mig just nu (högst en åt gången).
  const [lastThrowAt, setLastThrowAt] = useState<number | null>(null)
  const lastThrowRef = useRef<number | null>(null)
  const throwHistoryRef = useRef<Record<string, number>>({})
  const [splat, setSplat] = useState<Splat | null>(null)
  const [thrown, setThrown] = useState<Thrown | null>(null)
  const splatRef = useRef<Splat | null>(null)
  // Tar jag emot kast? Sparas i webbläsaren och skickas i närvaron, så att de andra vet vem de kan kasta på.
  const [acceptsThrows, setAcceptsThrowsState] = useState(loadAcceptsThrows)
  const acceptsThrowsRef = useRef(acceptsThrows)
  // Det jag skickade i närvaron senast, så att den kan skickas igen med ett nytt val utan att något annat ändras.
  const presenceRef = useRef<OnlinePlayer | null>(null)
  // Värden: kortspelens hemliga data, och händerna som senast skickades till varje spelare.
  const secretsRef = useRef<HostState['secrets']>(restored?.secrets ?? null)
  const sentHandsRef = useRef<Record<string, string>>({})
  // Värden: numret på varje spelares senaste hand eller kort. Det följer med läget, så att den som saknar sin kan säga till.
  const handSeqRef = useRef<Record<string, number>>({})
  // Värden: när läget skickades senast, och om det ändrats sedan det senast skickades igen (se shouldResendState).
  const lastStateAtRef = useRef(0)
  const stateChangedRef = useRef(false)
  // Gästen: numret på min senaste hand eller mitt kort, och när jag senast sa till att jag saknar den.
  const myHandSeqRef = useRef<number | null>(null)
  const lastHandAskRef = useRef(0)
  // Versionerna i lobbyn: värdens (hos gästerna) och gästernas (hos värden). Se version.ts.
  const [hostVersion, setHostVersion] = useState<number | null>(null)
  const [guestVersions, setGuestVersions] = useState<Record<string, number>>({})
  const lastVersionTellRef = useRef(0)
  // Fel version: gästen skickar inga drag.
  const versionBlockedRef = useRef(false)
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
  // Samma sak för min hand (kortspel) och mitt kort (Imposterjakten). Efter en omladdning kan de komma innan
  // närvarolistan visar vem som är värd, och då ska de inte slängas.
  const pendingHandRef = useRef<{ from: string; hand: MyHand | null } | null>(null)
  const pendingCardRef = useRef<{ from: string; card: MyImposterCard } | null>(null)

  const save = useCallback(() => {
    saveHostLobby(code, { state: stateRef.current, secrets: secretsRef.current } satisfies HostState)
  }, [code])

  // Värden: skicka läget till alla, med numret på allas händer och kort under en match med hemlig data.
  const sendState = useCallback(() => {
    lastStateAtRef.current = Date.now()
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'state',
      payload: { state: stateRef.current, sentAt: Date.now(), from: meId, hands: secretsRef.current ? handSeqRef.current : {}, version: APP_VERSION },
    })
  }, [meId])

  // Värden: uppdatera lokalt och skicka ut till alla.
  const publish = useCallback(
    (next: GameState) => {
      const prev = stateRef.current
      if (next === prev) return
      trackMatch(prev, next, matchStartRef)
      stateRef.current = next
      setState(next)
      save()
      stateChangedRef.current = true
      sendState()
    },
    [save, sendState],
  )

  // Värden: skicka varje spelares hand (kortspel) eller kort (Imposterjakten) till spelaren, men bara när det har
  // ändrats.
  const sendHands = useCallback(() => {
    const secrets = secretsRef.current
    if (!secrets) {
      sentHandsRef.current = {}
      return
    }
    if (isImposterSecrets(secrets)) {
      const table = stateRef.current.imposter
      if (!table) return
      for (const id of Object.keys(stateRef.current.players)) {
        const card = myImposterCard(secrets, table, id)
        const json = JSON.stringify(card)
        if (sentHandsRef.current[id] === json) continue
        sentHandsRef.current[id] = json
        const seq = (handSeqRef.current[id] ?? 0) + 1
        handSeqRef.current[id] = seq
        void channelRef.current?.send({ type: 'broadcast', event: 'kort', payload: { to: id, from: meId, seq, card } })
      }
      return
    }
    for (const id of Object.keys(secrets.hands)) {
      const view = myHand(secrets, id)
      const json = JSON.stringify(view)
      if (sentHandsRef.current[id] === json) continue
      sentHandsRef.current[id] = json
      const seq = (handSeqRef.current[id] ?? 0) + 1
      handSeqRef.current[id] = seq
      void channelRef.current?.send({ type: 'broadcast', event: 'hand', payload: { to: id, from: meId, seq, hand: view } })
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
    void channelRef.current?.send({ type: 'broadcast', event: 'hello', payload: { id: meId, version: APP_VERSION } })
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
          .map(({ id, name, avatar, host, joinedAt, sendsFrom, noThrows }) => ({
            id,
            name,
            avatar,
            host,
            joinedAt,
            sendsFrom,
            noThrows: noThrows === true,
          }))
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
        const pendingHand = pendingHandRef.current
        if (pendingHand && isFromHost(pendingHand.from, hosts())) {
          pendingHandRef.current = null
          setHand(pendingHand.hand)
        }
        const pendingCard = pendingCardRef.current
        if (pendingCard && isFromHost(pendingCard.from, hosts())) {
          pendingCardRef.current = null
          setImposterCard(pendingCard.card)
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
        const message = parseStateMessage(payload)
        if (!message) return
        // Värden får sitt eget läge tillbaka. Det ändrar inget, men visar om värdens egen hand försvunnit på vägen.
        if (isHost) {
          if (message.from === myId) askForMissingHand(message)
          return
        }
        if (!isFromHost(message.from, hosts())) {
          // Kanske en ny värd som inte syns i närvarolistan än. Sparas tills den gör det.
          if (message.from !== null) pendingStateRef.current = message
          return
        }
        pendingStateRef.current = null
        setHostVersion(message.version)
        // Jag har en nyare version än värden: säg till, så att värden får beskedet att ladda om.
        if (message.version !== null && message.version < APP_VERSION && Date.now() - lastVersionTellRef.current >= TELL_VERSION_EVERY_MS) {
          lastVersionTellRef.current = Date.now()
          void channel.send({ type: 'broadcast', event: 'hello', payload: { id: myId, version: APP_VERSION, only: 'version' } })
        }
        askForMissingHand(message)
        applyState(message)
      })

      // Läget visar att jag saknar min hand eller mitt kort: be värden om den, men inte oftare än HELLO_RETRY_MS.
      function askForMissingHand({ hands }: StateMessage) {
        if (!handIsMissing(hands[myId], myHandSeqRef.current) || Date.now() - lastHandAskRef.current < HELLO_RETRY_MS) return
        lastHandAskRef.current = Date.now()
        void channel.send({ type: 'broadcast', event: 'hello', payload: { id: myId, version: APP_VERSION, only: 'hand' } })
      }

      function applyState({ state: next, sentAt }: StateMessage) {
        // Värden skickar läget igen med jämna mellanrum. Är inget nytt behöver inget göras.
        if (receivedRef.current && isSameContent(next, stateRef.current)) return
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
        if (message?.to !== myId) return
        myHandSeqRef.current = message.seq
        if (isFromHost(message.from, hosts())) {
          pendingHandRef.current = null
          setHand((prev) => (isSameContent(prev, message.hand) ? prev : message.hand))
        } else if (message.from !== null) {
          // Kanske innan närvarolistan visar värden (t.ex. efter en omladdning). Sparas tills den gör det.
          pendingHandRef.current = { from: message.from, hand: message.hand }
        }
      })

      // Mitt kort i Imposterjakten. Meddelanden till andra spelare slängs direkt.
      channel.on('broadcast', { event: 'kort' }, ({ payload }) => {
        const message = parseImposterCard(payload)
        if (message?.to !== myId) return
        myHandSeqRef.current = message.seq
        if (isFromHost(message.from, hosts())) {
          pendingCardRef.current = null
          setImposterCard((prev) => (isSameContent(prev, message.card) ? prev : message.card))
        } else if (message.from !== null) {
          pendingCardRef.current = { from: message.from, card: message.card }
        }
      })

      // En reaktion från någon i lobbyn. Okända reaktioner och för många från samma spelare slängs.
      channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const { id, reaction } = (payload ?? {}) as { id?: string; reaction?: string }
        const def = findReaction(reaction)
        if (!id || !def) return
        const who = stateRef.current.players[id] ?? onlineRef.current.find((p) => p.id === id)
        if (!who) return
        const now = Date.now()
        const history = acceptReaction(reactionHistoryRef.current[id] ?? [], now)
        if (!history) return
        reactionHistoryRef.current[id] = history
        const item: FloatingReaction = {
          key: `${id}-${now}-${Math.random()}`,
          name: who.name,
          emoji: def.emoji,
          from: id,
        }
        setFloating((list) => [...list.slice(-7), item])
        setTimeout(() => setFloating((list) => list.filter((other) => other.key !== item.key)), REACTION_VISIBLE_MS)
      })

      // Imposterjakten: den som har tur skriver. Visas bara för den som har tur just nu, och försvinner efter en stund
      // utan nya tecken.
      channel.on('broadcast', { event: 'skriver' }, ({ payload }) => {
        const message = parseTyping(payload)
        const table = stateRef.current.imposter
        if (!message || message.id === myId || !table || currentTurn(table) !== message.id) return
        const at = Date.now()
        setTyping({ id: message.id, at })
        setTimeout(() => setTyping((now) => (now?.at === at ? null : now)), TYPING_VISIBLE_MS)
      })

      // Ett kast på en spelare. Kontrolleras i meddelanden.ts, och högst ett kast per avsändare släpps igenom
      // inom spärren. Den som träffas ser en splatt (en åt gången), alla andra en rad i flödet.
      channel.on('broadcast', { event: 'throw' }, ({ payload }) => {
        const message = parseThrow(payload, { online: onlineRef.current, throwsAllowed: stateRef.current.throwsAllowed })
        if (!message) return
        const now = Date.now()
        if (!acceptThrow(throwHistoryRef.current[message.id], now)) return
        throwHistoryRef.current[message.id] = now
        // Namnen från läget, där den som heter likadant som någon annan har fått en siffra.
        const inLobby = (id: string) => {
          const player = onlineRef.current.find((p) => p.id === id)
          return player && { id: player.id, name: stateRef.current.players[id]?.name ?? player.name }
        }
        const from = inLobby(message.id)
        const to = inLobby(message.to)
        const item = findThrowItem(message.item)
        if (!from || !to || !item) return
        const key = `${message.id}-${now}-${Math.random()}`
        // Mitt eget kast (kanalen skickar det tillbaka till mig): en större bekräftelse i stället för en rad.
        if (message.id === myId) {
          setThrown({ key, item: item.id, to: to.name })
          setTimeout(() => setThrown((current) => (current?.key === key ? null : current)), THROWN_VISIBLE_MS)
          return
        }
        // I spelet får splatten inte täcka svarsdelen eller korten. Får den inte plats blir det en rad även för mig.
        // I lobbyn (väntrummet, facit, slutskärmen) får den bli stor.
        if (message.to === myId) {
          const phase = stateRef.current.phase
          const place = measureSplatPlace(phase === 'guessing' || phase === 'playing' ? 'spel' : 'lobby')
          const next = place && nextSplat(splatRef.current, { key, from: from.name, item: item.id, place })
          if (next?.shown) {
            splatRef.current = next.splat
            setSplat(next.splat)
            setTimeout(() => {
              if (splatRef.current?.key !== key) return
              splatRef.current = null
              setSplat(null)
            }, SPLAT_VISIBLE_MS)
            return
          }
        }
        const line: FloatingReaction = {
          key,
          name: from.name,
          emoji: item.emoji,
          target: to.id === myId ? 'dig' : to.name,
          from: from.id,
        }
        setFloating((list) => [...list.slice(-7), line])
        setTimeout(() => setFloating((list) => list.filter((other) => other.key !== key)), REACTION_VISIBLE_MS)
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
        const { id, nr, move } = message
        const before = current()
        const next = isSeenMove(seenMovesRef.current, id, nr) ? before : hostMove(before, id, move, activeIds(), Date.now())
        if (next.state !== before.state || next.secrets !== before.secrets) {
          rememberMove(seenMovesRef.current, id, nr)
          commit(next)
          return
        }
        // Inget ändrades: spelaren har troligen missat vad som hände, eftersom draget skickades igen. Spelaren får sin
        // hand eller sitt kort direkt, och läget skickas igen så snart det är dags (se shouldResendState).
        stateChangedRef.current = true
        delete sentHandsRef.current[id]
        sendHands()
      })

      // Värden lämnar med Lämna och pekar ut vem som tar över, så att lobbyn byter värd direkt.
      // Gäller bara om det kommer från den som är värd.
      channel.on('broadcast', { event: 'handover' }, ({ payload }) => {
        if (isHost) return
        const message = parseHandover(payload)
        if (message?.to === myId && message.from !== null && isFromHost(message.from, hosts())) promote()
      })

      channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
        // Någon har precis anslutit: spelarens hand igen, och det aktuella läget till alla. Handen först, så att läget
        // visar numret på den. Saknar spelaren bara sin hand (only) räcker den.
        if (!isHost) return
        const { id, only, version } = (payload ?? {}) as { id?: unknown; only?: unknown; version?: unknown }
        if (typeof id === 'string' && typeof version === 'number' && Number.isFinite(version)) {
          setGuestVersions((known) => (known[id] === version ? known : { ...known, [id]: version }))
        }
        if (only === 'version') return
        if (typeof id === 'string') {
          delete sentHandsRef.current[id]
          sendHands()
        }
        if (only !== 'hand') sendState()
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
          // Kanalen kan ansluta på nytt av sig själv efter ett nätfel, och då är felet borta.
          setFailed(false)
          setConnected(true)
          // Gästen frågar efter läget direkt, och igen med jämna mellanrum tills det kommer (se nedan).
          if (!isHost) sendHello()
          try {
            const presence: OnlinePlayer = {
              id: myId,
              name: player.name,
              avatar: player.avatar,
              host: isHost,
              joinedAt: Date.now(),
              sendsFrom: true,
              noThrows: !acceptsThrowsRef.current,
            }
            presenceRef.current = presence
            await channel.track(presence)
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
  }, [code, me, isHost, publish, commit, current, activeIds, sendHands, sendState, resolveIfEveryoneGuessed, sendHello, connectKey])

  // Värden: skickar läget igen när spelet väntar på ett svar eller när det ändrats, högst var tionde sekund, så att en gäst
  // som missat ett meddelande inte står kvar i ett gammalt läge (se shouldResendState).
  useEffect(() => {
    if (!isHost || !connected) return
    const timer = setInterval(() => {
      const resend = shouldResendState({
        awaiting: awaitsAnswer(stateRef.current),
        changed: stateChangedRef.current,
        others: onlineRef.current.length > 1,
        now: Date.now(),
        lastSentAt: lastStateAtRef.current,
      })
      if (!resend) return
      stateChangedRef.current = false
      sendState()
    }, 1000)
    return () => clearInterval(timer)
  }, [isHost, connected, sendState])

  const playing = state.phase === 'playing'
  // Handen och kortet gäller en match. Utan det här kan den gamla handen synas ett ögonblick när nästa match börjar.
  // Numret nollas också, så att jag ber om handen om den nya kom innan läget och därför rensades här.
  useEffect(() => {
    if (playing) return
    setHand(null)
    setImposterCard(null)
    myHandSeqRef.current = null
  }, [playing])

  // Har tiden tagit slut för ett kort eller ett domarval som inte kommit fram? Kollas när läget ändras och inte på klockan,
  // som kan gå långsamt när fliken ligger i bakgrunden.
  useEffect(() => {
    if (!meId) return
    const view = { state, id: meId, hand, card: imposterCard }
    for (const pending of pendingMovesRef.current) {
      const lost = moveArrived(pending, view) ? lostMove(pending, view) : null
      if (lost) setLostCard(lost)
    }
  }, [state, hand, imposterCard, meId])

  // Mina drag skickas igen tills läget visar att de kommit fram, med en kort paus och en gräns (se leverans.ts).
  // Klockan börjar om när kanalen anslutit på nytt, så att försök som gjordes utan anslutning inte räknas.
  useEffect(() => {
    if (!playing) pendingMovesRef.current = []
    if (!connected || !playing || !meId) return
    pendingMovesRef.current = pendingMovesRef.current.map((pending) => ({ ...pending, tries: 0, failed: false }))
    const timer = setInterval(() => {
      if (versionBlockedRef.current) return
      const view = { state: stateRef.current, id: meId, hand: handRef.current, card: imposterCardRef.current }
      const { keep, send } = resendMoves(pendingMovesRef.current, view, Date.now())
      pendingMovesRef.current = keep
      setDelivery(moveDelivery(keep))
      for (const { nr, move } of send) {
        void channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { id: meId, nr, move } })
      }
    }, 250)
    return () => clearInterval(timer)
  }, [connected, playing, meId])

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

  // Stämmer versionerna? Hos värden räknas bara de som är med just nu.
  const version = versionStatus({
    isHost,
    mine: APP_VERSION,
    hostVersion,
    guestVersions: online.filter((p) => !p.host && guestVersions[p.id] !== undefined).map((p) => guestVersions[p.id]),
  })
  useEffect(() => {
    versionBlockedRef.current = !isHost && version !== 'ok'
  }, [isHost, version])

  // Namnen i närvarolistan är det spelaren valt. Värden bestämmer namnet i lobbyn (se addPlayers), så att ingen heter likadant.
  const shownOnline = useMemo(
    () => online.map((p) => (state.players[p.id] && state.players[p.id].name !== p.name ? { ...p, name: state.players[p.id].name } : p)),
    [online, state.players],
  )

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
      // Imposterjakten: värdens val i väntrummet, och värdens knappar under omgången.
      setImposterSettings: (settings: Partial<ImposterSettings>) => {
        if (isHost) publish(setImposterSettings(stateRef.current, settings))
      },
      imposterStartAnyway: () => {
        if (isHost) commit(hostImposterStartAnyway(current()))
      },
      imposterSkipTurn: () => {
        if (isHost) commit(hostImposterSkipTurn(current(), activeIds(), Date.now()))
      },
      imposterNewWord: () => {
        if (isHost) commit(hostImposterNewWord(current(), activeIds()))
      },
      imposterNextRound: () => {
        if (isHost) commit(hostImposterNextRound(current(), activeIds()))
      },
      imposterAbortRound: () => {
        if (isHost) commit(hostImposterAbortRound(current()))
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
        if (!me || versionBlockedRef.current) return
        setGuessRound(stateRef.current.round)
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'guess',
          payload: { id: me.id, value },
        })
      },
      // Kortspelen: välja kort, klicka Klar eller (för domaren) välja vinnare. Imposterjakten: läst kortet,
      // skriva ett ord, passa eller säga sitt ord högt.
      move: (move: CardMove | ImposterMove) => {
        if (!me || versionBlockedRef.current) return
        moveCountRef.current += 1
        const nr = `${me.id}-${Date.now()}-${moveCountRef.current}`
        const view = { state: stateRef.current, id: me.id, hand: handRef.current, card: imposterCardRef.current }
        pendingMovesRef.current = addPendingMove(pendingMovesRef.current, newPendingMove(nr, move, view, Date.now()))
        void channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: { id: me.id, nr, move },
        })
      },
      // Tryck igen: drag som gett upp skickas igen.
      retryMoves: () => {
        if (!me || versionBlockedRef.current) return
        const { keep, send } = retryMoves(pendingMovesRef.current, Date.now())
        pendingMovesRef.current = keep
        setDelivery(moveDelivery(keep))
        for (const { nr, move } of send) {
          void channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { id: me.id, nr, move } })
        }
      },
      // round = rundan som visades när värden klickade. Ett dubbelklick hoppar inte över en runda.
      skipReveal: (round: number) => {
        if (isHost) commit(hostAdvance(current(), Date.now(), round, activeIds()))
      },
      // Imposterjakten: jag skriver på mitt ord. Skickas högst varannan sekund och aldrig med texten.
      typing: () => {
        const now = Date.now()
        if (!me || now - lastTypingRef.current < TYPING_EVERY_MS) return
        lastTypingRef.current = now
        void channelRef.current?.send({ type: 'broadcast', event: 'skriver', payload: { id: me.id } })
      },
      // En liten reaktion till alla i lobbyn. Knapparna väntar en stund efter varje tryck.
      react: (reactionId: string) => {
        if (!me || !findReaction(reactionId)) return
        const now = Date.now()
        if (!canSendReaction(lastReactionRef.current, now)) return
        lastReactionRef.current = now
        void channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { id: me.id, reaction: reactionId } })
      },
      // Kasta något på en annan spelare. En gång per 10 sekunder, och bara på den som tar emot kast.
      throwAt: (to: string, item: ThrowItemId) => {
        if (!me || !findThrowItem(item) || !stateRef.current.throwsAllowed) return
        if (!throwTargets(onlineRef.current, me.id).some((p) => p.id === to)) return
        const now = Date.now()
        if (!canThrow(lastThrowRef.current, now)) return
        lastThrowRef.current = now
        setLastThrowAt(now)
        void channelRef.current?.send({ type: 'broadcast', event: 'throw', payload: { id: me.id, to, item } })
      },
      // Värden slår på eller av kasten i lobbyn.
      setThrowsAllowed: (allowed: boolean) => {
        if (isHost) publish(setThrowsAllowed(stateRef.current, allowed))
      },
      // Mitt eget val att ta emot kast. Sparas i webbläsaren och skickas i närvaron.
      setAcceptsThrows: (on: boolean) => {
        saveAcceptsThrows(on)
        acceptsThrowsRef.current = on
        setAcceptsThrowsState(on)
        const presence = presenceRef.current
        if (presence) {
          presenceRef.current = { ...presence, noThrows: !on }
          void channelRef.current?.track(presenceRef.current).catch(() => {})
        }
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
        if (!me || isHost || versionBlockedRef.current) return
        void channelRef.current?.send({ type: 'broadcast', event: 'wish', payload: { id: me.id, wants } })
      },
    }),
    [isHost, me, publish, commit, current, activeIds, reconnect],
  )

  // Handen gäller bara medan ett kortspel pågår.
  return {
    status,
    state,
    online: shownOnline,
    clockOffset,
    version,
    // Hur det går med mina drag. Spelar bara roll under en match.
    delivery: state.phase === 'playing' ? delivery : 'ok',
    // Raden i facit när min gissning, mitt kort eller mitt domarval aldrig nådde värden.
    lostMove: me ? lostMoveText(state, me.id, guessRound, lostCard) : null,
    hand: state.phase === 'playing' ? hand : null,
    imposterCard: state.phase === 'playing' ? imposterCard : null,
    floating,
    // Vem som skriver på sitt ord just nu i Imposterjakten (bara den som har tur), annars null.
    typing: typing && state.imposter && currentTurn(state.imposter) === typing.id ? typing.id : null,
    splat,
    thrown,
    lastThrowAt,
    acceptsThrows,
    hostMissing,
    actions,
  }
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
