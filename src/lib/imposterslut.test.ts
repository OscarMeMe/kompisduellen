import { describe, expect, it } from 'vitest'
import { currentTurn, imposterDeadline, imposterMove, imposterNextRound, startImposterMatch, type ImposterHost, type ImposterMove, type ImposterRound } from '@/lib/imposterjakten'
import { imposterAwards, imposterStats, imposterStatsLine, outcomeText, winnerLine } from '@/lib/imposterslut'
import { initialState } from '@/lib/match'
import { parseStateMessage } from '@/lib/meddelanden'

const round = (imposter: string, kind: ImposterRound['kind'], votes: Record<string, string>, word = 'Paraply'): ImposterRound => ({
  word,
  imposter,
  kind,
  guess: kind === 'gissade-ratt' ? word : null,
  votes,
})

const PLAYERS = ['a', 'b', 'c', 'd']

describe('omgångarna på slutskärmen', () => {
  it('säger hur varje omgång slutade', () => {
    expect(outcomeText({ kind: 'undan' })).toBe('kom undan')
    expect(outcomeText({ kind: 'gissade-ratt' })).toBe('fångad, gissade rätt')
    expect(outcomeText({ kind: 'gissade-fel' })).toBe('fångad, gissade fel')
    expect(outcomeText({ kind: 'gav-upp' })).toBe('fångad, gav upp')
  })
})

describe('utmärkelserna i Imposterjakten', () => {
  it('ger inga utmärkelser utan omgångar', () => {
    expect(imposterAwards([], PLAYERS)).toEqual([])
  })

  it('Mästerbluffaren är den som kom undan flest gånger', () => {
    const history = [round('a', 'undan', { b: 'c', c: 'b', d: 'c', a: 'c' }), round('a', 'undan', { b: 'c', c: 'd', d: 'c', a: 'c' }), round('b', 'gav-upp', { a: 'b', c: 'b', d: 'b', b: 'a' })]
    const awards = imposterAwards(history, PLAYERS)
    expect(awards[0]).toEqual({ id: 'bluffare', title: 'Mästerbluffaren', ids: ['a'], what: 'Kom undan 2 gånger' })
  })

  it('Spårhunden räknar bara röster som oskyldig, och säger av hur många', () => {
    // b röstar rätt i båda sina omgångar som oskyldig. a:s röst som imposter räknas inte.
    const history = [round('a', 'gav-upp', { a: 'b', b: 'a', c: 'a', d: 'b' }), round('c', 'gav-upp', { a: 'c', b: 'c', c: 'a', d: 'a' })]
    const hound = imposterAwards(history, PLAYERS).find((award) => award.id === 'sparhund')
    expect(hound).toEqual({ id: 'sparhund', title: 'Spårhunden', ids: ['b'], what: 'Rätt 2 av 2' })
  })

  it('Syndabocken är den oskyldiga som fick flest röster, och delas vid lika', () => {
    const history = [round('a', 'undan', { a: 'b', b: 'c', c: 'b', d: 'c' })]
    const scapegoat = imposterAwards(history, PLAYERS).find((award) => award.id === 'syndabock')
    expect(scapegoat).toEqual({ id: 'syndabock', title: 'Syndabocken', ids: ['b', 'c'], what: '2 röster, helt oskyldig' })
  })

  it('visar högst tre, med Tankeläsaren och Blåögd sist i kön', () => {
    const history = [
      round('a', 'undan', { a: 'b', b: 'c', c: 'b', d: 'c' }),
      round('b', 'gissade-ratt', { a: 'b', b: 'a', c: 'b', d: 'a' }, 'Zlatan'),
      round('c', 'undan', { a: 'd', b: 'd', c: 'd', d: 'a' }),
    ]
    const awards = imposterAwards(history, PLAYERS)
    // Ingen röstade rätt två gånger, så Spårhunden delas inte ut och Tankeläsaren kommer med.
    expect(awards.map((award) => award.id)).toEqual(['bluffare', 'syndabock', 'tankelasare'])
    const four = [...history, round('d', 'gav-upp', { a: 'd', b: 'd', c: 'd', d: 'a' })]
    expect(imposterAwards(four, PLAYERS).map((award) => award.id)).toEqual(['bluffare', 'sparhund', 'syndabock'])
    const caught = [round('b', 'gissade-ratt', { a: 'b', b: 'a', c: 'b', d: 'b' }, 'Zlatan')]
    const ids = imposterAwards(caught, PLAYERS)
    expect(ids.find((award) => award.id === 'tankelasare')).toEqual({ id: 'tankelasare', title: 'Tankeläsaren', ids: ['b'], what: 'Gissade Zlatan' })
  })

  it('ger hellre ingen utmärkelse än en tunn: en rätt röst eller en röst som oskyldig räcker inte', () => {
    const history = [round('a', 'gav-upp', { a: 'b', b: 'a', c: 'd', d: 'c' })]
    expect(imposterAwards(history, PLAYERS)).toEqual([])
  })

  it('räknar aldrig den som inte var med i matchen', () => {
    const history = [round('x', 'undan', { a: 'x', b: 'y', y: 'a' })]
    const awards = imposterAwards(history, PLAYERS)
    expect(awards.flatMap((award) => award.ids).every((id) => PLAYERS.includes(id))).toBe(true)
  })
})

describe('siffrorna och raden under vinnaren', () => {
  const history = [
    round('a', 'undan', { a: 'b', b: 'c', c: 'b', d: 'c' }),
    round('b', 'gav-upp', { a: 'b', b: 'a', c: 'b', d: 'a' }),
    round('a', 'undan', { a: 'b', b: 'c', c: 'a', d: 'c' }),
  ]

  it('räknar omgångar, fångade imposters och röster på fel person', () => {
    expect(imposterStats(history)).toEqual({ rounds: 3, caught: 1, wrongVotes: 6 })
    expect(imposterStatsLine(imposterStats(history))).toBe('3 omgångar · impostern fångad 1 gång · 6 röster på fel person')
    expect(imposterStatsLine({ rounds: 1, caught: 2, wrongVotes: 1 })).toBe('1 omgång · impostern fångad 2 gånger · 1 röst på fel person')
  })

  it('säger hur vinsten kom till', () => {
    expect(winnerLine(history, ['a'], 7)).toBe('Kom undan 2 gånger · 7 poäng')
    expect(winnerLine([round('a', 'gav-upp', { b: 'a', c: 'a' }), round('c', 'gav-upp', { b: 'c', a: 'c' })], ['b'], 6)).toBe('Röstade rätt varje gång · 6 poäng')
    expect(winnerLine(history, ['a', 'b'], 5)).toBe('Delad seger med 5 poäng')
    expect(winnerLine([], ['a'], 0)).toBe('0 poäng')
  })
})

describe('historiken i spelmotorn', () => {
  const ids = ['p0', 'p1', 'p2', 'p3']
  const players = Object.fromEntries(ids.map((id) => [id, { name: id, avatar: '🤪' }]))

  // Spelar en omgång där alla passar och alla röstar på target (impostern röstar på en oskyldig).
  function playRound(start: ImposterHost, voteFor: (imposter: string) => string): ImposterHost {
    let host = start
    let now = 1_000_000
    const move = (id: string, m: ImposterMove) => {
      now += 1000
      host = imposterMove(host, id, m, ids, now)
    }
    for (const id of ids) move(id, { type: 'read' })
    while (host.state.imposter!.step === 'ledtradar') move(currentTurn(host.state.imposter!)!, { type: 'pass' })
    now += 60_000
    for (const id of ids) move(id, { type: 'ready', on: true })
    // Alla är redo: den korta nedräkningen går ut och omröstningen öppnas.
    if (host.state.deadline !== null) host = imposterDeadline(host, host.state.deadline, host.state.deadline, ids)
    now = Math.max(now, host.state.deadline ?? now) + 10_000
    const imposter = host.secrets.imposter
    const target = voteFor(imposter)
    for (const id of ids) move(id, { type: 'vote', target: id === target ? ids.find((other) => other !== id && other !== imposter)! : target })
    if (host.state.imposter!.step === 'gissning') move(imposter, { type: 'giveUp' })
    return host
  }

  it('sparar en rad per spelad omgång i facit, och nollställs när en ny match startar', () => {
    const base = initialState('imposterjakten')
    let host = startImposterMatch({ ...base, players, rounds: 2 })
    expect(host.state.imposterMatch.history).toEqual([])

    host = playRound(host, (imposter) => imposter)
    expect(host.state.imposter!.step).toBe('facit')
    const first = host.state.imposterMatch.history!
    expect(first).toHaveLength(1)
    expect(first[0].imposter).toBe(host.secrets.imposter)
    expect(first[0].kind).toBe('gav-upp')
    expect(first[0].word).toBe(host.state.imposter!.outcome!.word)
    expect(Object.keys(first[0].votes)).toHaveLength(4)

    // Läget med historiken klarar kontrollen av meddelanden.
    expect(parseStateMessage({ from: 'p0', sentAt: 5, state: host.state })).not.toBeNull()

    host = imposterNextRound(host, ids)
    host = playRound(host, (imposter) => ids.find((id) => id !== imposter)!)
    expect(host.state.imposterMatch.history).toHaveLength(2)
    expect(host.state.imposterMatch.history![1].kind).toBe('undan')

    const again = startImposterMatch(host.state)
    expect(again.state.imposterMatch.history).toEqual([])
  })
})
