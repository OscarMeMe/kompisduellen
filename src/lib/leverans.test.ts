import { describe, expect, it } from 'vitest'
import { hostMove, initialState, type GameState, type HostState } from '@/lib/match'
import type { ImposterTable, MyImposterCard } from '@/lib/imposterjakten'
import type { CardTable, MyHand } from '@/lib/kort'
import {
  addPendingMove,
  isSeenMove,
  moveArrived,
  newPendingMove,
  rememberMove,
  RESEND_MAX_TRIES,
  RESEND_MS,
  resendMoves,
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

  it('väntar pausen ut, skickar igen och slutar vid gränsen', () => {
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
    expect(list).toEqual([])
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
