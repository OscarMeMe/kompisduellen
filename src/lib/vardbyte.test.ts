import { describe, expect, it } from 'vitest'
import { addPlayers, initialState, resolveRound, startGame, type GameState } from '@/lib/match'
import { pickSuccessor, shouldYieldHost, takeOverState } from '@/lib/vardbyte'

const player = (id: string, joinedAt: number, host = false) => ({ id, host, joinedAt })

function inRound(game: string, ids: string[]): GameState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id, avatar: '👻' }]))
  return startGame(addPlayers(initialState(game), players), ids, 1000)
}

describe('vem som tar över', () => {
  it('är den som varit med längst av dem som är kvar', () => {
    const online = [player('a', 1), player('b', 2), player('c', 3)]
    expect(pickSuccessor(online)?.id).toBe('a')
    // Värden (som alltid är först i listan i ett riktigt läge) hoppas över.
    expect(pickSuccessor([player('h', 0, true), ...online])?.id).toBe('a')
    expect(pickSuccessor(online, 'a')?.id).toBe('b')
  })

  it('är ingen om ingen annan är kvar', () => {
    expect(pickSuccessor([player('h', 1, true)])).toBeUndefined()
    expect(pickSuccessor([player('a', 1)], 'a')).toBeUndefined()
  })

  it('alla räknar ut samma spelare oavsett vem som frågar', () => {
    const online = [player('b', 2), player('c', 3), player('a', 1)].sort((x, y) => x.joinedAt - y.joinedAt)
    expect(pickSuccessor(online)?.id).toBe('a')
  })
})

describe('två värdar samtidigt', () => {
  it('den som anslöt senast viker sig', () => {
    const early = player('x', 10, true)
    const late = player('y', 20, true)
    expect(shouldYieldHost(late, [early])).toBe(true)
    expect(shouldYieldHost(early, [late])).toBe(false)
  })

  it('lika tid avgörs på id, och en ensam värd viker sig aldrig', () => {
    const a = player('a', 10, true)
    const b = player('b', 10, true)
    expect(shouldYieldHost(b, [a])).toBe(true)
    expect(shouldYieldHost(a, [b])).toBe(false)
    expect(shouldYieldHost(a, [a, player('c', 5)])).toBe(false)
  })
})

describe('tillståndet när en ny värd tar över', () => {
  it('räknar om klockorna till den nya värdens klocka', () => {
    const state = inRound('gissa-priset', ['a', 'b'])
    const next = takeOverState(state, 250)
    expect(next.deadline).toBe(state.deadline! + 250)
    expect(next.phase).toBe('guessing')
    expect(next.round).toBe(1)
    expect(Object.keys(next.players)).toEqual(['a', 'b'])
  })

  it('behåller poäng, ställning och facit, och en paus står kvar', () => {
    let state = inRound('gissa-priset', ['a', 'b'])
    state = resolveRound({ ...state, guesses: { a: 100, b: 500 } }, 2000, 100)
    const next = takeOverState({ ...state, deadline: null, pause: { by: 'A', msLeft: 5000 } }, 99)
    expect(next.phase).toBe('reveal')
    expect(next.deadline).toBeNull()
    expect(next.pause).toEqual({ by: 'A', msLeft: 5000 })
    expect(next.scores).toEqual(state.scores)
    expect(next.lastResult).toEqual(state.lastResult)
  })

  it('räknar om en pågående nedräkning före matchen', () => {
    const waiting = { ...initialState('gissa-priset'), rematchAt: 5000 }
    expect(takeOverState(waiting, -100).rematchAt).toBe(4900)
    expect(takeOverState(initialState('gissa-priset'), 100).rematchAt).toBeNull()
  })

  it('avbryter en kortmatch, eftersom korten bara fanns hos förra värden', () => {
    const playing: GameState = { ...inRound('gissa-priset', ['a', 'b', 'c']), game: 'kortkaos', phase: 'playing' }
    const next = takeOverState(playing, 0)
    expect(next.phase).toBe('waiting')
    expect(next.cards).toBeNull()
    expect(next.scores).toEqual({ a: 0, b: 0, c: 0 })
    expect(next.notice).toContain('avbröts')
    expect(Object.keys(next.players)).toEqual(['a', 'b', 'c'])
  })
})
