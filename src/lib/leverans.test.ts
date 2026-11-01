import { describe, expect, it } from 'vitest'
import { hostMove, initialState, type GameState, type HostState } from '@/lib/match'
import type { ImposterTable, MyImposterCard } from '@/lib/imposterjakten'
import type { CardTable, MyHand } from '@/lib/kort'
import {
  addPendingMove,
  guessDelivery,
  isSeenMove,
  lostMove,
  lostMoveText,
  moveArrived,
  moveDelivery,
  newPendingMove,
  rememberMove,
  RESEND_MAX_TRIES,
  RESEND_MS,
  resendMoves,
  retryMoves,
  type AnyMove,
  type MoveView,
} from '@/lib/leverans'

const NOW = 1_000_000
const card = (over: Partial<MyImposterCard> = {}): MyImposterCard => ({ card: null, rejectedAt: null, ready: false, vote: null, accuseVote: null, ...over })

function imposterState(over: Partial<ImposterTable> = {}): GameState {
  const table: ImposterTable = {
    step: 'ledtradar', order: ['a', 'b', 'c'], turn: 0, clues: [], read: [], category: null, hard: false, aloud: false,
    readyCount: 0, votedCount: 0, countdownStarted: false, votes: null, tied: null, tieVotes: null, pointers: {},
    accusation: null, accusers: [], failedAccusation: null, caught: null, outcome: null, ...over,
  }
  return { ...initialState('imposterjakten'), phase: 'playing', round: 1, imposter: table }
}

function cardState(over: Partial<CardTable> = {}): GameState {
  const table: CardTable = {
    step: 'choosing', order: ['a', 'b', 'c'], judge: 'c', prompt: 'p', retried: false, chosen: [], done: [], submissions: [],
    winner: null, owners: null, judgeAsleep: false, skipped: false, wins: [], ...over,
  }
  return { ...initialState('kortkaos'), phase: 'playing', round: 1, cards: table }
}

const view = (state: GameState, extra: Partial<MoveView> = {}): MoveView => ({ state, id: 'a', hand: null, card: card(), ...extra })
const arrived = (move: AnyMove, before: MoveView, after: MoveView) => moveArrived(newPendingMove('1', move, before, NOW), after)

describe('moveArrived: Imposterjakten', () => {
  it('Jag har läst: när jag syns bland dem som läst, eller spelet gått vidare', () => {
    const before = view(imposterState({ step: 'kort' }))
    expect(arrived({ type: 'read' }, before, before)).toBe(false)
    expect(arrived({ type: 'read' }, before, view(imposterState({ step: 'kort', read: ['a'] })))).toBe(true)
    expect(arrived({ type: 'read' }, before, view(imposterState({ step: 'ledtradar' })))).toBe(true)
  })

  it('ett ord, pass och Klar: när turen gått vidare eller ordet avvisats', () => {
    const before = view(imposterState())
    for (const move of [{ type: 'clue', word: 'hund' }, { type: 'pass' }, { type: 'said' }] as AnyMove[]) {
      expect(arrived(move, before, before)).toBe(false)
      expect(arrived(move, before, view(imposterState({ turn: 1 })))).toBe(true)
    }
    expect(arrived({ type: 'clue', word: 'x' }, before, view(imposterState(), { card: card({ rejectedAt: 5 }) }))).toBe(true)
  })

  it('Redo: när mitt kort visar valet, och att ta tillbaka det går inte under nedräkningen', () => {
    const before = view(imposterState({ step: 'diskussion' }))
    expect(arrived({ type: 'ready', on: true }, before, before)).toBe(false)
    expect(arrived({ type: 'ready', on: true }, before, view(imposterState({ step: 'diskussion' }), { card: card({ ready: true }) }))).toBe(true)
    const started = view(imposterState({ step: 'diskussion', countdownStarted: true }), { card: card({ ready: true }) })
    expect(arrived({ type: 'ready', on: false }, before, started)).toBe(true)
  })

  it('rösten: när mitt kort visar den, eller rösterna räknats', () => {
    const before = view(imposterState({ step: 'rostning' }))
    expect(arrived({ type: 'vote', target: 'b' }, before, before)).toBe(false)
    expect(arrived({ type: 'vote', target: 'b' }, before, view(imposterState({ step: 'rostning' }), { card: card({ vote: 'b' }) }))).toBe(true)
    expect(arrived({ type: 'vote', target: 'b' }, before, view(imposterState({ step: 'facit' })))).toBe(true)
  })

  it('en ny omröstning efter lika röster: den gamla rösten skickas inte igen', () => {
    const before = view(imposterState({ step: 'rostning' }))
    expect(arrived({ type: 'vote', target: 'b' }, before, view(imposterState({ step: 'rostning', tied: ['b', 'c'] })))).toBe(true)
  })

  it('Anklaga: stannar så fort någon anklagelse syns, även någon annans', () => {
    const before = view(imposterState({ turn: 6 }))
    const accusation = { accuser: 'b', accused: 'c', answered: 0, voters: 2 }
    expect(arrived({ type: 'accuse', target: 'b' }, before, before)).toBe(false)
    expect(arrived({ type: 'accuse', target: 'b' }, before, view(imposterState({ turn: 6, accusation })))).toBe(true)
    expect(arrived({ type: 'accuse', target: 'b' }, before, view(imposterState({ turn: 6, accusers: ['a'] })))).toBe(true)
  })

  it('svaret på en anklagelse: när mitt kort visar det, eller anklagelsen är över', () => {
    const accusation = { accuser: 'b', accused: 'c', answered: 0, voters: 2 }
    const before = view(imposterState({ accusation }))
    expect(arrived({ type: 'accuseVote', yes: true }, before, before)).toBe(false)
    expect(arrived({ type: 'accuseVote', yes: true }, before, view(imposterState({ accusation }), { card: card({ accuseVote: true }) }))).toBe(true)
    expect(arrived({ type: 'accuseVote', yes: false }, before, view(imposterState({ accusation }), { card: card({ accuseVote: false }) }))).toBe(true)
    expect(arrived({ type: 'accuseVote', yes: true }, before, view(imposterState()))).toBe(true)
  })

  it('sista gissningen och Ge upp: när facit kommit', () => {
    const before = view(imposterState({ step: 'gissning', caught: 'a' }))
    expect(arrived({ type: 'giveUp' }, before, before)).toBe(false)
    expect(arrived({ type: 'guess', word: 'x' }, before, view(imposterState({ step: 'facit' })))).toBe(true)
  })

  it('Peka ut: när pilen syns, även när den tagits bort', () => {
    const before = view(imposterState({ step: 'diskussion' }))
    expect(arrived({ type: 'point', target: 'b' }, before, before)).toBe(false)
    expect(arrived({ type: 'point', target: 'b' }, before, view(imposterState({ step: 'diskussion', pointers: { a: 'b' } })))).toBe(true)
    expect(arrived({ type: 'point', target: null }, before, before)).toBe(true)
  })

  it('en ny omgång eller ett nytt ord gör att draget inte gäller längre', () => {
    const before = view(imposterState({ step: 'kort' }))
    expect(arrived({ type: 'read' }, before, view({ ...imposterState({ step: 'kort' }), round: 2 }))).toBe(true)
    expect(arrived({ type: 'read' }, before, view(imposterState({ step: 'kort', order: ['b', 'c', 'a'] })))).toBe(true)
    expect(arrived({ type: 'read' }, before, view({ ...imposterState({ step: 'kort' }), phase: 'waiting' }))).toBe(true)
  })
})

describe('moveArrived: kortspel', () => {
  const hand = (pick: MyHand['pick']): MyHand => ({ cards: ['x', 'y'], blank: true, pick })

  it('ett valt kort: när min hand visar just det kortet', () => {
    const before = view(cardState(), { hand: hand(null) })
    const move: AnyMove = { type: 'pick', pick: { kind: 'card', card: 'x' } }
    expect(arrived(move, before, before)).toBe(false)
    expect(arrived(move, before, view(cardState(), { hand: hand({ kind: 'card', card: 'y' }) }))).toBe(false)
    expect(arrived(move, before, view(cardState(), { hand: hand({ kind: 'card', card: 'x' }) }))).toBe(true)
    expect(arrived({ type: 'pick', pick: { kind: 'blank', text: 'egen ' } }, before, view(cardState(), { hand: hand({ kind: 'blank', text: 'egen' }) }))).toBe(true)
  })

  it('Spela kortet: när jag syns bland dem som är klara, eller valtiden är slut', () => {
    const before = view(cardState())
    expect(arrived({ type: 'done' }, before, before)).toBe(false)
    expect(arrived({ type: 'done' }, before, view(cardState({ done: ['a'] })))).toBe(true)
    expect(arrived({ type: 'done' }, before, view(cardState({ step: 'judging' })))).toBe(true)
    const pickAndDone: AnyMove = { type: 'pick', pick: { kind: 'card', card: 'x' }, done: true }
    expect(arrived(pickAndDone, before, view(cardState(), { hand: hand({ kind: 'card', card: 'x' }) }))).toBe(false)
    expect(arrived(pickAndDone, before, view(cardState({ done: ['a'] })))).toBe(true)
  })

  it('domarens val: när avslöjandet kommit', () => {
    const before = view(cardState({ step: 'judging' }))
    expect(arrived({ type: 'judge', key: 'k1' }, before, before)).toBe(false)
    expect(arrived({ type: 'judge', key: 'k1' }, before, view(cardState({ step: 'reveal' })))).toBe(true)
  })

  it('ett nytt frågekort gör att draget inte gäller längre', () => {
    const before = view(cardState())
    expect(arrived({ type: 'done' }, before, view(cardState({ prompt: 'nytt' })))).toBe(true)
  })
})

describe('resendMoves', () => {
  const before = view(imposterState({ step: 'kort' }))

  it('väntar pausen ut, skickar igen och ger upp vid gränsen', () => {
    let list = [newPendingMove('1', { type: 'read' }, before, NOW)]
    expect(resendMoves(list, before, NOW + RESEND_MS - 1).send).toEqual([])
    let sent = 0
    let now = NOW
    for (let i = 0; i < RESEND_MAX_TRIES + 5; i++) {
      now += RESEND_MS
      const result = resendMoves(list, before, now)
      sent += result.send.length
      list = result.keep
    }
    expect(sent).toBe(RESEND_MAX_TRIES)
    expect(list).toHaveLength(1)
    expect(list[0].failed).toBe(true)
  })

  function gaveUp() {
    let list = [newPendingMove('1', { type: 'read' }, before, NOW)]
    let now = NOW
    for (let i = 0; i <= RESEND_MAX_TRIES; i++) {
      now += RESEND_MS
      list = resendMoves(list, before, now).keep
    }
    return { list, now }
  }

  it('visar inget först, Skickar… vid omsändning och beskedet när försöken tagit slut', () => {
    const list = [newPendingMove('1', { type: 'read' }, before, NOW)]
    expect(moveDelivery(list)).toBe('ok')
    const resent = resendMoves(list, before, NOW + RESEND_MS).keep
    expect(moveDelivery(resent)).toBe('sending')
    expect(moveDelivery(gaveUp().list)).toBe('failed')
    expect(moveDelivery([])).toBe('ok')
  })

  it('ett drag som gett upp skickas inte mer av sig självt, men släpps om läget visar att det kom fram', () => {
    const { list, now } = gaveUp()
    expect(resendMoves(list, before, now + RESEND_MS * 5).send).toEqual([])
    const arrivedView = view(imposterState({ step: 'kort', read: ['a'] }))
    expect(resendMoves(list, arrivedView, now + RESEND_MS).keep).toEqual([])
  })

  it('Tryck igen skickar direkt med samma nummer och ger nya försök', () => {
    const { list, now } = gaveUp()
    const { keep, send } = retryMoves(list, now)
    expect(send.map((p) => p.nr)).toEqual(['1'])
    expect(moveDelivery(keep)).toBe('sending')
    expect(resendMoves(keep, before, now + RESEND_MS).send).toHaveLength(1)
  })

  it('Tryck igen skickar inte drag som fortfarande försöker', () => {
    const list = [newPendingMove('1', { type: 'read' }, before, NOW)]
    expect(retryMoves(list, NOW).send).toEqual([])
  })

  it('ett nytt val ersätter ett drag som gett upp, så att beskedet försvinner', () => {
    const state = view(cardState())
    let list = [newPendingMove('x', { type: 'done' }, state, NOW)]
    let now = NOW
    for (let i = 0; i <= RESEND_MAX_TRIES; i++) {
      now += RESEND_MS
      list = resendMoves(list, state, now).keep
    }
    expect(moveDelivery(list)).toBe('failed')
    expect(moveDelivery(addPendingMove(list, newPendingMove('y', { type: 'done' }, state, now)))).toBe('ok')
  })

  it('en gissning: inget först, Skickar… vid omsändning, beskedet efter gränsen, inget när den syns i läget', () => {
    expect(guessDelivery({ missing: true, tries: 0 })).toBe('ok')
    expect(guessDelivery({ missing: true, tries: 1 })).toBe('sending')
    expect(guessDelivery({ missing: true, tries: RESEND_MAX_TRIES })).toBe('sending')
    expect(guessDelivery({ missing: true, tries: RESEND_MAX_TRIES + 1 })).toBe('failed')
    expect(guessDelivery({ missing: false, tries: RESEND_MAX_TRIES + 1 })).toBe('ok')
  })

  it('släpper ett drag som kommit fram utan att skicka det', () => {
    const list = [newPendingMove('1', { type: 'read' }, before, NOW)]
    const result = resendMoves(list, view(imposterState({ step: 'kort', read: ['a'] })), NOW + RESEND_MS)
    expect(result).toEqual({ keep: [], send: [] })
  })

  it('ett nytt val ersätter det förra, men andra sorters drag ligger kvar', () => {
    const state = view(cardState())
    const pick = (id: string) => newPendingMove(id, { type: 'pick', pick: { kind: 'card', card: id } }, state, NOW)
    let list = addPendingMove([], pick('x'))
    list = addPendingMove(list, newPendingMove('d', { type: 'done' }, state, NOW))
    list = addPendingMove(list, pick('y'))
    expect(list.map((p) => p.nr).sort()).toEqual(['d', 'y'])
  })

  it('ett nytt ord ersätter ett pass i samma tur', () => {
    const state = view(imposterState())
    const list = addPendingMove([newPendingMove('p', { type: 'pass' }, state, NOW)], newPendingMove('c', { type: 'clue', word: 'x' }, state, NOW))
    expect(list.map((p) => p.nr)).toEqual(['c'])
  })
})

describe('raden i facit när något aldrig kom fram', () => {
  const card: AnyMove = { type: 'pick', pick: { kind: 'card', card: 'x' } }
  const choosing = view(cardState())

  it('ett kort: förlorat när tiden tog slut och jag inte syns bland dem som valt', () => {
    const pending = newPendingMove('1', card, choosing, NOW)
    expect(lostMove(pending, choosing)).toBeNull()
    expect(lostMove(pending, view(cardState({ step: 'judging' })))).toEqual({ kind: 'card', round: 1, prompt: 'p' })
    expect(lostMove(pending, view(cardState({ step: 'judging', chosen: ['a'] })))).toBeNull()
  })

  it('ett drag från en tidigare runda visas aldrig i en ny runda', () => {
    const pending = newPendingMove('1', card, choosing, NOW)
    expect(lostMove(pending, view(cardState({ step: 'question', prompt: 'nytt', chosen: [] })))).toBeNull()
    expect(lostMove(pending, view({ ...cardState({ step: 'reveal' }), round: 2 }))).toBeNull()
  })

  it('domarens val: förlorat bara om domaren räknas som somnad', () => {
    const pending = newPendingMove('1', { type: 'judge', key: 'k1' }, view(cardState({ step: 'judging' })), NOW)
    expect(lostMove(pending, view(cardState({ step: 'judging' })))).toBeNull()
    expect(lostMove(pending, view(cardState({ step: 'reveal' })))).toBeNull()
    expect(lostMove(pending, view(cardState({ step: 'reveal', judgeAsleep: true })))?.kind).toBe('judge')
  })

  it('andra drag och andra spel ger ingen rad', () => {
    const pending = newPendingMove('1', { type: 'done' }, choosing, NOW)
    expect(lostMove(pending, view(cardState({ step: 'judging' })))).toBeNull()
    expect(lostMove(newPendingMove('1', { type: 'read' }, view(imposterState()), NOW), view(imposterState({ step: 'facit' })))).toBeNull()
  })

  it('texten för ett kort och ett domarval syns bara i avslöjandet av samma runda', () => {
    const lost = { kind: 'card', round: 1, prompt: 'p' } as const
    expect(lostMoveText(cardState({ step: 'reveal' }), 'a', null, lost)).toBe('Ditt kort kom inte fram')
    expect(lostMoveText(cardState({ step: 'reveal' }), 'a', null, { ...lost, kind: 'judge' })).toBe('Ditt val kom inte fram')
    expect(lostMoveText(cardState({ step: 'judging' }), 'a', null, lost)).toBeNull()
    expect(lostMoveText(cardState({ step: 'reveal', prompt: 'nytt' }), 'a', null, lost)).toBeNull()
    expect(lostMoveText({ ...cardState({ step: 'reveal' }), round: 2 }, 'a', null, lost)).toBeNull()
    expect(lostMoveText(cardState({ step: 'reveal' }), 'a', null, null)).toBeNull()
  })

  it('en gissning: raden syns när jag skickade men inte finns i facit', () => {
    const lastResult = { target: 5, guesses: { b: 3 }, winners: ['b'], points: {}, itemId: null }
    const reveal: GameState = { ...initialState('narmast'), phase: 'reveal', round: 2, lastResult }
    expect(lostMoveText(reveal, 'a', 2, null)).toBe('Din gissning kom inte fram')
    expect(lostMoveText(reveal, 'b', 2, null)).toBeNull()
    expect(lostMoveText(reveal, 'a', null, null)).toBeNull()
    expect(lostMoveText(reveal, 'a', 1, null)).toBeNull()
  })
})

describe('värden känner igen ett drag', () => {
  it('samma nummer räknas bara en gång, och drag utan nummer kontrolleras inte', () => {
    const seen: Record<string, string[]> = {}
    expect(isSeenMove(seen, 'a', '1')).toBe(false)
    rememberMove(seen, 'a', '1')
    expect(isSeenMove(seen, 'a', '1')).toBe(true)
    expect(isSeenMove(seen, 'b', '1')).toBe(false)
    rememberMove(seen, 'a', null)
    expect(isSeenMove(seen, 'a', null)).toBe(false)
  })

  it('kommer inte ihåg hur många som helst', () => {
    const seen: Record<string, string[]> = {}
    for (let i = 0; i < 100; i++) rememberMove(seen, 'a', String(i))
    expect(seen.a.length).toBeLessThanOrEqual(30)
    expect(isSeenMove(seen, 'a', '99')).toBe(true)
  })

  it('ett drag som inte ändrade något ger samma objekt tillbaka, så att värden kan se det', () => {
    const state = imposterState({ step: 'kort', read: ['a'] })
    const host = { state, secrets: { kind: 'imposter', wordId: 'x', imposter: 'a', rejected: {}, ready: [], votes: {}, discussionAt: null, accuseVotes: {}, resumeMs: null } } as HostState
    const next = hostMove(host, 'a', { type: 'read' }, ['a', 'b', 'c'], NOW)
    expect(next.state).toBe(host.state)
    expect(next.secrets).toBe(host.secrets)
  })
})
