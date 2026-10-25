import { describe, expect, it } from 'vitest'
import { matchHighlights } from '@/lib/hojdpunkter'
import { addGuess, addPlayers, initialState, nextRound, resolveRound, startGame, type GameState } from '@/lib/match'

const NOW = 1_000_000
const KUDDE = 'ikea-famnig-1998' // Ikeas hjärtformade kudde med armar, 79 kr

type Round = { guesses: Record<string, number>; price: number }

// Spelar en hel match i Gissa priset med bestämda priser och gissningar.
function playMatch(ids: string[], rounds: Round[]): GameState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id[0].toUpperCase() + id.slice(1), avatar: '👻' }]))
  let state = startGame({ ...addPlayers(initialState('gissa-priset'), players), rounds: rounds.length }, ids, NOW)
  for (const round of rounds) {
    state = { ...state, itemId: KUDDE }
    for (const [id, value] of Object.entries(round.guesses)) state = addGuess(state, id, value)
    state = nextRound(resolveRound(state, NOW, round.price), NOW)
  }
  return state
}

const ids = (state: GameState) => matchHighlights(state).map((h) => h.id)

describe('matchens höjdpunkter', () => {
  it('visar fullträffen med sak och pris', () => {
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 79, mia: 100 }, price: 79 }])
    const hit = matchHighlights(state).find((h) => h.id === 'fulltraff')
    expect(hit?.text).toBe('Oscar prickade rätt: Ikeas hjärtformade kudde med armar, 79 kr.')
  })

  it('visar ingen fullträff när ingen fick 100 poäng', () => {
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 90, mia: 70 }, price: 79 }])
    expect(ids(state)).not.toContain('fulltraff')
  })

  it('lyfter fram den gissning som var längst ifrån, mätt som i poängen', () => {
    // 790 kr är tio gånger fel. 10 kr är nästan åtta gånger fel, alltså lite närmare.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 790, mia: 10 }, price: 79 }])
    const miss = matchHighlights(state).find((h) => h.id === 'langst-ifran')
    expect(miss?.text).toBe('Oscar gissade 790 kr på Ikeas hjärtformade kudde med armar. Rätt pris var 79 kr.')
  })

  it('räknar inte uteblivna svar som dåliga gissningar', () => {
    // Mia svarade inte alls. Oscars gissning är bara lite fel, så ingen miss är värd att lyfta fram.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 70 }, price: 79 }])
    expect(ids(state)).not.toContain('langst-ifran')
  })

  it('låter lika långt ifrån dela på titeln', () => {
    // Dubbla och halva priset är lika fel.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 200, mia: 50 }, price: 100 }])
    const miss = matchHighlights(state).find((h) => h.id === 'langst-ifran')
    expect(miss?.text).toBe('Oscar och Mia delar på den här: lika långt ifrån rätt svar.')
  })

  it('visar avgörandet när sista rundan vände matchen', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 150 }, price: 100 }, // Oscar leder
        { guesses: { oscar: 1000, mia: 100 }, price: 100 }, // Mia vänder
      ],
    )
    const decided = matchHighlights(state).find((h) => h.id === 'sista-rundan')
    expect(decided?.text).toBe('Mia låg efter inför sista rundan men vände och vann!')
  })

  it('visar avgörandet när en delad ledning blev en ensam vinst', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 100 }, price: 100 }, // lika
        { guesses: { oscar: 100, mia: 150 }, price: 100 },
      ],
    )
    expect(matchHighlights(state)[0].text).toBe('Oscar delade ledningen inför sista rundan och drog ifrån på slutet.')
  })

  it('visar inget avgörande om ledaren bara behöll ledningen eller om det blev delad seger', () => {
    const kept = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 150 }, price: 100 },
        { guesses: { oscar: 100, mia: 150 }, price: 100 },
      ],
    )
    expect(ids(kept)).not.toContain('sista-rundan')
    const shared = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 150 }, price: 100 },
        { guesses: { oscar: 150, mia: 100 }, price: 100 },
      ],
    )
    expect(ids(shared)).not.toContain('sista-rundan')
  })

  it('visar högst två höjdpunkter', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 5000 }, price: 100 }, // Oscar 100, Mia 15
        { guesses: { oscar: 10_000, mia: 100 }, price: 100 }, // Oscar 0, Mia 100: Mia vänder
      ],
    )
    // Alla tre finns (vändning, fullträffar och en miss på hundra gånger fel), men bara två visas.
    expect(ids(state)).toEqual(['sista-rundan', 'fulltraff'])
  })

  it('visar bara fullträffar i en ensam provomgång', () => {
    const state = playMatch(['oscar'], [{ guesses: { oscar: 79 }, price: 79 }, { guesses: { oscar: 7900 }, price: 79 }])
    expect(ids(state)).toEqual(['fulltraff'])
  })

  it('visar inga höjdpunkter före matchens slut', () => {
    const players = { oscar: { name: 'Oscar', avatar: '👻' }, mia: { name: 'Mia', avatar: '👽' } }
    const playing = startGame(addPlayers(initialState('gissa-priset'), players), ['oscar', 'mia'], NOW)
    expect(matchHighlights(playing)).toEqual([])
  })
})
