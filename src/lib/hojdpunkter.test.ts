import { describe, expect, it } from 'vitest'
import { matchHighlights, validHighlights, winnerSummary } from '@/lib/hojdpunkter'
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

const ids = (state: GameState) => validHighlights(state).map((h) => h.id)

describe('matchens höjdpunkter', () => {
  it('visar fullträffen med sak och pris', () => {
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 79, mia: 100 }, price: 79 }])
    const hit = validHighlights(state).find((h) => h.id === 'fulltraff')
    expect(hit?.text).toBe('Oscar prickade rätt: Ikeas hjärtformade kudde med armar, 79 kr.')
  })

  it('visar ingen fullträff när ingen fick 100 poäng', () => {
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 90, mia: 70 }, price: 79 }])
    expect(ids(state)).not.toContain('fulltraff')
  })

  it('lyfter fram den gissning som var längst ifrån, mätt som i poängen', () => {
    // 790 kr är tio gånger fel. 10 kr är nästan åtta gånger fel, alltså lite närmare.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 790, mia: 10 }, price: 79 }])
    const miss = validHighlights(state).find((h) => h.id === 'langst-ifran')
    expect(miss?.text).toBe('Oscar gissade 790 kr på ”Ikeas hjärtformade kudde med armar”. Rätt pris var 79 kr.')
  })

  it('räknar inte uteblivna svar som dåliga gissningar', () => {
    // Mia svarade inte alls. Oscars gissning är bara lite fel, så ingen miss är värd att lyfta fram.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 70 }, price: 79 }])
    expect(ids(state)).not.toContain('langst-ifran')
  })

  it('låter lika långt ifrån dela på titeln', () => {
    // Dubbla och halva priset är lika fel.
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 200, mia: 50 }, price: 100 }])
    const miss = validHighlights(state).find((h) => h.id === 'langst-ifran')
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
    const decided = validHighlights(state).find((h) => h.id === 'sista-rundan')
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
    const decided = validHighlights(state).find((h) => h.id === 'sista-rundan')
    expect(decided?.text).toBe('Oscar delade ledningen inför sista rundan och drog ifrån på slutet.')
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
        { guesses: { oscar: 100, mia: 150 }, price: 100 }, // Oscar 100, Mia 40
        { guesses: { oscar: 10_000, mia: 100 }, price: 100 }, // Oscar 0, Mia 100: Mia vänder
      ],
    )
    // Alla tre finns (vändning, fullträffar och en miss på hundra gånger fel), men bara två visas.
    expect(ids(state)).toEqual(['sista-rundan', 'fulltraff', 'langst-ifran'])
    expect(matchHighlights(state)).toHaveLength(2)
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

type Timed = { guesses: Record<string, [number, number]>; price: number } // [gissning, sekunder in i rundan]

// Som playMatch, men med tid för varje svar.
function playTimed(ids: string[], rounds: Timed[]): GameState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id[0].toUpperCase() + id.slice(1), avatar: '👻' }]))
  let state = startGame({ ...addPlayers(initialState('gissa-priset'), players), rounds: rounds.length }, ids, NOW)
  for (const round of rounds) {
    state = { ...state, itemId: KUDDE }
    const start = state.deadline! - state.guessSeconds * 1000
    for (const [id, [value, seconds]] of Object.entries(round.guesses)) state = addGuess(state, id, value, start + seconds * 1000)
    state = nextRound(resolveRound(state, NOW, round.price), NOW)
  }
  return state
}

const find = (state: GameState, id: string) => validHighlights(state).find((h) => h.id === id)

describe('fler insikter', () => {
  it('Tankeläsare: två gissade exakt samma', () => {
    const state = playMatch(['oscar', 'mia', 'kim'], [{ guesses: { oscar: 80, mia: 80, kim: 20 }, price: 79 }])
    expect(find(state, 'tankelasare')?.text).toContain('Oscar och Mia gissade exakt samma sak: 80 kr')
  })

  it('Tankeläsare saknas när alla gissade olika', () => {
    const state = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 80, mia: 81 }, price: 79 }])
    expect(find(state, 'tankelasare')).toBeUndefined()
  })

  it('Snålast och Slösaren: ensam om lägst respektive högst i minst två rundor', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 50, mia: 90 }, price: 79 },
        { guesses: { oscar: 60, mia: 100 }, price: 79 },
        { guesses: { oscar: 70, mia: 65 }, price: 79 },
      ],
    )
    expect(find(state, 'snalast')?.text).toContain('Oscar gissade lägst i 2 av 3 rundor')
    expect(find(state, 'slosaren')?.text).toContain('Mia gissade högst i 2 av 3 rundor')
  })

  it('Snålast saknas vid delad förstaplats eller bara en gång', () => {
    const tied = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 50, mia: 90 }, price: 79 },
        { guesses: { oscar: 90, mia: 50 }, price: 79 },
      ],
    )
    expect(find(tied, 'snalast')).toBeUndefined()
    const once = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 50, mia: 90 }, price: 79 }])
    expect(find(once, 'snalast')).toBeUndefined()
  })

  it('Comeback: vinnaren låg ensam sist efter en tidigare runda', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 150, mia: 5000 }, price: 100 }, // Oscar 40, Mia 0
        { guesses: { oscar: 150, mia: 5000 }, price: 100 }, // Oscar 80, Mia 0
        { guesses: { oscar: 10_000, mia: 100 }, price: 100 }, // Mia 100
        { guesses: { oscar: 10_000, mia: 100 }, price: 100 }, // Mia 200 mot Oscar 80
      ],
    )
    expect(find(state, 'comeback')?.text).toBe('Mia låg sist efter runda 1 men vände och tog hem segern!')
  })

  it('Comeback saknas när vinnaren aldrig var sist', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 5000 }, price: 100 },
        { guesses: { oscar: 100, mia: 5000 }, price: 100 },
        { guesses: { oscar: 100, mia: 5000 }, price: 100 },
      ],
    )
    expect(find(state, 'comeback')).toBeUndefined()
  })

  it('Stabilast: jämnast poäng, men bara om någon är jämnare än de andra', () => {
    const state = playMatch(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: 100, mia: 100 }, price: 100 }, // båda 100
        { guesses: { oscar: 125, mia: 10_000 }, price: 100 }, // Oscar ca 70, Mia 0
        { guesses: { oscar: 125, mia: 100 }, price: 100 },
      ],
    )
    expect(find(state, 'stabilast')?.text).toContain('Oscar höll jämnast nivå')
    const same = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 100, mia: 100 }, price: 100 }, { guesses: { oscar: 100, mia: 100 }, price: 100 }, { guesses: { oscar: 100, mia: 100 }, price: 100 }])
    expect(find(same, 'stabilast')).toBeUndefined()
  })

  it('Sista sekunden och Blixten kommer från svarstiderna', () => {
    const state = playTimed(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: [90, 2], mia: [80, 20] }, price: 79 },
        { guesses: { oscar: [90, 3], mia: [80, 25] }, price: 79 },
        { guesses: { oscar: [90, 4], mia: [80, 5] }, price: 79 },
      ],
    )
    expect(find(state, 'sista-sekunden')?.text).toContain('Mia svarade sist i 3 av 3 rundor')
    expect(find(state, 'blixten')?.text).toContain('Oscar svarade snabbast')
  })

  it('Blixten saknas när tiderna ligger för nära varandra eller saknas', () => {
    const close = playTimed(
      ['oscar', 'mia'],
      [
        { guesses: { oscar: [90, 5], mia: [80, 5.2] }, price: 79 },
        { guesses: { oscar: [90, 6], mia: [80, 6.1] }, price: 79 },
      ],
    )
    expect(find(close, 'blixten')).toBeUndefined()
    const untimed = playMatch(['oscar', 'mia'], [{ guesses: { oscar: 90, mia: 80 }, price: 79 }, { guesses: { oscar: 90, mia: 80 }, price: 79 }])
    expect(find(untimed, 'blixten')).toBeUndefined()
    expect(find(untimed, 'sista-sekunden')).toBeUndefined()
  })

  it('slumpar två ur potten, samma för alla men olika mellan matcher', () => {
    const rounds = (shift: number): Round[] => [
      { guesses: { oscar: 150, mia: 5000 + shift }, price: 100 },
      { guesses: { oscar: 150, mia: 5000 + shift }, price: 100 },
      { guesses: { oscar: 10_000, mia: 100 }, price: 100 },
      { guesses: { oscar: 10_000, mia: 100 }, price: 100 },
    ]
    const state = playMatch(['oscar', 'mia'], rounds(0))
    expect(validHighlights(state).length).toBeGreaterThan(2)
    expect(matchHighlights(state)).toEqual(matchHighlights(state))
    const picks = new Set<string>()
    for (let shift = 0; shift < 40; shift++) picks.add(ids2(playMatch(['oscar', 'mia'], rounds(shift))))
    expect(picks.size).toBeGreaterThan(1)
  })
})

const ids2 = (state: GameState) => matchHighlights(state).map((h) => h.id).join()

describe('texten under prispallen', () => {
  // Poängen sätts direkt, så att det är lätt att se vad texten ska bli.
  function finished(scores: Record<string, number>, changes: Partial<GameState> = {}): GameState {
    const players = Object.fromEntries(Object.keys(scores).map((id) => [id, { name: id, avatar: '👻' }]))
    return { ...addPlayers(initialState('gissa-priset'), players), phase: 'finished', round: 5, scores, ...changes }
  }

  it('visar vinnaren, poängen och marginalen till tvåan', () => {
    expect(winnerSummary(finished({ Michi: 247, Oscar: 201, Mia: 6 }))).toBe('Michi vann med 247 poäng. 46 poäng före Oscar!')
  })

  it('nämner alla som delar andraplatsen', () => {
    expect(winnerSummary(finished({ Michi: 247, Oscar: 201, Mia: 201 }))).toBe('Michi vann med 247 poäng. 46 poäng före Mia och Oscar!')
  })

  it('säger delad seger när flera delar förstaplatsen', () => {
    expect(winnerSummary(finished({ Anna: 120, Bo: 120, Cia: 40 }))).toBe('Delad seger! Anna och Bo fick båda 120 poäng.')
    expect(winnerSummary(finished({ Anna: 3, Bo: 3, Cia: 3 }))).toBe('Delad seger! Anna, Bo och Cia fick alla 3 poäng.')
  })

  it('utan poäng blir det ingen vinnare', () => {
    expect(winnerSummary(finished({ Anna: 0, Bo: 0 }))).toBe('Ingen fick poäng den här gången. Revansch?')
  })

  it('en provomgång visar bara den egna poängen', () => {
    expect(winnerSummary(finished({ Oscar: 247 }, { practice: true }))).toBe('Du fick 247 poäng på 5 rundor.')
    expect(winnerSummary(finished({ Oscar: 80 }, { practice: true, round: 1 }))).toBe('Du fick 80 poäng på 1 runda.')
  })
})
