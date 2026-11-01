import { describe, expect, it } from 'vitest'
import { addPlayers, initialState, startGame } from '@/lib/match'
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
} from '@/lib/meddelanden'

const players = { a: { name: 'Anna', avatar: '👻' }, b: { name: 'Bo', avatar: '🤖' } }
const lobby = addPlayers(initialState('gissa-priset'), players)

describe('läget från värden', () => {
  it('tar emot ett riktigt läge, även mitt i en match', () => {
    const playing = startGame(lobby, ['a', 'b'], 1000)
    const parsed = parseStateMessage({ state: playing, sentAt: 5, from: 'a' })
    expect(parsed).toEqual({ state: playing, sentAt: 5, from: 'a' })
  })

  it('fyller i fält som saknas med startvärden, t.ex. från en äldre version av sajten', () => {
    const { notice: _notice, choosingGame: _choosing, ...old } = lobby
    const parsed = parseStateMessage({ state: old, sentAt: 5 })
    expect(parsed?.state.notice).toBeNull()
    expect(parsed?.state.choosingGame).toBe(false)
    expect(parsed?.from).toBeNull()
  })

  it('slänger trasiga meddelanden i stället för att krascha', () => {
    for (const payload of [
      undefined,
      null,
      'hej',
      {},
      { state: null, sentAt: 1 },
      { state: lobby },
      { state: { ...lobby, phase: 'fusk' }, sentAt: 1 },
      { state: { ...lobby, players: { a: { name: 5 } } }, sentAt: 1 },
      { state: { ...lobby, rematchWishes: [1] }, sentAt: 1 },
      { state: { ...lobby, scores: { a: 'massor' } }, sentAt: 1 },
      { state: { ...lobby, matchRounds: 'nej' }, sentAt: 1 },
      { state: { ...lobby, usedItemIds: [1, 2] }, sentAt: 1 },
      { state: { ...lobby, usedItemIds: 'alla' }, sentAt: 1 },
      { state: { ...lobby, lastResult: { target: 1 } }, sentAt: 1 },
      { state: { ...lobby, cards: { step: 'choosing' } }, sentAt: 1 },
      { state: { ...lobby, game: 7 }, sentAt: 1 },
      { state: lobby, sentAt: Number.NaN },
    ]) {
      expect(parseStateMessage(payload)).toBeNull()
    }
  })
})

describe('bara från värden', () => {
  const host = { id: 'a', sendsFrom: true }
  const oldHost = { id: 'a', sendsFrom: false }

  it('godtar läget från den som är värd enligt närvarolistan', () => {
    expect(isFromHost('a', [host])).toBe(true)
    expect(isFromHost('b', [host])).toBe(false)
    expect(isFromHost('a', [])).toBe(false)
  })

  it('slänger ett läge utan avsändare när värden alltid skickar med sig själv', () => {
    // Annars kunde en fuskare bara låta bli att ange avsändare.
    expect(isFromHost(null, [host])).toBe(false)
    expect(isFromHost(null, [])).toBe(false)
  })

  it('godtar ett läge utan avsändare från en värd med en äldre version av sajten', () => {
    expect(isFromHost(null, [oldHost])).toBe(true)
  })
})

describe('gissningar och kortdrag', () => {
  it('godtar en gissning med id och tal', () => {
    expect(parseGuess({ id: 'a', value: 120 })).toEqual({ id: 'a', value: 120 })
    expect(parseGuess({ id: 'a', value: '120' })).toBeNull()
    expect(parseGuess({ id: 5, value: 120 })).toBeNull()
    expect(parseGuess({ id: 'a', value: Number.POSITIVE_INFINITY })).toBeNull()
    expect(parseGuess(null)).toBeNull()
  })

  it('godtar bara kortdrag med rätt form', () => {
    expect(parseMove({ id: 'a', move: { type: 'pick', pick: { kind: 'card', card: 'x' } } })).toEqual({
      id: 'a',
      move: { type: 'pick', pick: { kind: 'card', card: 'x' }, done: undefined },
    })
    expect(parseMove({ id: 'a', move: { type: 'pick', pick: { kind: 'blank', text: 'egen' }, done: true } })?.move).toEqual({
      type: 'pick',
      pick: { kind: 'blank', text: 'egen' },
      done: true,
    })
    expect(parseMove({ id: 'a', move: { type: 'done' } })?.move).toEqual({ type: 'done' })
    expect(parseMove({ id: 'a', move: { type: 'judge', key: 'k1' } })?.move).toEqual({ type: 'judge', key: 'k1' })
    // Utan kort, okänd sort, fel typer eller okänt drag.
    expect(parseMove({ id: 'a', move: { type: 'pick' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'pick', pick: { kind: 'fusk' } } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'pick', pick: { kind: 'card', card: 1 } } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'judge' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'vinn' } })).toBeNull()
    expect(parseMove({ id: 'a' })).toBeNull()
  })

  it('godtar Imposterjaktens drag med rätt form', () => {
    expect(parseMove({ id: 'a', move: { type: 'read' } })?.move).toEqual({ type: 'read' })
    expect(parseMove({ id: 'a', move: { type: 'pass', extra: 1 } })?.move).toEqual({ type: 'pass' })
    expect(parseMove({ id: 'a', move: { type: 'said' } })?.move).toEqual({ type: 'said' })
    expect(parseMove({ id: 'a', move: { type: 'said', word: 'regn' } })?.move).toEqual({ type: 'said', word: 'regn' })
    expect(parseMove({ id: 'a', move: { type: 'said', word: 5 } })?.move).toEqual({ type: 'said' })
    expect(parseMove({ id: 'a', move: { type: 'clue', word: 'regn' } })?.move).toEqual({ type: 'clue', word: 'regn' })
    expect(parseMove({ id: 'a', move: { type: 'clue' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'clue', word: 5 } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'clue', word: 'x'.repeat(101) } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'ready', on: true } })?.move).toEqual({ type: 'ready', on: true })
    expect(parseMove({ id: 'a', move: { type: 'ready', on: false } })?.move).toEqual({ type: 'ready', on: false })
    expect(parseMove({ id: 'a', move: { type: 'ready' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'ready', on: 'ja' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'vote', target: 'b' } })?.move).toEqual({ type: 'vote', target: 'b' })
    expect(parseMove({ id: 'a', move: { type: 'vote' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'vote', target: 2 } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'guess', word: 'Paraply' } })?.move).toEqual({ type: 'guess', word: 'Paraply' })
    expect(parseMove({ id: 'a', move: { type: 'guess' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'guess', word: 'x'.repeat(101) } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'giveUp' } })?.move).toEqual({ type: 'giveUp' })
    expect(parseMove({ id: 'a', move: { type: 'point', target: 'b' } })?.move).toEqual({ type: 'point', target: 'b' })
    expect(parseMove({ id: 'a', move: { type: 'point', target: null } })?.move).toEqual({ type: 'point', target: null })
    expect(parseMove({ id: 'a', move: { type: 'point' } })).toBeNull()
    expect(parseMove({ id: 'a', move: { type: 'point', target: 3 } })).toBeNull()
    expect(parseTyping({ id: 'a' })).toEqual({ id: 'a' })
    expect(parseTyping({ id: 2 })).toBeNull()
    expect(parseTyping({ text: 'hemligt' })).toBeNull()
  })
})

describe('händer och värdbyten', () => {
  it('godtar en hand med rätt form, eller ingen hand', () => {
    const hand = { cards: ['x', 'y'], blank: true, pick: null }
    expect(parseHand({ to: 'a', from: 'b', hand })).toEqual({ to: 'a', from: 'b', hand })
    expect(parseHand({ to: 'a', hand: null })).toEqual({ to: 'a', from: null, hand: null })
    expect(parseHand({ to: 'a', hand: { cards: 'x' } })).toBeNull()
    expect(parseHand({ hand })).toBeNull()
  })

  it('godtar mitt kort i Imposterjakten, eller inget kort', () => {
    const innocent = { card: { role: 'oskyldig', word: 'Paraply', category: null }, rejectedAt: null, ready: false, vote: null }
    expect(parseImposterCard({ to: 'a', from: 'b', card: innocent })).toEqual({ to: 'a', from: 'b', card: innocent })
    const imposter = { card: { role: 'imposter', hint: 'väder', category: 'Vardag och saker' }, rejectedAt: 12, ready: true, vote: 'b' }
    expect(parseImposterCard({ to: 'a', card: imposter })?.card).toEqual(imposter)
    const empty = { card: null, rejectedAt: null, ready: false, vote: null }
    expect(parseImposterCard({ to: 'a', card: empty })?.card.card).toBeNull()
    expect(parseImposterCard({ to: 'a', card: { ...empty, card: { role: 'kung' } } })).toBeNull()
    expect(parseImposterCard({ to: 'a', card: { ...empty, card: { role: 'oskyldig', word: 3, category: null } } })).toBeNull()
    expect(parseImposterCard({ to: 'a', card: { ...empty, rejectedAt: 'nu' } })).toBeNull()
    expect(parseImposterCard({ to: 'a', card: { ...empty, ready: 'ja' } })).toBeNull()
    expect(parseImposterCard({ to: 'a', card: { ...empty, vote: 5 } })).toBeNull()
    expect(parseImposterCard({ card: innocent })).toBeNull()
  })

  it('godtar ett värdbyte med mottagare', () => {
    expect(parseHandover({ to: 'a', from: 'b' })).toEqual({ to: 'a', from: 'b' })
    expect(parseHandover({ to: 'a' })).toEqual({ to: 'a', from: null })
    expect(parseHandover({})).toBeNull()
  })
})

describe('önskemål om revansch', () => {
  it('tar emot ett önskemål och ett ångrat önskemål', () => {
    expect(parseRematchWish({ id: 'b', wants: true })).toEqual({ id: 'b', wants: true })
    expect(parseRematchWish({ id: 'b', wants: false })).toEqual({ id: 'b', wants: false })
  })

  it('slänger trasiga önskemål', () => {
    for (const payload of [undefined, null, 'ja', {}, { id: 'b' }, { wants: true }, { id: 5, wants: true }, { id: 'b', wants: 'ja' }]) {
      expect(parseRematchWish(payload)).toBeNull()
    }
  })

  it('fyller i en tom lista när en äldre värd inte skickar önskemålen', () => {
    const { rematchWishes: _wishes, ...old } = lobby
    expect(parseStateMessage({ state: old, sentAt: 1 })?.state.rematchWishes).toEqual([])
  })
})

describe('kast', () => {
  const online = [{ id: 'a' }, { id: 'b' }, { id: 'c', noThrows: true }]
  const open = { online, throwsAllowed: true }

  it('tar emot ett kast mellan två spelare i lobbyn', () => {
    expect(parseThrow({ id: 'a', to: 'b', item: 'tomat' }, open)).toEqual({ id: 'a', to: 'b', item: 'tomat' })
    expect(parseThrow({ id: 'b', to: 'a', item: 'agg' }, open)).toEqual({ id: 'b', to: 'a', item: 'agg' })
    expect(parseThrow({ id: 'a', to: 'b', item: 'gurka' }, open)).toEqual({ id: 'a', to: 'b', item: 'gurka' })
  })

  it('slänger trasiga kast och okända saker', () => {
    for (const payload of [
      undefined,
      null,
      'tomat',
      {},
      { id: 'a', to: 'b' },
      { id: 'a', item: 'tomat' },
      { id: 5, to: 'b', item: 'tomat' },
      { id: 'a', to: 'b', item: 'bomb' },
      { id: 'a', to: 'b', item: 7 },
    ]) {
      expect(parseThrow(payload, open)).toBeNull()
    }
  })

  it('slänger kast på sig själv, till eller från någon som inte finns i lobbyn och till den som stängt av kast', () => {
    expect(parseThrow({ id: 'a', to: 'a', item: 'paj' }, open)).toBeNull()
    expect(parseThrow({ id: 'a', to: 'x', item: 'paj' }, open)).toBeNull()
    expect(parseThrow({ id: 'x', to: 'a', item: 'paj' }, open)).toBeNull()
    expect(parseThrow({ id: 'a', to: 'c', item: 'paj' }, open)).toBeNull()
  })

  it('slänger alla kast när värden har stängt av dem', () => {
    expect(parseThrow({ id: 'a', to: 'b', item: 'tomat' }, { online, throwsAllowed: false })).toBeNull()
  })

  it('godtar läget med kasten avstängda, och slår på dem när en äldre värd inte skickar fältet', () => {
    expect(parseStateMessage({ state: { ...lobby, throwsAllowed: false }, sentAt: 1 })?.state.throwsAllowed).toBe(false)
    const { throwsAllowed: _throws, ...old } = lobby
    expect(parseStateMessage({ state: old, sentAt: 1 })?.state.throwsAllowed).toBe(true)
    expect(parseStateMessage({ state: { ...lobby, throwsAllowed: 'ja' }, sentAt: 1 })).toBeNull()
  })
})

describe('Imposterjakten i läget', () => {
  it('godtar läget med en omgång, och fyller i startvärden när en äldre värd inte skickar fälten', () => {
    const imposter = {
      step: 'ledtradar',
      order: ['a', 'b', 'c'],
      turn: 1,
      clues: [{ player: 'a', kind: 'ord', word: 'regn' }],
      read: ['a', 'b', 'c'],
      category: null,
      hard: false,
      aloud: false,
      readyCount: 1,
      votedCount: 0,
      countdownStarted: false,
      votes: null,
      tied: null,
      tieVotes: null,
      pointers: {},
      caught: null,
      outcome: null,
    }
    expect(parseStateMessage({ state: { ...lobby, imposter }, sentAt: 1 })?.state.imposter).toEqual(imposter)
    const outcome = { kind: 'undan', word: 'Paraply', imposter: 'a', hint: 'Väder', guess: null, points: { a: 2 }, reason: null }
    const revealed = { ...imposter, step: 'facit', votes: { a: 'b', b: 'c', c: 'b' }, outcome }
    expect(parseStateMessage({ state: { ...lobby, imposter: revealed }, sentAt: 1 })?.state.imposter).toEqual(revealed)
    const tie = { ...imposter, step: 'diskussion', tied: ['b', 'c'] }
    expect(parseStateMessage({ state: { ...lobby, imposter: tie }, sentAt: 1 })?.state.imposter).toEqual(tie)
    const guessing = { ...imposter, step: 'gissning', caught: 'a' }
    expect(parseStateMessage({ state: { ...lobby, imposter: guessing }, sentAt: 1 })?.state.imposter).toEqual(guessing)
    expect(parseStateMessage({ state: { ...lobby, imposter: { ...revealed, outcome: { ...outcome, kind: 'vann' } } }, sentAt: 1 })).toBeNull()
    expect(parseStateMessage({ state: { ...lobby, imposter: { ...imposter, tied: 'b' } }, sentAt: 1 })).toBeNull()
    expect(parseStateMessage({ state: { ...lobby, imposter: { ...imposter, pointers: { a: 1 } } }, sentAt: 1 })).toBeNull()
    const pointing = { ...imposter, step: 'diskussion', pointers: { a: 'b' }, tieVotes: { a: 'b', b: 'a' } }
    expect(parseStateMessage({ state: { ...lobby, imposter: pointing }, sentAt: 1 })?.state.imposter).toEqual(pointing)
    // En värd med en äldre version skickar inte fälten för lika röster och facit.
    const { tied: _t, tieVotes: _v, pointers: _p, caught: _c, outcome: _o, ...older } = imposter
    expect(parseStateMessage({ state: { ...lobby, imposter: older }, sentAt: 1 })?.state.imposter).toEqual(imposter)
    expect(parseStateMessage({ state: { ...lobby, imposter: { ...imposter, votes: { a: 1 } } }, sentAt: 1 })).toBeNull()
    const { imposter: _i, imposterSettings: _s, usedWordIds: _u, ...old } = lobby
    const parsed = parseStateMessage({ state: old, sentAt: 1 })?.state
    expect(parsed).toMatchObject({ imposter: null, usedWordIds: [], imposterSettings: { hard: false, category: null, aloud: false } })
  })

  it('slänger läget när omgången har fel form', () => {
    const bad = {
      step: 'rösta',
      order: [],
      turn: 0,
      clues: [],
      read: [],
      category: null,
      hard: false,
      aloud: false,
      readyCount: 0,
      votedCount: 0,
      countdownStarted: false,
      votes: null,
    }
    expect(parseStateMessage({ state: { ...lobby, imposter: bad }, sentAt: 1 })).toBeNull()
    expect(parseStateMessage({ state: { ...lobby, imposterSettings: { hard: 'ja' } }, sentAt: 1 })).toBeNull()
  })
})
