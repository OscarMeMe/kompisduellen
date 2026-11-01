import { describe, expect, it } from 'vitest'
import { GAMES, roundWords } from '@/lib/games'
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
  COUNTDOWN_SECONDS,
  MIN_DISCUSSION_SECONDS,
  INNOCENTS_WIN,
  IMPOSTER_ESCAPES,
  IMPOSTER_GUESSES_RIGHT,
  isCorrectGuess,
  moreThanHalf,
  myImposterCard,
  normalizeWord,
  pickWord,
  RECENT_AFTER_RESET,
  roundPoints,
  tallyVotes,
  totalTurns,
  WORDS,
  type ImposterSecrets,
  type ImposterSettings,
} from '@/lib/imposterjakten'
import {
  addPlayers,
  canStart,
  defaultRoundsFor,
  hostImposterAbortRound,
  hostImposterNewWord,
  hostImposterSkipTurn,
  hostImposterNextRound,
  hostImposterStartAnyway,
  hostDeadline,
  hostMove,
  hostPresence,
  hostStart,
  initialState,
  roundOptionsFor,
  setImposterSettings,
  type HostState,
} from '@/lib/match'

const ABC = ['a', 'b', 'c']
const ABCD = ['a', 'b', 'c', 'd']
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

// Alla blir redo att rösta, när diskussionen har pågått länge nog.
function readyAll(host: HostState, ids = ABC): HostState {
  return ids.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, ids, NOW + MIN_DISCUSSION_SECONDS * 1000), host)
}

// Alla röstar på target, och target röstar på någon annan. target får då ensamt flest röster.
function voteOut(host: HostState, target: string, ids = ABC): HostState {
  const other = ids.find((id) => id !== target)!
  return ids.reduce((next, id) => hostMove(next, id, { type: 'vote', target: id === target ? other : target }, ids, NOW), host)
}

// Fram till omröstningen: alla läser, ger sina ord och blir redo.
function toVoting(host: HostState, ids = ABC): HostState {
  return readyAll(playClues(readAll(host, ids), ids), ids)
}

// En hel omgång fram till facit: en oskyldig röstas ut och impostern kommer undan.
function playRound(host: HostState, ids = ABC): HostState {
  const voting = toVoting(host, ids)
  return voteOut(voting, ids.find((id) => id !== secretsOf(voting).imposter)!, ids)
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
    expect(game).toMatchObject({ name: 'Imposterjakten', tagline: 'Alla utom en får ett hemligt ord. Ge ledtrådar och avslöja den som bluffar.', minPlayers: 3, maxPlayers: 10 })
    expect(canStart('imposterjakten', 2)).toBe(false)
    expect(canStart('imposterjakten', 1)).toBe(false)
    expect(canStart('imposterjakten', 3)).toBe(true)
  })

  it('kallar rundorna omgångar, och de andra spelen säger rundor', () => {
    expect(roundWords('imposterjakten')).toEqual({ one: 'omgång', many: 'omgångar' })
    expect(roundWords('gissa-priset')).toEqual({ one: 'runda', many: 'rundor' })
  })

  it('har 1, 2 eller 3 omgångar med 3 som förval', () => {
    expect(roundOptionsFor('imposterjakten')).toEqual([1, 2, 3])
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
    expect(myImposterCard(secrets, table, 'z')).toEqual({ card: null, rejectedAt: null, ready: false, vote: null })
  })

  it('väljer ord som inte visats, och börjar om med de senaste spärrade när alla använts', () => {
    const allButOne = WORDS.slice(1).map((word) => word.id)
    expect(pickWord(allButOne, null, () => 0.5).wordId).toBe(WORDS[0].id)
    const all = WORDS.map((word) => word.id)
    const restarted = pickWord(all, null, () => 0)
    expect(restarted.usedWordIds).toEqual(all.slice(-RECENT_AFTER_RESET))
    expect(restarted.usedWordIds).not.toContain(restarted.wordId)
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

  it('spärrar delar på minst 4 bokstäver i ord med mellanslag', () => {
    const skansen = findWord('allsang-pa-skansen')!
    expect(checkClue('Skansen', skansen, [])).toEqual({ ok: false })
    expect(checkClue('allsång', skansen, [])).toEqual({ ok: false })
    // "på" är för kort för att spärras.
    expect(checkClue('påsk', skansen, [])).toMatchObject({ ok: true })
    expect(checkClue('Lindgren', findWord('astrid-lindgren')!, [])).toEqual({ ok: false })
    expect(checkClue('spåret', findWord('pa-sparet')!, [])).toEqual({ ok: false })
    expect(checkClue('pingpong', findWord('beer-pong')!, [])).toMatchObject({ ok: true })
    expect(checkClue('pong', findWord('beer-pong')!, [])).toEqual({ ok: false })
  })

  it('spärrar korta former bara när ledtråden är samma ord eller börjar med formen', () => {
    const torg = findWord('torg')!
    expect(checkClue('torg', torg, [])).toEqual({ ok: false })
    expect(checkClue('Torgstånd', torg, [])).toEqual({ ok: false })
    expect(checkClue('storgata', torg, [])).toMatchObject({ ok: true })
    const afterwork = findWord('afterwork')!
    expect(checkClue('aw', afterwork, [])).toEqual({ ok: false })
    expect(checkClue('crawl', afterwork, [])).toMatchObject({ ok: true })
    // Former på minst 5 bokstäver spärras var de än står.
    expect(checkClue('fredagsafterwork', afterwork, [])).toEqual({ ok: false })
  })

  it('spärrar förkortningar och smeknamn bara som exakt samma ord när själva ordet är långt', () => {
    const playstation = findWord('playstation')!
    expect(checkClue('ps', playstation, [])).toEqual({ ok: false })
    expect(checkClue('psykolog', playstation, [])).toMatchObject({ ok: true })
    const qr = findWord('qr-kod')!
    expect(checkClue('QR', qr, [])).toEqual({ ok: false })
    expect(checkClue('qrkoden', qr, [])).toEqual({ ok: false })
    const bea = findWord('bearnaisesas')!
    expect(checkClue('bea', bea, [])).toEqual({ ok: false })
    expect(checkClue('beachvolley', bea, [])).toMatchObject({ ok: true })
  })

  it('spärrar delar av personnamn bara som hela ord', () => {
    const kalla = findWord('charlotte-kalla')!
    expect(checkClue('Kalla', kalla, [])).toEqual({ ok: false })
    expect(checkClue('kallare', kalla, [])).toMatchObject({ ok: true })
    const mede = findWord('petra-mede')!
    expect(checkClue('Mede', mede, [])).toEqual({ ok: false })
    expect(checkClue('medeltid', mede, [])).toMatchObject({ ok: true })
    const hakan = findWord('hakan-hellstrom')!
    expect(checkClue('Håkan', hakan, [])).toEqual({ ok: false })
    expect(checkClue('Hellström', hakan, [])).toEqual({ ok: false })
    expect(checkClue('håkansson', hakan, [])).toMatchObject({ ok: true })
    const kungen = findWord('carl-xvi-gustaf')!
    expect(checkClue('Carl', kungen, [])).toEqual({ ok: false })
    expect(checkClue('carlsberg', kungen, [])).toMatchObject({ ok: true })
    expect(checkClue('kungen', kungen, [])).toEqual({ ok: false })
    // Titlar räknas inte som personnamn: Skansen spärras fortfarande i längre ord.
    expect(checkClue('skansenbesök', findWord('allsang-pa-skansen')!, [])).toEqual({ ok: false })
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
    const ABCD = ['a', 'b', 'c', 'd']
    let host = ['a', 'b', 'c'].reduce((next, id) => hostMove(next, id, { type: 'read' }, ABCD, NOW), start(ABCD))
    expect(table(host).step).toBe('kort')
    host = hostPresence(host, ['a', 'b', 'c'], NOW)
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

  it('visar ett inskrivet ord i bubblan när man säger orden högt, men aldrig det hemliga ordet', () => {
    const host = readAll(start(ABC, { aloud: true }))
    const turn = currentTurn(table(host))!
    const typed = hostMove(host, turn, { type: 'said', word: ' paraply ' }, ABC, NOW)
    expect(table(typed).clues[0]).toMatchObject({ player: turn, kind: 'sagt' })
    const secret = findWord(secretsOf(host).wordId)!.ord
    const blocked = hostMove(host, turn, { type: 'said', word: secret }, ABC, NOW)
    expect(table(blocked).clues).toEqual([{ player: turn, kind: 'sagt', word: null }])
    expect(currentTurn(table(blocked))).not.toBe(turn)
  })

  it('låter värden gå vidare när den som har tur glömt Klar, bara när ni säger orden högt', () => {
    const aloud = readAll(start(ABC, { aloud: true }))
    const turn = currentTurn(table(aloud))!
    const skipped = hostImposterSkipTurn(aloud, ABC, NOW)
    expect(table(skipped).clues).toEqual([{ player: turn, kind: 'sagt', word: null }])
    expect(currentTurn(table(skipped))).not.toBe(turn)
    const written = readAll(start())
    expect(hostImposterSkipTurn(written, ABC, NOW)).toBe(written)
  })

  it('går alltid till diskussionen efter varven, med fyra spelare och i båda lägena', () => {
    for (const aloud of [true, false]) {
      let discussion = readAll(start(ABCD, { aloud }), ABCD)
      for (let i = 0; i < 40 && table(discussion).step === 'ledtradar'; i++) {
        const turn = currentTurn(table(discussion))!
        discussion = hostMove(discussion, turn, aloud ? { type: 'said' } : { type: 'pass' }, ABCD, NOW)
      }
      expect(table(discussion).step, String(aloud)).toBe('diskussion')
      expect(table(discussion).readyCount).toBe(0)
      expect(table(discussion).countdownStarted).toBe(false)
      expect(discussion.state.deadline).toBeNull()
      // Närvaron kan uppdateras hur ofta som helst utan att omröstningen öppnas.
      const same = hostPresence(discussion, ABCD, NOW + 60_000)
      expect(table(same).step).toBe('diskussion')
    }
  })

  it('visar "2 av 4 är redo", och startar nedräkningen först när mer än hälften är redo', () => {
    const discussion = playClues(readAll(start(ABCD), ABCD), ABCD)
    const two = ['a', 'b'].reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, ABCD, NOW + 1000), discussion)
    expect(table(two).readyCount).toBe(2)
    expect(table(two).countdownStarted).toBe(false)
    const three = hostMove(two, 'c', { type: 'ready', on: true }, ABCD, NOW + 2000)
    expect(table(three).countdownStarted).toBe(true)
    expect(three.state.deadline).toBe(NOW + 2000 + COUNTDOWN_SECONDS * 1000)
    expect(table(three).step).toBe('diskussion')
  })

  it('hoppar inte över diskussionen även om alla blir redo direkt', () => {
    const discussion = playClues(readAll(start(ABCD), ABCD), ABCD)
    const quick = ABCD.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, ABCD, NOW + 500), discussion)
    expect(table(quick).step).toBe('diskussion')
    expect(table(quick).countdownStarted).toBe(true)
    expect(quick.state.deadline).toBe(NOW + MIN_DISCUSSION_SECONDS * 1000)
    const opened = hostDeadline(quick, NOW + MIN_DISCUSSION_SECONDS * 1000, quick.state.deadline!, ABCD)
    expect(table(opened).step).toBe('rostning')
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
    const done = hostImposterNextRound(playRound(host), ABC)
    expect(done.state.usedWordIds).toContain(word.id)
  })

  it('börjar nästa omgång från början, utan något från den förra', () => {
    const first = playRound(start())
    const next = hostImposterNextRound(first, ABC, sequence(0.7, 0.7, 0.7))
    expect(next.state.round).toBe(2)
    expect(table(next)).toMatchObject({
      step: 'kort',
      turn: 0,
      clues: [],
      read: [],
      readyCount: 0,
      votedCount: 0,
      countdownStarted: false,
      votes: null,
      tied: null,
      caught: null,
      outcome: null,
    })
    expect(secretsOf(next)).toMatchObject({ rejected: {}, ready: [], votes: {} })
    expect(next.state.deadline).toBeNull()
    expect(secretsOf(next).wordId).not.toBe(secretsOf(first).wordId)
  })

  it('går bara vidare efter facit, och slutar efter sista omgången', () => {
    let host = start()
    expect(hostImposterNextRound(host, ABC)).toBe(host)
    expect(hostImposterNextRound(playClues(readAll(host)), ABC).state.round).toBe(1)
    for (let round = 1; round <= 3; round++) host = hostImposterNextRound(playRound(host), ABC)
    expect(host.state.phase).toBe('finished')
    expect(host.secrets).toBeNull()
    expect(host.state.matchesPlayed).toBe(1)
  })

  it('låter den som anslöt mitt i en omgång vänta till nästa', () => {
    let host = start()
    host = { ...host, state: addPlayers(host.state, { d: { name: 'D', avatar: '👻' } }) }
    expect(myImposterCard(secretsOf(host), table(host), 'd').card).toBeNull()
    // d kan varken bli redo eller rösta i omgången den anslöt mitt i.
    const discussing = playClues(readAll(host))
    expect(hostMove(discussing, 'd', { type: 'ready', on: true }, ['a', 'b', 'c', 'd'], NOW)).toBe(discussing)
    host = hostImposterNextRound(playRound(host), ['a', 'b', 'c', 'd'])
    expect(table(host).order).toContain('d')
    expect(cardFor(secretsOf(host), table(host), 'd')).not.toBeNull()
  })
})

describe('Imposterjakten: diskussionen och omröstningen', () => {
  const ABCD = ['a', 'b', 'c', 'd']
  const discussion = (ids = ABCD) => playClues(readAll(start(ids), ids), ids)
  const ready = (host: HostState, id: string, on = true, ids = ABCD) => hostMove(host, id, { type: 'ready', on }, ids, NOW)
  const vote = (host: HostState, id: string, target: string, ids = ABCD) =>
    hostMove(host, id, { type: 'vote', target }, ids, NOW)

  it('startar nedräkningen först när mer än hälften är redo', () => {
    expect(moreThanHalf(1, 4)).toBe(false)
    expect(moreThanHalf(2, 4)).toBe(false)
    expect(moreThanHalf(3, 4)).toBe(true)
    expect(moreThanHalf(2, 3)).toBe(true)
    let host = ready(discussion(), 'a')
    expect(table(host)).toMatchObject({ readyCount: 1, countdownStarted: false })
    host = ready(host, 'b')
    expect(table(host)).toMatchObject({ readyCount: 2, countdownStarted: false })
    expect(host.state.deadline).toBeNull()
    host = ready(host, 'c')
    expect(table(host)).toMatchObject({ readyCount: 3, countdownStarted: true, step: 'diskussion' })
    expect(host.state.deadline).toBe(NOW + 30_000)
  })

  it('låter en spelare ta tillbaka sin markering före nedräkningen men inte under den', () => {
    let host = ready(discussion(), 'a')
    host = ready(host, 'a', false)
    expect(table(host).readyCount).toBe(0)
    host = ready(ready(ready(host, 'a'), 'b'), 'c')
    expect(table(host).countdownStarted).toBe(true)
    expect(ready(host, 'a', false)).toBe(host)
  })

  it('startar nedräkningen bara en gång, även om fler blir redo', () => {
    const host = ready(ready(ready(discussion(), 'a'), 'b'), 'c')
    const deadline = host.state.deadline
    const later = hostMove(host, 'c', { type: 'ready', on: true }, ABCD, NOW + 5000)
    expect(later).toBe(host)
    expect(later.state.deadline).toBe(deadline)
  })

  it('öppnar omröstningen direkt när alla är redo', () => {
    const host = readyAll(discussion(), ABCD)
    expect(table(host).step).toBe('rostning')
    expect(host.state.deadline).toBeNull()
  })

  it('öppnar omröstningen när nedräkningen är slut', () => {
    const host = ready(ready(ready(discussion(), 'a'), 'b'), 'c')
    const deadline = host.state.deadline!
    expect(hostDeadline(host, deadline - 1, deadline, ABCD)).toBe(host)
    expect(hostDeadline(host, deadline, deadline + 1, ABCD)).toBe(host)
    const voting = hostDeadline(host, deadline, deadline, ABCD)
    expect(table(voting).step).toBe('rostning')
    expect(voting.state.deadline).toBeNull()
  })

  it('räknar om tröskeln när någon lämnar', () => {
    const host = ready(ready(discussion(), 'a'), 'b')
    const smaller = hostPresence(host, ['a', 'b', 'c'], NOW)
    expect(table(smaller)).toMatchObject({ readyCount: 2, countdownStarted: true })
  })

  it('tar emot en röst var på en annan spelare, och visar rösterna först när alla röstat', () => {
    let host = readyAll(discussion(), ABCD)
    expect(vote(host, 'a', 'a')).toBe(host)
    expect(vote(host, 'a', 'z')).toBe(host)
    host = vote(host, 'a', 'b')
    expect(vote(host, 'a', 'c')).toBe(host)
    expect(table(host)).toMatchObject({ votedCount: 1, votes: null })
    expect(JSON.stringify(host.state.imposter)).not.toContain('"a":"b"')
    expect(myImposterCard(secretsOf(host), table(host), 'a').vote).toBe('b')
    host = vote(vote(vote(host, 'b', 'c'), 'c', 'b'), 'd', 'b')
    // a är impostern, så b är oskyldig och impostern kommer undan.
    expect(table(host)).toMatchObject({ step: 'facit', votedCount: 4, votes: { a: 'b', b: 'c', c: 'b', d: 'b' } })
    expect(table(host).outcome?.kind).toBe('undan')
  })

  it('räknar rösterna: ensamt flest röster, och lika', () => {
    expect(tallyVotes({ a: 'b', b: 'c', c: 'b', d: 'b' })).toEqual({ counts: { b: 3, c: 1 }, top: ['b'] })
    expect(tallyVotes({ a: 'b', b: 'a', c: 'b', d: 'a', e: 'c' }).top).toEqual(['b', 'a'])
    expect(tallyVotes({}).top).toEqual([])
  })

  it('visar rösterna när den som inte röstat lämnar', () => {
    const host = vote(vote(vote(readyAll(discussion(), ABCD), 'a', 'b'), 'b', 'c'), 'c', 'b')
    expect(table(hostPresence(host, ['a', 'b', 'c'], NOW)).step).toBe('facit')
  })

  it('tar inte emot redo-markeringar eller röster i fel steg', () => {
    const host = start(ABCD)
    expect(ready(host, 'a')).toBe(host)
    expect(vote(host, 'a', 'b')).toBe(host)
  })
})

describe('Imposterjakten: lika röster, sista gissningen och poängen', () => {
  const ABCD = ['a', 'b', 'c', 'd']
  // Med slumpen () => 0 är a impostern.
  const voting = (ids = ABCD) => toVoting(start(ids), ids)
  const vote = (host: HostState, id: string, target: string, ids = ABCD) =>
    hostMove(host, id, { type: 'vote', target }, ids, NOW)
  // a och b får två röster var.
  const tie = (host: HostState) => vote(vote(vote(vote(host, 'a', 'b'), 'b', 'a'), 'c', 'a'), 'd', 'b')

  it('ger en ny diskussion och en extra omröstning bara mellan de lika placerade', () => {
    const host = tie(voting())
    expect(secretsOf(host).imposter).toBe('a')
    expect(table(host)).toMatchObject({ step: 'diskussion', tied: ['b', 'a'], readyCount: 0, votedCount: 0, votes: null })
    expect(table(host).countdownStarted).toBe(false)
    expect(secretsOf(host)).toMatchObject({ ready: [], votes: {} })
    const again = readyAll(host, ABCD)
    expect(table(again).step).toBe('rostning')
    // Bara de lika placerade går att rösta på.
    expect(vote(again, 'c', 'd')).toBe(again)
    expect(myImposterCard(secretsOf(again), table(again), 'c').vote).toBeNull()
    const caught = vote(vote(vote(vote(again, 'a', 'b'), 'b', 'a'), 'c', 'a'), 'd', 'a')
    expect(table(caught)).toMatchObject({ step: 'gissning', caught: 'a' })
  })

  it('låter impostern komma undan när det blir lika igen', () => {
    const host = tie(readyAll(tie(voting()), ABCD))
    expect(table(host).step).toBe('facit')
    expect(table(host).outcome).toMatchObject({ kind: 'undan', imposter: 'a', points: { a: IMPOSTER_ESCAPES } })
    expect(host.state.scores.a).toBe(2)
  })

  it('låter impostern gissa när den får ensamt flest röster, och bara impostern', () => {
    const host = voteOut(voting(), 'a', ABCD)
    expect(table(host)).toMatchObject({ step: 'gissning', caught: 'a' })
    // Ordet syns inte medan impostern gissar.
    expect(JSON.stringify(host.state)).not.toContain(findWord(secretsOf(host).wordId)!.ord)
    expect(hostMove(host, 'b', { type: 'guess', word: 'x' }, ABCD, NOW)).toBe(host)
    expect(hostMove(host, 'b', { type: 'giveUp' }, ABCD, NOW)).toBe(host)
    expect(hostMove(host, 'a', { type: 'guess', word: '   ' }, ABCD, NOW)).toBe(host)
  })

  it('bedömer gissningen utan stora och små bokstäver och mellanslag, men skiljer å, ä och ö', () => {
    expect(isCorrectGuess('Paraply', paraply)).toBe(true)
    expect(isCorrectGuess('  PARAPLY ', paraply)).toBe(true)
    for (const form of paraply.godkanda) expect(isCorrectGuess(form, paraply)).toBe(true)
    expect(isCorrectGuess('paraplyställ', paraply)).toBe(false)
    expect(isCorrectGuess('', paraply)).toBe(false)
    const word = WORDS.find((w) => /[åäö]/.test(w.ord))!
    expect(isCorrectGuess(word.ord.replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o'), word)).toBe(false)
  })

  it('ger poäng för varje utfall', () => {
    expect(roundPoints('undan', 'a', ABCD)).toEqual({ a: IMPOSTER_ESCAPES })
    expect(roundPoints('gissade-ratt', 'a', ABCD)).toEqual({ a: IMPOSTER_GUESSES_RIGHT, b: INNOCENTS_WIN, c: INNOCENTS_WIN, d: INNOCENTS_WIN })
    expect(roundPoints('gissade-fel', 'a', ABCD)).toEqual({ b: INNOCENTS_WIN, c: INNOCENTS_WIN, d: INNOCENTS_WIN })
    expect(roundPoints('gav-upp', 'a', ABCD)).toEqual({ b: 2, c: 2, d: 2 })
    expect(roundPoints('avbruten', 'a', ABCD)).toEqual({})
  })

  it('visar facit med ordet, gissningen och poängen', () => {
    const caught = voteOut(voting(), 'a', ABCD)
    const word = findWord(secretsOf(caught).wordId)!
    const right = hostMove(caught, 'a', { type: 'guess', word: ` ${word.ord.toUpperCase()} ` }, ABCD, NOW)
    expect(table(right).outcome).toMatchObject({ kind: 'gissade-ratt', word: word.ord, imposter: 'a', hint: word.ledtrad })
    expect(right.state.scores).toMatchObject({ a: 1, b: 2, c: 2, d: 2 })
    expect(right.state.usedWordIds).toContain(word.id)
    const wrong = hostMove(caught, 'a', { type: 'guess', word: 'Ingenting' }, ABCD, NOW)
    expect(table(wrong).outcome).toMatchObject({ kind: 'gissade-fel', guess: 'Ingenting' })
    expect(wrong.state.scores).toMatchObject({ a: 0, b: 2, c: 2, d: 2 })
    const gaveUp = hostMove(caught, 'a', { type: 'giveUp' }, ABCD, NOW)
    expect(table(gaveUp).outcome).toMatchObject({ kind: 'gav-upp', guess: null })
    // I Svår visas ingen ledtråd i facit.
    const hard = voteOut(toVoting(start(ABCD, { hard: true }), ABCD), 'a', ABCD)
    expect(table(hostMove(hard, 'a', { type: 'giveUp' }, ABCD, NOW)).outcome?.hint).toBeNull()
  })

  it('räknar inte en avbruten omgång, och slutar efter rätt antal giltiga omgångar', () => {
    let host = start(ABCD)
    const aborted = hostImposterAbortRound(host)
    expect(table(aborted).outcome).toMatchObject({ kind: 'avbruten', points: {} })
    expect(aborted.state.scores).toMatchObject({ a: 0, b: 0, c: 0, d: 0 })
    expect(hostImposterAbortRound(aborted)).toBe(aborted)
    host = hostImposterNextRound(aborted, ABCD)
    expect(host.state.round).toBe(1)
    expect(table(host).step).toBe('kort')
    for (let round = 1; round <= 3; round++) {
      expect(host.state.phase).toBe('playing')
      host = hostImposterNextRound(playRound(host, ABCD), ABCD)
    }
    expect(host.state.phase).toBe('finished')
    // Avbryts sista omgången kommer en ny omgång med samma nummer.
    let last = start(ABCD)
    for (let round = 1; round <= 2; round++) last = hostImposterNextRound(playRound(last, ABCD), ABCD)
    last = hostImposterNextRound(hostImposterAbortRound(last), ABCD)
    expect(last.state).toMatchObject({ phase: 'playing', round: 3 })
  })

  it('avbryter omgången utan poäng när impostern lämnar', () => {
    const host = hostPresence(readAll(start(ABCD), ABCD), ['b', 'c', 'd'], NOW)
    expect(table(host).outcome).toMatchObject({ kind: 'avbruten', reason: 'Omgången avbröts eftersom impostern lämnade.' })
    expect(host.state.scores).toMatchObject({ b: 0, c: 0, d: 0 })
  })

  it('avbryter omgången när färre än tre är kvar, och går till väntrummet om lobbyn är för liten', () => {
    const host = hostPresence(start(), ['a', 'b'], NOW)
    expect(table(host).outcome).toMatchObject({ kind: 'avbruten', reason: 'Omgången avbröts eftersom för få spelare är kvar.' })
    const waiting = hostImposterNextRound(host, ['a', 'b'])
    expect(waiting.state).toMatchObject({ phase: 'waiting', imposter: null, matchesPlayed: 0 })
    expect(waiting.state.notice).toContain('För få spelare')
    expect(waiting.secrets).toBeNull()
  })

  it('fortsätter utan en oskyldig som lämnar mitt i turerna', () => {
    let host = readAll(start(ABCD), ABCD)
    const leaving = table(host).order.find((id) => id !== 'a' && id !== currentTurn(table(host)))!
    host = hostPresence(host, ABCD.filter((id) => id !== leaving), NOW)
    const ids = ABCD.filter((id) => id !== leaving)
    for (let i = 0; i < 20 && table(host).step === 'ledtradar'; i++) {
      const turn = currentTurn(table(host))!
      expect(turn).not.toBe(leaving)
      host = hostMove(host, turn, { type: 'pass' }, ids, NOW)
    }
    expect(table(host).step).toBe('diskussion')
    expect(table(host).clues.map((clue) => clue.player)).not.toContain(leaving)
    // Den som lämnade får inga poäng när impostern ger upp.
    host = readyAll(host, ids)
    host = voteOut(host, 'a', ids)
    host = hostMove(host, 'a', { type: 'giveUp' }, ids, NOW)
    expect(table(host).outcome?.points[leaving]).toBeUndefined()
    expect(host.state.scores[leaving]).toBe(0)
    for (const id of ids.filter((id) => id !== 'a')) expect(host.state.scores[id]).toBe(2)
  })

  it('stryker rösten från en oskyldig som lämnar, och låter den som röstat på spelaren rösta om', () => {
    let host = vote(vote(voting(), 'b', 'c'), 'c', 'b')
    host = hostPresence(host, ['a', 'b', 'd'], NOW)
    expect(table(host)).toMatchObject({ step: 'rostning', votedCount: 0 })
    expect(myImposterCard(secretsOf(host), table(host), 'b').vote).toBeNull()
    // Den som lämnat går inte att rösta på.
    expect(vote(host, 'b', 'c', ['a', 'b', 'd'])).toBe(host)
    host = vote(vote(vote(host, 'a', 'b', ['a', 'b', 'd']), 'b', 'a', ['a', 'b', 'd']), 'd', 'a', ['a', 'b', 'd'])
    expect(table(host)).toMatchObject({ step: 'gissning', caught: 'a' })
  })

  it('tar inte med något till nästa omgång', () => {
    const tied = tie(voting())
    const done = hostImposterNextRound(tie(readyAll(tied, ABCD)), ABCD)
    expect(table(done)).toMatchObject({ tied: null, caught: null, outcome: null, votes: null })
    expect(done.state.scores.a).toBe(2)
  })
})

describe('Imposterjakten: peka ut och rösterna vid lika', () => {
  const ABCD = ['a', 'b', 'c', 'd']
  const discussion = () => playClues(readAll(start(ABCD), ABCD), ABCD)
  const point = (host: HostState, id: string, target: string | null, ids = ABCD) =>
    hostMove(host, id, { type: 'point', target }, ids, NOW)

  it('låter spelarna peka ut, byta och ta bort sin pil under diskussionen', () => {
    let host = point(discussion(), 'a', 'b')
    expect(table(host).pointers).toEqual({ a: 'b' })
    host = point(host, 'c', 'b')
    host = point(host, 'a', 'd')
    expect(table(host).pointers).toEqual({ a: 'd', c: 'b' })
    host = point(host, 'a', null)
    expect(table(host).pointers).toEqual({ c: 'b' })
    expect(point(host, 'a', null)).toBe(host)
  })

  it('går inte att peka på sig själv, på någon utanför omgången eller vid fel tillfälle', () => {
    const host = discussion()
    expect(point(host, 'a', 'a')).toBe(host)
    expect(point(host, 'a', 'z')).toBe(host)
    const reading = start(ABCD)
    expect(point(reading, 'a', 'b')).toBe(reading)
  })

  it('tar bort pilarna när omröstningen öppnas, och pilar från eller till den som lämnar', () => {
    let host = point(point(point(discussion(), 'a', 'b'), 'b', 'c'), 'c', 'a')
    host = hostPresence(host, ['a', 'b', 'd'], NOW)
    expect(table(host).pointers).toEqual({ a: 'b' })
    const voting = readyAll(host, ['a', 'b', 'd'])
    expect(table(voting)).toMatchObject({ step: 'rostning', pointers: {} })
    // Peka ut är skilt från rösterna.
    expect(secretsOf(voting).votes).toEqual({})
  })

  it('sparar rösterna från en omröstning som blev lika, tills den extra omröstningen öppnas', () => {
    const vote = (host: HostState, id: string, target: string) => hostMove(host, id, { type: 'vote', target }, ABCD, NOW)
    const voting = readyAll(discussion(), ABCD)
    const tied = vote(vote(vote(vote(voting, 'a', 'b'), 'b', 'a'), 'c', 'a'), 'd', 'b')
    expect(table(tied)).toMatchObject({ step: 'diskussion', tieVotes: { a: 'b', b: 'a', c: 'a', d: 'b' }, votes: null })
    expect(table(readyAll(tied, ABCD))).toMatchObject({ step: 'rostning', tieVotes: null })
  })
})
