import { describe, expect, it } from 'vitest'
import {
  advanceCardReveal,
  cardDeadline,
  cardMove,
  cardPresence,
  cleanBlank,
  fillPrompt,
  myHand,
  nextJudge,
  startCardMatch,
  type CardGameRules,
  type CardHost,
  type CardMove,
} from '@/lib/kort'
import { addPlayers, initialState } from '@/lib/match'

const NOW = 1_000_000

// En liten testlek: 12 frågekort och 60 svarskort.
const RULES: CardGameRules = {
  roundOptions: [5, 8, 10],
  defaultRounds: 8,
  handSize: 7,
  blankMaxLength: 60,
  seconds: { question: 8, choosing: 40, judging: 45, reveal: 12 },
  prompts: Array.from({ length: 12 }, (_, i) => `p${i + 1}`),
  answers: Array.from({ length: 60 }, (_, i) => `a${i + 1}`),
  promptText: (id) => `Fråga ${id}: ___.`,
  answerText: (id) => `svar ${id}`,
  howTo: '',
  scoringDetails: [],
}

// Ingen slump i testerna: korten ligger i ordning och första kortet vinner när domaren somnar.
const fixed = () => 0

// En match som just startat med spelarna a, b, c … (a är första domare).
function match(ids = ['a', 'b', 'c'], rounds = 8): CardHost {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id.toUpperCase(), avatar: '👻' }]))
  const state = { ...addPlayers(initialState('kortspel'), players), rounds }
  return startCardMatch(state, RULES, NOW, fixed)
}

// Spolar fram till nästa steg i rundan genom att låta klockan gå ut.
function timeout(host: CardHost, active: string[]): CardHost {
  const deadline = host.state.deadline!
  return cardDeadline(host, RULES, deadline, deadline, active, fixed)
}

function move(host: CardHost, id: string, m: CardMove, active: string[]): CardHost {
  return cardMove(host, RULES, id, m, active, host.state.deadline! - 1000, fixed)
}

function pickFirst(host: CardHost, id: string, active: string[], done = true): CardHost {
  const card = host.secrets.hands[id][0]
  return move(host, id, { type: 'pick', pick: { kind: 'card', card }, done }, active)
}

// Spelar en hel runda där alla utom domaren lägger sitt första kort och domaren väljer det första.
function playRound(host: CardHost, active: string[]): CardHost {
  let next = timeout(host, active)
  for (const id of active) if (id !== next.state.cards!.judge) next = pickFirst(next, id, active)
  const key = next.state.cards!.submissions[0].key
  return move(next, next.state.cards!.judge, { type: 'judge', key }, active)
}

const ABC = ['a', 'b', 'c']

describe('dra kort', () => {
  it('ger alla 7 kort och ett blankt kort, utan dubbletter', () => {
    const { secrets } = match(['a', 'b', 'c', 'd'])
    const all = Object.values(secrets.hands).flat()
    expect(Object.values(secrets.hands).every((hand) => hand.length === 7)).toBe(true)
    expect(new Set(all).size).toBe(all.length)
    expect(secrets.answerPile.some((card) => all.includes(card))).toBe(false)
    expect(Object.values(secrets.blank).every(Boolean)).toBe(true)
  })

  it('fyller på handen till 7 efter varje runda och ger aldrig tillbaka ett spelat kort', () => {
    let host = match()
    const seen = new Set(Object.values(host.secrets.hands).flat())
    const played: string[] = []
    for (let round = 0; round < 3; round++) {
      host = timeout(host, ABC)
      for (const id of ABC) {
        if (id === host.state.cards!.judge) continue
        played.push(host.secrets.hands[id][0])
        host = pickFirst(host, id, ABC)
      }
      host = move(host, host.state.cards!.judge, { type: 'judge', key: 'k1' }, ABC)
      host = timeout(host, ABC)
      for (const card of Object.values(host.secrets.hands).flat()) seen.add(card)
      expect(Object.values(host.secrets.hands).every((hand) => hand.length === 7)).toBe(true)
    }
    const hands = Object.values(host.secrets.hands).flat()
    expect(played.some((card) => hands.includes(card))).toBe(false)
    expect(seen.size).toBe(21 + played.length)
  })

  it('visar aldrig samma frågekort två gånger i en match', () => {
    let host = match(ABC, 10)
    const prompts = [host.state.cards!.prompt]
    for (let round = 1; round < 10; round++) {
      host = timeout(playRound(host, ABC), ABC)
      prompts.push(host.state.cards!.prompt)
    }
    expect(new Set(prompts).size).toBe(10)
  })
})

describe('domare', () => {
  it('byts varje runda i turordning', () => {
    let host = match(['a', 'b', 'c', 'd'])
    const judges = [host.state.cards!.judge]
    for (let round = 1; round < 6; round++) {
      host = timeout(playRound(host, ['a', 'b', 'c', 'd']), ['a', 'b', 'c', 'd'])
      judges.push(host.state.cards!.judge)
    }
    expect(judges).toEqual(['a', 'b', 'c', 'd', 'a', 'b'])
  })

  it('hoppar över den som har lämnat', () => {
    expect(nextJudge(['a', 'b', 'c', 'd'], 'a', ['a', 'c', 'd'])).toBe('c')
    expect(nextJudge(['a', 'b', 'c', 'd'], 'd', ['b', 'c', 'd'])).toBe('b')
  })

  it('kan inte spela kort, och bara domaren kan välja vinnare', () => {
    let host = timeout(match(), ABC)
    expect(pickFirst(host, 'a', ABC)).toBe(host)
    host = pickFirst(pickFirst(host, 'b', ABC), 'c', ABC)
    expect(host.state.cards!.step).toBe('judging')
    expect(move(host, 'b', { type: 'judge', key: 'k1' }, ABC)).toBe(host)
    expect(move(host, 'a', { type: 'judge', key: 'k1' }, ABC).state.cards!.step).toBe('reveal')
  })
})

describe('välja kort', () => {
  it('väntar på frågekortet innan man kan välja', () => {
    const host = match()
    expect(host.state.cards!.step).toBe('question')
    expect(pickFirst(host, 'b', ABC)).toBe(host)
    expect(timeout(host, ABC).state.cards!.step).toBe('choosing')
    expect(timeout(host, ABC).state.deadline).toBe(NOW + 8_000 + 40_000)
  })

  it('låter en spelare byta kort tills den klickat Klar', () => {
    let host = timeout(match(), ABC)
    const [first, second] = host.secrets.hands.b
    host = move(host, 'b', { type: 'pick', pick: { kind: 'card', card: first } }, ABC)
    host = move(host, 'b', { type: 'pick', pick: { kind: 'card', card: second } }, ABC)
    expect(myHand(host.secrets, 'b')!.pick).toEqual({ kind: 'card', card: second })
    host = move(host, 'b', { type: 'done' }, ABC)
    expect(host.state.cards!.done).toEqual(['b'])
    expect(move(host, 'b', { type: 'pick', pick: { kind: 'card', card: first } }, ABC)).toBe(host)
  })

  it('tar inte emot kort som inte finns på handen', () => {
    const host = timeout(match(), ABC)
    const someoneElses = host.secrets.hands.c[0]
    expect(move(host, 'b', { type: 'pick', pick: { kind: 'card', card: someoneElses } }, ABC)).toBe(host)
  })

  it('räknar ett valt kort som spelat när tiden tar slut, även utan Klar', () => {
    let host = timeout(match(['a', 'b', 'c', 'd']), ['a', 'b', 'c', 'd'])
    host = pickFirst(host, 'b', ['a', 'b', 'c', 'd'], false)
    host = pickFirst(host, 'c', ['a', 'b', 'c', 'd'], true)
    host = timeout(host, ['a', 'b', 'c', 'd'])
    expect(host.state.cards!.step).toBe('judging')
    expect(host.state.cards!.submissions).toHaveLength(2)
    // d valde inget och spelar inget den här rundan.
    expect(Object.values(host.secrets.submitted).map((s) => s.player).sort()).toEqual(['b', 'c'])
    expect(host.secrets.hands.d).toHaveLength(7)
  })
})

describe('anonymitet', () => {
  it('visar korten utan namn tills rundan avslöjas', () => {
    let host = timeout(match(), ABC)
    host = pickFirst(pickFirst(host, 'b', ABC), 'c', ABC)
    const shown = host.state.cards!
    expect(shown.submissions.every((s) => Object.keys(s).sort().join() === 'key,text')).toBe(true)
    expect(shown.owners).toBeNull()
    // Det vanliga tillståndet innehåller inga händer.
    const publicJson = JSON.stringify(host.state)
    expect(host.secrets.hands.b.some((card) => publicJson.includes(`"${card}"`))).toBe(false)

    host = move(host, 'a', { type: 'judge', key: 'k1' }, ABC)
    expect(Object.values(host.state.cards!.owners!).sort()).toEqual(['b', 'c'])
  })

  it('visar ett blankt kort som ett vanligt kort och låter det användas en gång', () => {
    let host = timeout(match(), ABC)
    host = move(host, 'b', { type: 'pick', pick: { kind: 'blank', text: '  Grannens   robotgräsklippare. ' }, done: true }, ABC)
    host = pickFirst(host, 'c', ABC)
    expect(host.state.cards!.submissions.map((s) => s.text)).toContain('Grannens robotgräsklippare')
    expect(myHand(host.secrets, 'b')!.blank).toBe(false)
    expect(host.secrets.hands.b).toHaveLength(7)

    host = timeout(timeout(move(host, 'a', { type: 'judge', key: 'k1' }, ABC), ABC), ABC)
    const again = move(host, 'c', { type: 'pick', pick: { kind: 'blank', text: 'Något' } }, ABC)
    expect(again.state.cards!.chosen).toContain('c')
    expect(move(again, 'b', { type: 'pick', pick: { kind: 'blank', text: 'Igen' } }, ABC)).toBe(again)
  })

  it('kortar ett blankt kort till 60 tecken och tar inte emot ett tomt', () => {
    expect(cleanBlank('x'.repeat(80), 60)).toHaveLength(60)
    const host = timeout(match(), ABC)
    expect(move(host, 'b', { type: 'pick', pick: { kind: 'blank', text: '   ' } }, ABC)).toBe(host)
  })
})

describe('poäng', () => {
  it('ger vinnaren en poäng och sparar den vinnande meningen', () => {
    let host = timeout(match(), ABC)
    host = pickFirst(pickFirst(host, 'b', ABC), 'c', ABC)
    const key = Object.keys(host.secrets.submitted).find((k) => host.secrets.submitted[k].player === 'c')!
    host = move(host, 'a', { type: 'judge', key }, ABC)
    expect(host.state.scores).toEqual({ a: 0, b: 0, c: 1 })
    expect(host.state.cards!.wins).toEqual([
      expect.objectContaining({ round: 1, player: 'c', asleep: false }),
    ])
  })

  it('slumpar ett vinnarkort när domaren somnar', () => {
    let host = timeout(match(), ABC)
    host = pickFirst(pickFirst(host, 'b', ABC), 'c', ABC)
    host = timeout(host, ABC)
    expect(host.state.cards!.step).toBe('reveal')
    expect(host.state.cards!.judgeAsleep).toBe(true)
    expect(Object.values(host.state.scores).reduce((a, b) => a + b)).toBe(1)
  })

  it('slutar efter sista rundan', () => {
    let host = match(ABC, 5)
    for (let round = 0; round < 5; round++) host = timeout(playRound(host, ABC), ABC)
    expect(host.state.phase).toBe('finished')
    expect(host.state.cards!.wins).toHaveLength(5)
  })

  it('går vidare när värden klickar, men bara en gång', () => {
    const host = playRound(match(), ABC)
    const next = advanceCardReveal(host, RULES, NOW, 1, ABC)
    expect(next.state.round).toBe(2)
    expect(advanceCardReveal(next, RULES, NOW, 1, ABC)).toBe(next)
  })
})

describe('undantag', () => {
  it('gör om rundan med ett nytt frågekort och samma domare när färre än två kort kommer in', () => {
    let host = timeout(match(), ABC)
    const firstPrompt = host.state.cards!.prompt
    host = timeout(pickFirst(host, 'b', ABC), ABC)
    expect(host.state.cards).toMatchObject({ step: 'question', judge: 'a', retried: true })
    expect(host.state.round).toBe(1)
    expect(host.state.cards!.prompt).not.toBe(firstPrompt)
    // b får behålla kortet.
    expect(host.secrets.hands.b).toHaveLength(7)
  })

  it('går vidare utan poäng om det händer igen', () => {
    let host = timeout(timeout(match(), ABC), ABC)
    host = timeout(timeout(host, ABC), ABC)
    expect(host.state.cards).toMatchObject({ step: 'reveal', skipped: true, winner: null })
    expect(host.state.scores).toEqual({ a: 0, b: 0, c: 0 })
    host = timeout(host, ABC)
    expect(host.state.round).toBe(2)
    expect(host.state.cards!.retried).toBe(false)
  })

  it('låter nästa spelare ta över när domaren lämnar, och den får tillbaka sitt kort', () => {
    const all = ['a', 'b', 'c', 'd']
    let host = timeout(match(all), all)
    host = pickFirst(host, 'b', all, true)
    const left = ['b', 'c', 'd']
    host = cardPresence(host, RULES, left, NOW, fixed)
    expect(host.state.cards!.judge).toBe('b')
    expect(host.state.cards!.done).toEqual([])
    expect(myHand(host.secrets, 'b')!.pick).toBeNull()
  })

  it('tar bort den nya domarens kort om domaren lämnar medan den väljer', () => {
    const all = ['a', 'b', 'c', 'd']
    let host = timeout(match(all), all)
    for (const id of ['b', 'c', 'd']) host = pickFirst(host, id, all)
    expect(host.state.cards!.step).toBe('judging')
    host = cardPresence(host, RULES, ['b', 'c', 'd'], NOW, fixed)
    expect(host.state.cards!.judge).toBe('b')
    expect(host.state.cards!.submissions).toHaveLength(2)
    expect(Object.values(host.secrets.submitted).map((s) => s.player)).not.toContain('b')
    expect(host.secrets.hands.b).toHaveLength(7)
  })

  it('avslutar matchen när färre än tre spelare är kvar', () => {
    const host = timeout(match(), ABC)
    expect(cardPresence(host, RULES, ['a', 'b'], NOW, fixed).state.phase).toBe('finished')
  })

  it('ger en ny spelare en hand och sätter den sist i domarordningen', () => {
    const host = match()
    const joined = { ...host, state: addPlayers(host.state, { e: { name: 'E', avatar: '👻' } }) }
    const next = cardPresence(joined, RULES, ['a', 'b', 'c', 'e'], NOW, fixed)
    expect(next.state.cards!.order).toEqual(['a', 'b', 'c', 'e'])
    expect(next.secrets.hands.e).toHaveLength(7)
    const all = Object.values(next.secrets.hands).flat()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('frågan med svaret', () => {
  it('sätter svaret i luckan med stor bokstav bara i början av en mening', () => {
    expect(fillPrompt('Det bästa med fikat är ___.', 'grannens kanelbullar')).toBe(
      'Det bästa med fikat är grannens kanelbullar.',
    )
    expect(fillPrompt('___: det nya sättet att fira midsommar.', 'en bastu på hjul')).toBe(
      'En bastu på hjul: det nya sättet att fira midsommar.',
    )
    expect(fillPrompt('Ingen pratar om det. ___ igen.', 'sill')).toBe('Ingen pratar om det. Sill igen.')
  })
})
