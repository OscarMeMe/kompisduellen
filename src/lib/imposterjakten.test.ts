import { describe, expect, it } from 'vitest'
import { GAMES } from '@/lib/games'
import {
  CATEGORIES,
  canChangeWord,
  cardFor,
  checkClue,
  clueRound,
  currentTurn,
  dealRound,
  DEFAULT_SETTINGS,
  findWord,
  myImposterCard,
  normalizeWord,
  pickWord,
  RECENT_AFTER_RESET,
  totalTurns,
  WORDS,
  type ImposterSecrets,
  type ImposterSettings,
} from '@/lib/imposterjakten'
import {
  addPlayers,
  canStart,
  defaultRoundsFor,
  hostImposterNewWord,
  hostImposterNextRound,
  hostImposterStartAnyway,
  hostMove,
  hostPresence,
  hostStart,
  initialState,
  roundOptionsFor,
  setImposterSettings,
  type HostState,
} from '@/lib/match'

const ABC = ['a', 'b', 'c']
const NOW = 1_000_000
const paraply = findWord('paraply')!

// En slumpgenerator som går igenom en lista med värden, för förutsägbara utdelningar.
function sequence(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

function lobby(ids = ABC, settings: Partial<ImposterSettings> = {}): HostState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id.toUpperCase(), avatar: '👻' }]))
  const state = setImposterSettings(addPlayers(initialState('imposterjakten'), players), settings)
  return { state, secrets: null }
}

function start(ids = ABC, settings: Partial<ImposterSettings> = {}, random = () => 0): HostState {
  return hostStart(lobby(ids, settings), ids, NOW, random)
}

const secretsOf = (host: HostState) => host.secrets as ImposterSecrets
const table = (host: HostState) => host.state.imposter!

// Alla läser sitt kort.
function readAll(host: HostState, ids = ABC): HostState {
  return ids.reduce((next, id) => hostMove(next, id, { type: 'read' }, ids, NOW), host)
}

// Spelar alla turer med ett eget ord per tur.
function playClues(host: HostState, ids = ABC): HostState {
  let next = host
  for (let i = 0; i < ids.length * 2; i++) {
    const turn = currentTurn(table(next))!
    next = hostMove(next, turn, { type: 'clue', word: `ord${i}` }, ids, NOW)
  }
  return next
}

describe('Imposterjakten: spelet och inställningarna', () => {
  it('finns i spellistan för 3–10 spelare och kräver minst tre', () => {
    const game = GAMES.find((g) => g.id === 'imposterjakten')
    expect(game).toMatchObject({ name: 'Imposterjakten', tagline: 'Vem är det som bluffar?', minPlayers: 3, maxPlayers: 10 })
    expect(canStart('imposterjakten', 2)).toBe(false)
    expect(canStart('imposterjakten', 1)).toBe(false)
    expect(canStart('imposterjakten', 3)).toBe(true)
  })

  it('har 3, 5 eller 7 omgångar med 3 som förval', () => {
    expect(roundOptionsFor('imposterjakten')).toEqual([3, 5, 7])
    expect(defaultRoundsFor('imposterjakten')).toBe(3)
  })

  it('låter värden välja svårighet, kategori och om orden skrivs eller sägs, bara i väntrummet', () => {
    const state = lobby().state
    expect(state.imposterSettings).toEqual(DEFAULT_SETTINGS)
    const chosen = setImposterSettings(state, { hard: true, category: CATEGORIES[1], aloud: true })
    expect(chosen.imposterSettings).toEqual({ hard: true, category: CATEGORIES[1], aloud: true })
    expect(setImposterSettings(chosen, { category: null }).imposterSettings.category).toBeNull()
    expect(setImposterSettings(state, { category: 'Finns inte' })).toBe(state)
    const playing = start().state
    expect(setImposterSettings(playing, { hard: true })).toBe(playing)
  })
})

describe('Imposterjakten: ord och roller', () => {
  it('ger exakt en imposter och samma ord till alla oskyldiga', () => {
    const players = ['a', 'b', 'c', 'd', 'e']
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const { table, secrets } = dealRound(players, DEFAULT_SETTINGS, [], () => r)
      const cards = players.map((id) => cardFor(secrets, table, id)!)
      expect(cards.filter((card) => card.role === 'imposter')).toHaveLength(1)
      const words = cards.flatMap((card) => (card.role === 'oskyldig' ? [card.word] : []))
      expect(words).toHaveLength(4)
      expect(new Set(words).size).toBe(1)
      expect(table.order.slice().sort()).toEqual(players)
    }
  })

  it('ger impostern en ledtråd i Normal men inte i Svår', () => {
    const normal = dealRound(ABC, DEFAULT_SETTINGS, [], () => 0)
    const imposterId = normal.secrets.imposter
    const word = findWord(normal.secrets.wordId)!
    expect(cardFor(normal.secrets, normal.table, imposterId)).toEqual({ role: 'imposter', hint: word.ledtrad, category: null })
    const hard = dealRound(ABC, { ...DEFAULT_SETTINGS, hard: true }, [], () => 0)
    expect(cardFor(hard.secrets, hard.table, hard.secrets.imposter)).toEqual({ role: 'imposter', hint: null, category: null })
  })

  it('visar kategorin för alla, även impostern, bara när värden valt en', () => {
    const category = 'Mat och fika'
    for (const hard of [false, true]) {
      const { table, secrets } = dealRound(ABC, { hard, category, aloud: false }, [], () => 0.5)
      expect(findWord(secrets.wordId)!.kategori).toBe(category)
      for (const id of ABC) expect(cardFor(secrets, table, id)!.category).toBe(category)
    }
    const mixed = dealRound(ABC, DEFAULT_SETTINGS, [], () => 0.5)
    for (const id of ABC) expect(cardFor(mixed.secrets, mixed.table, id)!.category).toBeNull()
  })

  it('ger inget kort till den som inte är med i omgången', () => {
    const { table, secrets } = dealRound(ABC, DEFAULT_SETTINGS, [], () => 0)
    expect(cardFor(secrets, table, 'z')).toBeNull()
    expect(myImposterCard(secrets, table, 'z')).toEqual({ card: null, rejectedAt: null })
  })

  it('väljer ord som inte visats, och börjar om med de senaste spärrade när alla använts', () => {
    const allButOne = WORDS.slice(1).map((word) => word.id)
    expect(pickWord(allButOne, null, () => 0.5).wordId).toBe(WORDS[0].id)
    const all = WORDS.map((word) => word.id)
    const restarted = pickWord(all, null, () => 0)
    expect(restarted.usedWordIds).toEqual(all.slice(-RECENT_AFTER_RESET))
    // Ordlistan är kortare än spärren: allt utom det senaste ordet går bra.
    expect(restarted.wordId).not.toBe(all.at(-1))
  })

  it('väljer bara ord i kategorin när värden valt en', () => {
    for (const r of [0, 0.5, 0.99]) expect(findWord(pickWord([], 'Platser', () => r).wordId)!.kategori).toBe('Platser')
  })
})

describe('Imposterjakten: ledtrådarna', () => {
  it('jämför ord utan stora och små bokstäver och onödiga mellanslag, men skiljer å, ä och ö', () => {
    expect(normalizeWord('  PaRaPly ')).toBe('paraply')
    expect(normalizeWord('Älg')).toBe('älg')
    expect(normalizeWord('älg')).not.toBe(normalizeWord('alg'))
  })

  it('godkänner ett ord, även sammansatta ord och bindestreck', () => {
    expect(checkClue(' regn ', paraply, [])).toEqual({ ok: true, word: 'regn' })
    expect(checkClue('regnväder', paraply, [])).toEqual({ ok: true, word: 'regnväder' })
    expect(checkClue('sms-väder', paraply, [])).toMatchObject({ ok: true })
  })

  it('avvisar flera ord, tomma ord och tecken som inte är bokstäver', () => {
    for (const text of ['', '   ', 'två ord', 'regn!', 'a'.repeat(31)]) expect(checkClue(text, paraply, [])).toEqual({ ok: false })
  })

  it('avvisar det hemliga ordet, dess godkända former och ord som innehåller det', () => {
    for (const text of ['paraply', 'PARAPLY', 'Paraplyet', 'paraplyer', 'paraplyställ']) {
      expect(checkClue(text, paraply, [])).toEqual({ ok: false })
    }
  })

  it('avvisar ett ord som redan sagts i omgången', () => {
    const earlier = [{ player: 'a', kind: 'ord' as const, word: 'Regn' }, { player: 'b', kind: 'pass' as const, word: null }]
    expect(checkClue('regn', paraply, earlier)).toEqual({ ok: false })
    expect(checkClue('blöt', paraply, earlier)).toMatchObject({ ok: true })
  })
})

describe('Imposterjakten: en omgång', () => {
  it('startar med kortet, och går vidare när alla läst', () => {
    let host = start()
    expect(host.state.phase).toBe('playing')
    expect(table(host).step).toBe('kort')
    host = hostMove(host, 'a', { type: 'read' }, ABC, NOW)
    host = hostMove(host, 'a', { type: 'read' }, ABC, NOW)
    expect(table(host).read).toEqual(['a'])
    host = readAll(host)
    expect(table(host).step).toBe('ledtradar')
  })

  it('låter värden starta ändå, och går vidare när den som inte läst lämnar', () => {
    expect(table(hostImposterStartAnyway(start())).step).toBe('ledtradar')
    let host = hostMove(hostMove(start(), 'a', { type: 'read' }, ABC, NOW), 'b', { type: 'read' }, ABC, NOW)
    host = hostPresence(host, ['a', 'b'], NOW)
    expect(table(host).step).toBe('ledtradar')
  })

  it('går i turordning två varv från en slumpad startspelare', () => {
    // Slumptalen: ord, imposter, startspelare (0,4 av tre spelare = den andra).
    let host = readAll(start(ABC, {}, sequence(0, 0, 0.4)))
    expect(table(host).order).toEqual(['b', 'c', 'a'])
    expect(totalTurns(table(host))).toBe(6)
    const turns: string[] = []
    for (let i = 0; i < 6; i++) {
      const turn = currentTurn(table(host))!
      turns.push(turn)
      expect(clueRound(table(host))).toBe(i < 3 ? 1 : 2)
      host = hostMove(host, turn, i === 2 ? { type: 'pass' } : { type: 'clue', word: `ord${i}` }, ABC, NOW)
    }
    expect(turns).toEqual(['b', 'c', 'a', 'b', 'c', 'a'])
    expect(table(host).step).toBe('diskussion')
    expect(table(host).clues.map((clue) => clue.word)).toEqual(['ord0', 'ord1', null, 'ord3', 'ord4', 'ord5'])
    expect(table(host).clues[2].kind).toBe('pass')
  })

  it('ignorerar drag från den som inte har tur', () => {
    const host = readAll(start())
    const waiting = ABC.find((id) => id !== currentTurn(table(host)))!
    expect(hostMove(host, waiting, { type: 'clue', word: 'regn' }, ABC, NOW)).toBe(host)
  })

  it('avvisar ett ogiltigt ord bara för den spelaren, och turen står kvar', () => {
    const host = readAll(start())
    const turn = currentTurn(table(host))!
    const secret = findWord(secretsOf(host).wordId)!.ord
    const rejected = hostMove(host, turn, { type: 'clue', word: secret }, ABC, NOW + 5)
    expect(table(rejected).clues).toHaveLength(0)
    expect(currentTurn(table(rejected))).toBe(turn)
    expect(myImposterCard(secretsOf(rejected), table(rejected), turn).rejectedAt).toBe(NOW + 5)
    const other = ABC.find((id) => id !== turn)!
    expect(myImposterCard(secretsOf(rejected), table(rejected), other).rejectedAt).toBeNull()
  })

  it('låter den som har tur säga sitt ord högt och trycka Klar, och inte skriva', () => {
    const host = readAll(start(ABC, { aloud: true }))
    const turn = currentTurn(table(host))!
    expect(hostMove(host, turn, { type: 'clue', word: 'regn' }, ABC, NOW)).toBe(host)
    const said = hostMove(host, turn, { type: 'said' }, ABC, NOW)
    expect(table(said).clues).toEqual([{ player: turn, kind: 'sagt', word: null }])
    expect(hostMove(readAll(start()), currentTurn(table(readAll(start())))!, { type: 'said' }, ABC, NOW).state.imposter!.clues).toHaveLength(0)
  })

  it('låter värden byta ord bara innan första associationen', () => {
    const host = readAll(start(ABC, {}, sequence(0, 0, 0)))
    expect(canChangeWord(table(host))).toBe(true)
    const renewed = hostImposterNewWord(host, ABC, sequence(0.5, 0.5, 0.5))
    expect(secretsOf(renewed).wordId).not.toBe(secretsOf(host).wordId)
    expect(table(renewed).step).toBe('kort')
    expect(table(renewed).read).toEqual([])
    expect(renewed.state.usedWordIds).toContain(secretsOf(host).wordId)
    const afterClue = hostMove(host, currentTurn(table(host))!, { type: 'pass' }, ABC, NOW)
    expect(canChangeWord(table(afterClue))).toBe(false)
    expect(hostImposterNewWord(afterClue, ABC)).toBe(afterClue)
  })

  it('håller det hemliga ordet utanför tillståndet tills omgången är slut', () => {
    const host = start()
    const word = findWord(secretsOf(host).wordId)!
    expect(host.state.usedWordIds).not.toContain(word.id)
    expect(JSON.stringify(host.state)).not.toContain(word.ord)
    const done = hostImposterNextRound(playClues(readAll(host)), ABC)
    expect(done.state.usedWordIds).toContain(word.id)
  })

  it('börjar nästa omgång från början, utan något från den förra', () => {
    const first = playClues(readAll(start()))
    const next = hostImposterNextRound(first, ABC, sequence(0.7, 0.7, 0.7))
    expect(next.state.round).toBe(2)
    expect(table(next)).toMatchObject({ step: 'kort', turn: 0, clues: [], read: [] })
    expect(secretsOf(next).rejected).toEqual({})
    expect(secretsOf(next).wordId).not.toBe(secretsOf(first).wordId)
  })

  it('går bara vidare efter diskussionen, och slutar efter sista omgången', () => {
    let host = start()
    expect(hostImposterNextRound(host, ABC)).toBe(host)
    for (let round = 1; round <= 3; round++) host = hostImposterNextRound(playClues(readAll(host)), ABC)
    expect(host.state.phase).toBe('finished')
    expect(host.secrets).toBeNull()
    expect(host.state.matchesPlayed).toBe(1)
  })

  it('låter den som anslöt mitt i en omgång vänta till nästa', () => {
    let host = start()
    host = { ...host, state: addPlayers(host.state, { d: { name: 'D', avatar: '👻' } }) }
    expect(myImposterCard(secretsOf(host), table(host), 'd').card).toBeNull()
    host = hostImposterNextRound(playClues(readAll(host)), ['a', 'b', 'c', 'd'])
    expect(table(host).order).toContain('d')
    expect(cardFor(secretsOf(host), table(host), 'd')).not.toBeNull()
  })
})
