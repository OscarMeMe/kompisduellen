import { describe, expect, it } from 'vitest'
import {
  ALL_READY_SECONDS,
  blockRules,
  COUNTDOWN_SECONDS,
  checkClue,
  currentTurn,
  findWord,
  DISCUSSION_SKIP_SECONDS,
  guessKey,
  hostSkipAt,
  hostSkipKind,
  isCorrectGuess,
  myImposterCard,
  normalizeWord,
  pointsReason,
  takeOverSecrets,
  WORDS,
  type ImposterSecrets,
  type ImposterSettings,
} from '@/lib/imposterjakten'
import {
  addPlayers,
  hostDeadline,
  hostImposterNextRound,
  hostImposterSkipTurn,
  hostMove,
  hostPresence,
  hostStart,
  initialState,
  restoreHostState,
  setImposterSettings,
  type HostState,
} from '@/lib/match'
import { takeOverState } from '@/lib/vardbyte'

// Tester för felen som hittades i genomgången av Imposterjakten, och för lägen som saknade test.

const ABCD = ['a', 'b', 'c', 'd']
const NOW = 1_000_000

function start(ids = ABCD, settings: Partial<ImposterSettings> = {}, rounds = 3): HostState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id.toUpperCase(), avatar: '👻' }]))
  const state = { ...setImposterSettings(addPlayers(initialState('imposterjakten'), players), settings), rounds }
  return hostStart({ state, secrets: null }, ids, NOW, () => 0)
}

const secretsOf = (host: HostState) => host.secrets as ImposterSecrets
const table = (host: HostState) => host.state.imposter!
const word = (host: HostState) => findWord(secretsOf(host).wordId)!

function readAll(host: HostState, ids = ABCD): HostState {
  return ids.reduce((next, id) => hostMove(next, id, { type: 'read' }, ids, NOW), host)
}

// Passar tills det är spelarens tur.
function untilTurn(host: HostState, id: string, ids = ABCD): HostState {
  let next = host
  while (currentTurn(table(next)) !== id) next = hostMove(next, currentTurn(table(next))!, table(next).aloud ? { type: 'said' } : { type: 'pass' }, ids, NOW)
  return next
}

function playClues(host: HostState, ids = ABCD): HostState {
  let next = host
  for (let i = 0; table(next).step === 'ledtradar'; i++) next = hostMove(next, currentTurn(table(next))!, { type: 'clue', word: `ord${i}` }, ids, NOW)
  return next
}

function toVoting(host: HostState, ids = ABCD): HostState {
  const ready = ids.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, ids, NOW), playClues(readAll(host, ids), ids))
  return hostDeadline(ready, ready.state.deadline!, ready.state.deadline!, ids)
}

// Alla röstar på impostern, som då är fast och ska gissa.
function catchImposter(host: HostState, ids = ABCD): HostState {
  const imposter = secretsOf(host).imposter
  const other = ids.find((id) => id !== imposter)!
  return ids.reduce((next, id) => hostMove(next, id, { type: 'vote', target: id === imposter ? other : imposter }, ids, NOW), toVoting(host, ids))
}

const typed = (text: string) => text.replace(/\s+/g, '')

describe('fynd 1: impostern kan inte prova sig fram till det hemliga ordet', () => {
  it('får aldrig beskedet att ordet inte går när den skriver det hemliga ordet, i Normal och Svår', () => {
    for (const settings of [{}, { hard: true }]) {
      const host = readAll(start(ABCD, settings))
      const imposter = secretsOf(host).imposter
      const turn = untilTurn(host, imposter)
      const secret = typed(word(host).ord)
      const sent = hostMove(turn, imposter, { type: 'clue', word: secret }, ABCD, NOW + 5)
      expect(myImposterCard(secretsOf(sent), table(sent), imposter).rejectedAt).toBeNull()
      expect(table(sent).clues.at(-1)).toEqual({ player: imposter, kind: 'ord', word: secret })
      expect(currentTurn(table(sent))).not.toBe(imposter)
    }
  })

  it('gäller också godkända former och ord som innehåller det hemliga ordet', () => {
    const host = readAll(start())
    const imposter = secretsOf(host).imposter
    const turn = untilTurn(host, imposter)
    for (const text of [typed(word(host).godkanda.at(-1)!), `stor${typed(word(host).ord)}`]) {
      const sent = hostMove(turn, imposter, { type: 'clue', word: text }, ABCD, NOW + 5)
      expect(myImposterCard(secretsOf(sent), table(sent), imposter).rejectedAt, text).toBeNull()
      expect(table(sent).clues.at(-1)?.word, text).toBe(text)
    }
  })

  it('visar imposterns inskrivna ord när ni säger orden högt, även om det är det hemliga ordet', () => {
    const host = readAll(start(ABCD, { aloud: true }))
    const imposter = secretsOf(host).imposter
    const secret = typed(word(host).ord)
    const said = hostMove(untilTurn(host, imposter), imposter, { type: 'said', word: secret }, ABCD, NOW)
    expect(table(said).clues.at(-1)).toEqual({ player: imposter, kind: 'sagt', word: secret })
  })

  it('avvisar fortfarande en upprepning och ett ogiltigt ord för impostern, och det hemliga ordet för de oskyldiga', () => {
    const host = readAll(start())
    const imposter = secretsOf(host).imposter
    const innocent = ABCD.find((id) => id !== imposter)!
    const first = untilTurn(host, innocent)
    const blocked = hostMove(first, innocent, { type: 'clue', word: typed(word(host).ord) }, ABCD, NOW + 5)
    expect(myImposterCard(secretsOf(blocked), table(blocked), innocent).rejectedAt).toBe(NOW + 5)
    const given = hostMove(first, innocent, { type: 'clue', word: 'regn' }, ABCD, NOW)
    const turn = untilTurn(given, imposter)
    for (const text of ['regn', 'två ord', '!!']) {
      const sent = hostMove(turn, imposter, { type: 'clue', word: text }, ABCD, NOW + 9)
      expect(myImposterCard(secretsOf(sent), table(sent), imposter).rejectedAt, text).toBe(NOW + 9)
      expect(currentTurn(table(sent))).toBe(imposter)
    }
  })

  it('i Lurig kontrolleras impostern mot sitt eget ord, och får skriva de andras ord utan besked', () => {
    const host = readAll(start(ABCD, { tricky: true }))
    const imposter = secretsOf(host).imposter
    const turn = untilTurn(host, imposter)
    const own = hostMove(turn, imposter, { type: 'clue', word: typed(word(host).nara) }, ABCD, NOW + 5)
    expect(myImposterCard(secretsOf(own), table(own), imposter).rejectedAt).toBe(NOW + 5)
    const others = hostMove(turn, imposter, { type: 'clue', word: typed(word(host).ord) }, ABCD, NOW + 5)
    expect(myImposterCard(secretsOf(others), table(others), imposter).rejectedAt).toBeNull()
  })
})

describe('fynd 2: impostern lämnar under sista gissningen', () => {
  it('räknas som att den gav upp, så att de oskyldiga får sina poäng', () => {
    const caught = catchImposter(start())
    expect(table(caught).step).toBe('gissning')
    const imposter = secretsOf(caught).imposter
    const left = ABCD.filter((id) => id !== imposter)
    const done = hostPresence(caught, left, NOW)
    expect(table(done).outcome?.kind).toBe('gav-upp')
    for (const id of left) expect(done.state.scores[id]).toBe(3)
    expect(done.state.scores[imposter]).toBe(0)
    expect(table(done).skipNote).toContain('gav upp')
    expect(done.state.imposterMatch.history).toHaveLength(1)
  })

  it('avbryter fortfarande omgången utan poäng när impostern lämnar tidigare', () => {
    const voting = toVoting(start())
    const imposter = secretsOf(voting).imposter
    const done = hostPresence(voting, ABCD.filter((id) => id !== imposter), NOW)
    expect(table(done).outcome?.kind).toBe('avbruten')
    expect(Object.values(done.state.scores).every((score) => score === 0)).toBe(true)
  })
})

describe('fynd 3: en ny värd tar över', () => {
  // Den nya värden har bara det alla ser, och får nya hemligheter.
  const takeOver = (host: HostState): HostState => {
    const state = takeOverState(host.state, 0)
    return { state, secrets: state.phase === 'playing' && state.imposter ? takeOverSecrets() : null }
  }

  it('mitt i en omgång avbryts bara omgången, och poängen från tidigare omgångar står kvar', () => {
    const first = hostMove(catchImposter(start()), secretsOf(catchImposter(start())).imposter, { type: 'giveUp' }, ABCD, NOW)
    const scores = first.state.scores
    const second = toVoting(hostImposterNextRound(first, ABCD, () => 0))
    expect(second.state.round).toBe(2)
    const taken = takeOver(second)
    expect(taken.state.phase).toBe('playing')
    expect(taken.state.round).toBe(2)
    expect(taken.state.scores).toEqual(scores)
    expect(taken.state.deadline).toBeNull()
    expect(table(taken)).toMatchObject({ step: 'facit', outcome: { kind: 'avbruten', word: '', points: {} } })
    expect(table(taken).outcome?.reason).toContain('värden lämnade')
    expect(taken.state.imposterMatch.history).toHaveLength(1)
    // Den nya värden går vidare: en ny omgång med samma nummer, nytt ord och ny imposter.
    const again = hostImposterNextRound(taken, ABCD, () => 0)
    expect(again.state.round).toBe(2)
    expect(table(again).step).toBe('kort')
    expect(findWord(secretsOf(again).wordId)).toBeDefined()
    expect(ABCD).toContain(secretsOf(again).imposter)
  })

  it('i facit fortsätter matchen som den är, och efter sista omgången kommer prispallen', () => {
    const host = start(ABCD, {}, 1)
    const facit = hostMove(catchImposter(host), secretsOf(host).imposter, { type: 'giveUp' }, ABCD, NOW)
    const taken = takeOver(facit)
    expect(taken.state).toEqual(facit.state)
    const done = hostImposterNextRound(taken, ABCD)
    expect(done.state.phase).toBe('finished')
    expect(done.state.scores).toEqual(facit.state.scores)
    expect(done.state.matchesPlayed).toBe(1)
  })

  it('går tillbaka till väntrummet om för få är kvar när den nya värden går vidare', () => {
    const taken = takeOver(toVoting(start(['a', 'b', 'c'])))
    const next = hostImposterNextRound(taken, ['b', 'c'])
    expect(next.state.phase).toBe('waiting')
  })
})

describe('fynd 5: sista gissningen', () => {
  it('jämför utan mellanslag, bindestreck, punkter och accenter, men skiljer å, ä och ö', () => {
    expect(guessKey('  QR kod ')).toBe(guessKey('qr-kod'))
    expect(guessKey('Idétorka')).toBe('idetorka')
    expect(guessKey('Zlatan Ibrahimović')).toBe('zlatanibrahimovic')
    expect(guessKey('Älg')).not.toBe(guessKey('Alg'))
    expect(guessKey('Bål')).not.toBe(guessKey('Bal'))
    expect(guessKey('Dörr')).not.toBe(guessKey('Dorr'))
    const by = (id: string) => findWord(id)!
    expect(isCorrectGuess('qr kod', by('qr-kod'))).toBe(true)
    expect(isCorrectGuess('pommesfrites', WORDS.find((w) => w.ord === 'Pommes frites')!)).toBe(true)
    expect(isCorrectGuess('All-inclusive', WORDS.find((w) => w.ord === 'All inclusive')!)).toBe(true)
    expect(isCorrectGuess('idetorka', WORDS.find((w) => w.ord === 'Idétorka')!)).toBe(true)
    expect(isCorrectGuess('alg', WORDS.find((w) => w.ord === 'Älg')!)).toBe(false)
    expect(isCorrectGuess('', WORDS[0])).toBe(false)
    expect(isCorrectGuess(' - ', WORDS[0])).toBe(false)
  })

  it('godtar förnamn eller efternamn när det räcker för att alla vet vem det är', () => {
    const cases: [string, string][] = [
      ['Zlatan Ibrahimović', 'Zlatan'],
      ['Albert Einstein', 'einstein'],
      ['Ludwig van Beethoven', 'Beethoven'],
      ['Astrid Lindgren', 'Lindgren'],
      ['Håkan Hellström', 'hellström'],
      ['Alfred Nobel', 'Nobel'],
      ['Måns Zelmerlöw', 'Måns'],
      ['Henrik Lundqvist', 'Lundqvist'],
      ['Mr Bean', 'Bean'],
    ]
    for (const [ord, guess] of cases) expect(isCorrectGuess(guess, WORDS.find((w) => w.ord === ord)!), ord).toBe(true)
    // Ett namn som flera delar räcker inte.
    expect(isCorrectGuess('Ingrosso', WORDS.find((w) => w.ord === 'Bianca Ingrosso')!)).toBe(false)
  })

  it('godtar bestämd form och plural för Skog och Nycklar', () => {
    for (const guess of ['skogen', 'Skogar']) expect(isCorrectGuess(guess, WORDS.find((w) => w.ord === 'Skog')!), guess).toBe(true)
    for (const guess of ['nyckeln', 'nycklarna']) expect(isCorrectGuess(guess, WORDS.find((w) => w.ord === 'Nycklar')!), guess).toBe(true)
  })

  it('godtar varje ord och varje godkänd form i hela ordlistan, och aldrig ett annat ords ord', () => {
    for (const item of WORDS) {
      for (const form of [item.ord, ...item.godkanda]) expect(isCorrectGuess(form.toUpperCase(), item), `${item.ord}: ${form}`).toBe(true)
    }
    const keys = new Map<string, string>()
    for (const item of WORDS) {
      for (const key of new Set([item.ord, ...item.godkanda].map(guessKey))) {
        expect(keys.get(key), `${key}: ${item.ord} och ${keys.get(key)}`).toBeUndefined()
        keys.set(key, item.ord)
      }
    }
  })
})

describe('fynd 6 och 7: ledtrådskontrollen', () => {
  const by = (ord: string) => WORDS.find((w) => w.ord === ord)!
  const ok = (text: string, ord: string) => checkClue(text, by(ord), []).ok

  it('spärrar sammansättningar som slutar på ett kort ord', () => {
    const cases: [string, string][] = [
      ['nagelsax', 'Sax'],
      ['hemläxa', 'Läxa'],
      ['kattcafé', 'Café'],
      ['tallskog', 'Skog'],
      ['utegym', 'Gym'],
      ['idrottsgala', 'Gala'],
      ['stortorg', 'Torg'],
    ]
    for (const [clue, ord] of cases) expect(ok(clue, ord), `${clue} för ${ord}`).toBe(false)
  })

  it('spärrar böjningar av korta ord, och sammansättningar som börjar med ett ord på fyra bokstäver', () => {
    for (const [clue, ord] of [['saxs', 'Sax'], ['gyms', 'Gym'], ['skogs', 'Skog'], ['torgstånd', 'Torg'], ['skogspromenad', 'Skog'], ['galakväll', 'Gala']]) {
      expect(ok(clue, ord), `${clue} för ${ord}`).toBe(false)
    }
  })

  it('spärrar stammen i ord som slutar på a eller e', () => {
    for (const [clue, ord] of [['ekorrhjul', 'Ekorre'], ['tandborstning', 'Tandborste'], ['matlådedag', 'Matlåda']]) expect(ok(clue, ord), `${clue} för ${ord}`).toBe(false)
  })

  it('släpper igenom vanliga ord som bara råkar börja som ett kort ord', () => {
    const cases: [string, string][] = [
      ['djur', 'DJ'],
      ['djungel', 'DJ'],
      ['fyra', 'Fyr'],
      ['fyrverkeri', 'Fyr'],
      ['saxofon', 'Sax'],
      ['dopp', 'Dop'],
      ['galax', 'Gala'],
      ['storgata', 'Torg'],
    ]
    for (const [clue, ord] of cases) expect(ok(clue, ord), `${clue} för ${ord}`).toBe(true)
  })

  it('spärrar delar av alternativa former bara som hela ord', () => {
    const cases: [string, string][] = [
      ['tågstation', 'PlayStation'],
      ['bensinstation', 'PlayStation'],
      ['parkeringsplats', 'Sagan om ringen'],
      ['vandringsled', 'Sagan om ringen'],
      ['powerbank', 'PowerPoint'],
      ['bensinstation', 'Instagram'],
      ['kapsylöppnare', 'Öppen scen'],
    ]
    for (const [clue, ord] of cases) expect(ok(clue, ord), `${clue} för ${ord}`).toBe(true)
    // Men delen som helt ord går inte, och inte heller själva ordets delar.
    expect(ok('station', 'PlayStation')).toBe(false)
    expect(ok('rings', 'Sagan om ringen')).toBe(false)
    expect(ok('ringen', 'Sagan om ringen')).toBe(false)
    expect(ok('instastory', 'Instagram')).toBe(false)
    expect(ok('skansen', 'Allsång på Skansen')).toBe(false)
  })

  it('spärrar varje ords egna former i hela ordlistan, men aldrig dess ledtråd eller nära-ord', () => {
    for (const item of WORDS) {
      for (const form of [item.ord, ...item.godkanda]) {
        const text = typed(form)
        if (!/^[\p{L}\p{N}-]+$/u.test(text)) continue
        expect(checkClue(text, item, []).ok, `${item.ord}: formen ${form} ska spärras`).toBe(false)
      }
      for (const text of [item.ledtrad, item.nara].map(typed)) {
        if (!/^[\p{L}\p{N}-]+$/u.test(text)) continue
        expect(checkClue(text, item, []).ok, `${item.ord}: ${text} ska gå igenom`).toBe(true)
      }
    }
  })

  it('spärrar inga andra ord ur ordlistan i onödan', () => {
    // Alla ord, nära-ord och ledtrådar i listan som tänkbara ledtrådar mot varje ord. Det som spärras ska vara väntat:
    // ordet står i ledtråden, eller ledtråden börjar med ordets stam eller är en sammansättning med det korta ordet.
    const corpus = [...new Set(WORDS.flatMap((item) => [item.ord, item.nara, item.ledtrad]).map((text) => normalizeWord(typed(text))).filter((text) => /^[\p{L}\p{N}-]+$/u.test(text)))]
    const surprising: string[] = []
    for (const item of WORDS) {
      const rules = blockRules(item)
      for (const clue of corpus) {
        if (checkClue(clue, item, []).ok) continue
        const expected = rules.some(({ form, how }) => (how === 'anywhere' ? clue.includes(form) : how === 'end' ? clue.endsWith(form) : clue.startsWith(form)))
        if (!expected) surprising.push(`${item.ord}: ${clue}`)
      }
    }
    expect(surprising).toEqual([])
    // De här spärrades förut utan att likna ordet.
    expect(checkClue('djurpark', WORDS.find((w) => w.ord === 'DJ')!, []).ok).toBe(true)
    expect(checkClue('polisstation', WORDS.find((w) => w.ord === 'PlayStation')!, []).ok).toBe(true)
  })
})

describe('fynd 4: värden kan öppna omröstningen när diskussionen står still', () => {
  it('får knappen först efter en minut, och då öppnas omröstningen även om ingen är redo', () => {
    const discussion = playClues(readAll(start()))
    const since = table(discussion).waitSince!
    expect(hostSkipKind(table(discussion))).toBe('diskussion')
    expect(hostSkipAt(table(discussion))).toBe(since + DISCUSSION_SKIP_SECONDS * 1000)
    expect(hostImposterSkipTurn(discussion, ABCD, since + 59_000)).toBe(discussion)
    const open = hostImposterSkipTurn(discussion, ABCD, since + 60_000)
    expect(table(open).step).toBe('rostning')
    expect(open.state.deadline).toBeNull()
    expect(table(open).skipNote).toBe('Värden öppnade omröstningen.')
    // Omröstningen går sedan som vanligt.
    const imposter = secretsOf(open).imposter
    const other = ABCD.find((id) => id !== imposter)!
    const voted = ABCD.reduce((next, id) => hostMove(next, id, { type: 'vote', target: id === imposter ? other : imposter }, ABCD, NOW), open)
    expect(table(voted).step).toBe('gissning')
  })

  it('gäller också diskussionen efter lika röster, med en ny minut, men inte under en anklagelse', () => {
    const voting = toVoting(start())
    // Två röster var på två spelare.
    const tied = [['a', 'b'], ['b', 'a'], ['c', 'a'], ['d', 'b']].reduce((next, [id, target]) => hostMove(next, id, { type: 'vote', target }, ABCD, NOW + 500_000), voting)
    expect(table(tied).tied).toEqual(['b', 'a'])
    expect(hostSkipAt(table(tied))).toBe(NOW + 500_000 + DISCUSSION_SKIP_SECONDS * 1000)
    const discussion = playClues(readAll(start()))
    const accusing = hostMove(discussion, 'a', { type: 'accuse', target: 'b' }, ABCD, NOW)
    expect(hostSkipKind(table(accusing))).toBeNull()
  })
})

describe('fynd 14: lika en gång till', () => {
  it('låter impostern komma undan när det blir lika igen, även om en av de lika placerade har lämnat', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f']
    const voting = toVoting(start(six), six)
    const imposter = secretsOf(voting).imposter
    const others = six.filter((id) => id !== imposter)
    // Tre röster på impostern och tre på en oskyldig.
    const first: Record<string, string> = { [imposter]: others[0], [others[0]]: imposter, [others[1]]: imposter, [others[2]]: imposter, [others[3]]: others[0], [others[4]]: others[0] }
    let host = six.reduce((next, id) => hostMove(next, id, { type: 'vote', target: first[id] }, six, NOW), voting)
    expect(table(host).tied).toHaveLength(2)
    // Den oskyldiga av de lika lämnar: bara en är kvar, så omröstningen blir vanlig igen.
    const left = six.filter((id) => id !== others[0])
    host = hostPresence(host, left, NOW)
    expect(table(host).tied).toBeNull()
    expect(table(host).tiedOnce).toBe(true)
    host = left.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, left, NOW), host)
    host = hostDeadline(host, host.state.deadline!, host.state.deadline!, left)
    expect(table(host).step).toBe('rostning')
    // Lika igen: två på impostern, två på en oskyldig och en på en tredje.
    const second: Record<string, string> = { [imposter]: others[1], [others[1]]: imposter, [others[2]]: imposter, [others[3]]: others[1], [others[4]]: others[2] }
    host = left.reduce((next, id) => hostMove(next, id, { type: 'vote', target: second[id] }, left, NOW), host)
    expect(table(host).step).toBe('facit')
    expect(table(host).outcome?.kind).toBe('undan')
    expect(host.state.scores[imposter]).toBe(3)
  })

  it('börjar nästa omgång utan något kvar från den förra', () => {
    const three = ['a', 'b', 'c']
    const vote = (host: HostState) => three.reduce((next, id, i) => hostMove(next, id, { type: 'vote', target: three[(i + 1) % 3] }, three, NOW), host)
    const again = (host: HostState) => {
      const ready = three.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, three, NOW), host)
      return hostDeadline(ready, ready.state.deadline!, ready.state.deadline!, three)
    }
    const tied = vote(toVoting(start(three), three))
    expect(table(tied).tiedOnce).toBe(true)
    const done = vote(again(tied))
    expect(table(done).outcome?.kind).toBe('undan')
    const next = hostImposterNextRound(done, three, () => 0)
    expect(table(next).tiedOnce).toBe(false)
    expect(table(next).tied).toBeNull()
  })
})

describe('småsakerna i del 3', () => {
  it('fynd 9: den som anklagar har redan svarat ja, och facit säger "svarade nej" i stället för "röstade inte"', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    const discussion = playClues(readAll(start(five), five), five)
    const imposter = secretsOf(discussion).imposter
    const [accuser, yes, no, alsoNo] = five.filter((id) => id !== imposter)
    let host = hostMove(discussion, accuser, { type: 'accuse', target: imposter }, five, NOW)
    expect(table(host).accusation).toMatchObject({ answered: 1, voters: 4 })
    expect(myImposterCard(secretsOf(host), table(host), accuser).accuseVote).toBe(true)
    host = hostMove(host, yes, { type: 'accuseVote', yes: true }, five, NOW)
    host = hostMove(host, no, { type: 'accuseVote', yes: false }, five, NOW)
    host = hostMove(host, alsoNo, { type: 'accuseVote', yes: true }, five, NOW)
    expect(table(host).step).toBe('gissning')
    expect(table(host).byAccusation).toBe(true)
    const done = hostMove(host, imposter, { type: 'giveUp' }, five, NOW)
    const outcome = table(done).outcome!
    expect(pointsReason(table(done), outcome, accuser)).toBe('röstade rätt')
    expect(pointsReason(table(done), outcome, no)).toBe('svarade nej')
    expect(pointsReason(table(done), outcome, imposter)).toBe('gav upp')
    expect(done.state.scores[accuser]).toBe(3)
    expect(done.state.scores[no]).toBe(1)
  })

  it('fynd 9: en anklagad oskyldig står som "anklagad", och efter en vanlig omröstning står "röstade inte" kvar', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    const discussion = playClues(readAll(start(five), five), five)
    const imposter = secretsOf(discussion).imposter
    const [accused, accuser, other, last] = five.filter((id) => id !== imposter)
    let host = hostMove(discussion, accuser, { type: 'accuse', target: accused }, five, NOW)
    for (const id of [other, imposter]) host = hostMove(host, id, { type: 'accuseVote', yes: true }, five, NOW)
    host = hostMove(host, last, { type: 'accuseVote', yes: false }, five, NOW)
    const outcome = table(host).outcome!
    expect(outcome.kind).toBe('undan')
    expect(pointsReason(table(host), outcome, accused)).toBe('anklagad')
    expect(pointsReason(table(host), outcome, accuser)).toBe('röstade fel')
    expect(pointsReason(table(host), outcome, last)).toBe('svarade nej')
    expect(pointsReason(table(host), outcome, imposter)).toBe('kom undan')
    // En vanlig omröstning där värden räknade rösterna innan alla röstat.
    const voting = toVoting(start())
    const voted = hostMove(voting, 'a', { type: 'vote', target: 'b' }, ABCD, NOW)
    const counted = hostImposterSkipTurn(voted, ABCD, table(voted).waitSince! + 60_000)
    const missing = ABCD.find((id) => id !== 'a' && id !== secretsOf(counted).imposter)!
    expect(table(counted).byAccusation).toBeUndefined()
    expect(pointsReason(table(counted), table(counted).outcome!, missing)).toBe('röstade inte')
  })

  it('fynd 12: läget säger hur lång nedräkningen är, så att tidsstapeln börjar full', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    let host = playClues(readAll(start(five), five), five)
    expect(table(host).countdownSeconds).toBeUndefined()
    for (const id of ['a', 'b', 'c']) host = hostMove(host, id, { type: 'ready', on: true }, five, NOW)
    expect(table(host).countdownSeconds).toBe(COUNTDOWN_SECONDS)
    for (const id of ['d', 'e']) host = hostMove(host, id, { type: 'ready', on: true }, five, NOW + 1000)
    expect(table(host).countdownSeconds).toBe(ALL_READY_SECONDS)
    expect(host.state.deadline).toBe(NOW + 1000 + ALL_READY_SECONDS * 1000)
    // Alla blir redo direkt: bara den korta.
    const quick = ABCD.reduce((next, id) => hostMove(next, id, { type: 'ready', on: true }, ABCD, NOW), playClues(readAll(start())))
    expect(table(quick).countdownSeconds).toBe(ALL_READY_SECONDS)
    // Har den långa mindre än fem sekunder kvar fortsätter den, och räknas fortfarande mot sin egen längd.
    let late = playClues(readAll(start(five), five), five)
    for (const id of ['a', 'b', 'c']) late = hostMove(late, id, { type: 'ready', on: true }, five, NOW)
    const deadline = late.state.deadline!
    for (const id of ['d', 'e']) late = hostMove(late, id, { type: 'ready', on: true }, five, deadline - 2000)
    expect(late.state.deadline).toBe(deadline)
    expect(table(late).countdownSeconds).toBe(COUNTDOWN_SECONDS)
  })

  it('fynd 16: alla ledtrådar börjar med stor bokstav', () => {
    for (const item of WORDS) expect(item.ledtrad.charAt(0), item.ord).toBe(item.ledtrad.charAt(0).toLocaleUpperCase('sv'))
  })
})

describe('lägen som saknade test', () => {
  it('en anklagelse precis när nedräkningen gått ut pausar den, och omröstningen öppnas direkt efteråt', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    let host = playClues(readAll(start(five), five), five)
    for (const id of ['a', 'b', 'c']) host = hostMove(host, id, { type: 'ready', on: true }, five, NOW)
    const deadline = host.state.deadline!
    const imposter = secretsOf(host).imposter
    const accused = five.find((id) => id !== 'e' && id !== imposter)!
    const accusing = hostMove(host, 'e', { type: 'accuse', target: accused }, five, deadline + 100)
    expect(table(accusing).accusation?.accused).toBe(accused)
    // Den gamla nedräkningens timer gör ingenting under anklagelsen.
    expect(hostDeadline(accusing, deadline + 300, deadline, five)).toBe(accusing)
    const after = five.filter((id) => id !== accused).reduce((next, id) => hostMove(next, id, { type: 'accuseVote', yes: false }, five, deadline + 500), accusing)
    expect(table(after).step).toBe('diskussion')
    expect(after.state.deadline).toBe(deadline + 500)
    expect(table(hostDeadline(after, deadline + 800, after.state.deadline!, five)).step).toBe('rostning')
  })

  it('alla blir redo i samma ögonblick som nedräkningen tar slut: omröstningen öppnas en gång', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    let host = playClues(readAll(start(five), five), five)
    for (const id of ['a', 'b', 'c']) host = hostMove(host, id, { type: 'ready', on: true }, five, NOW)
    const deadline = host.state.deadline!
    for (const id of ['d', 'e']) host = hostMove(host, id, { type: 'ready', on: true }, five, deadline)
    expect(host.state.deadline).toBe(deadline)
    const open = hostDeadline(host, deadline, deadline, five)
    expect(table(open).step).toBe('rostning')
    expect(hostDeadline(open, deadline + 5, deadline, five)).toBe(open)
  })

  it('ett drag som kommer två gånger eller i fel ordning ändrar inget', () => {
    const host = readAll(start())
    const turn = currentTurn(table(host))!
    const given = hostMove(host, turn, { type: 'clue', word: 'regn' }, ABCD, NOW)
    expect(hostMove(given, turn, { type: 'clue', word: 'regn' }, ABCD, NOW)).toBe(given)
    expect(hostMove(given, turn, { type: 'pass' }, ABCD, NOW)).toBe(given)
    expect(hostMove(given, turn, { type: 'read' }, ABCD, NOW)).toBe(given)
    expect(hostMove(given, turn, { type: 'vote', target: ABCD.find((id) => id !== turn)! }, ABCD, NOW)).toBe(given)
    const voting = toVoting(start())
    const voted = hostMove(voting, 'a', { type: 'vote', target: 'b' }, ABCD, NOW)
    expect(hostMove(voted, 'a', { type: 'vote', target: 'c' }, ABCD, NOW)).toBe(voted)
    expect(hostMove(voted, 'a', { type: 'ready', on: true }, ABCD, NOW)).toBe(voted)
  })

  it('värden laddar om mitt i en omgång: det sparade läget fortsätter där det var', () => {
    const host = hostMove(readAll(start()), currentTurn(table(readAll(start())))!, { type: 'clue', word: 'regn' }, ABCD, NOW)
    const restored = restoreHostState(JSON.parse(JSON.stringify(host)))!
    expect(restored).toEqual(host)
    // Alla syns i närvarolistan igen: omgången fortsätter, och korten är desamma.
    const present = hostPresence(restored, ABCD, NOW)
    expect(table(present).step).toBe('ledtradar')
    for (const id of ABCD) expect(myImposterCard(secretsOf(present), table(present), id)).toEqual(myImposterCard(secretsOf(host), table(host), id))
    const next = hostMove(present, currentTurn(table(present))!, { type: 'clue', word: 'sol' }, ABCD, NOW)
    expect(table(next).clues).toHaveLength(2)
  })

  it('spelar en hel omgång med tre och med tio spelare', () => {
    for (const n of [3, 10]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`)
      const host = start(ids)
      const caught = catchImposter(host, ids)
      expect(table(caught).step, `${n} spelare`).toBe('gissning')
      const done = hostMove(caught, secretsOf(host).imposter, { type: 'guess', word: word(host).ord }, ids, NOW)
      expect(table(done).outcome?.kind).toBe('gissade-ratt')
      expect(done.state.scores[secretsOf(host).imposter]).toBe(1)
      expect(Object.values(done.state.scores).filter((score) => score === 3)).toHaveLength(n - 1)
    }
  })
})
