import { describe, expect, it } from 'vitest'
import { GAMES } from '@/lib/games'
import { GAP, myHand, type CardSecrets } from '@/lib/kort'
import kort from '@/lib/kortkaos.json'
import { bestCard, kortkaosRules, sentence } from '@/lib/kortkaos'
import {
  addPlayers,
  backToWaiting,
  canStart,
  tooManyPlayers,
  hostAdvance,
  hostDeadline,
  hostMove,
  hostPresence,
  hostStart,
  initialState,
  roundOptionsFor,
  setGame,
  type HostState,
} from '@/lib/match'

const NOW = 1_000_000
const ABC = ['a', 'b', 'c']

function lobby(ids = ABC, rounds?: number): HostState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id.toUpperCase(), avatar: '👻' }]))
  const state = addPlayers(initialState('kortkaos'), players)
  return { state: rounds ? { ...state, rounds } : state, secrets: null }
}

function timeout(host: HostState, active = ABC): HostState {
  const deadline = host.state.deadline!
  return hostDeadline(host, deadline, deadline, active, () => 0)
}

// Kortkaos hemliga data (värden har antingen ett kortspels eller Imposterjaktens).
const cards = (host: HostState) => host.secrets as CardSecrets

// En hel runda: alla utom domaren lägger sitt första kort, domaren väljer det första.
function playRound(host: HostState, active = ABC): HostState {
  let next = timeout(host, active)
  for (const id of active) {
    if (id === next.state.cards!.judge) continue
    const card = cards(next).hands[id][0]
    next = hostMove(next, id, { type: 'pick', pick: { kind: 'card', card }, done: true }, active, NOW, () => 0)
  }
  return hostMove(next, next.state.cards!.judge, { type: 'judge', key: 'k1' }, active, NOW)
}

describe('högst 9 spelare i Kortkaos', () => {
  it('går att starta med 9 men inte med 10', () => {
    expect(canStart('kortkaos', 9)).toBe(true)
    expect(canStart('kortkaos', 10)).toBe(false)
    expect(tooManyPlayers('kortkaos', 9)).toBe(false)
    expect(tooManyPlayers('kortkaos', 10)).toBe(true)
  })

  it('spärren gäller bara Kortkaos', () => {
    expect(canStart('gissa-priset', 13)).toBe(true)
    expect(canStart('imposterjakten', 11)).toBe(true)
    expect(tooManyPlayers('narmast', 20)).toBe(false)
  })
})

describe('korten', () => {
  it('har 60 frågor och 150 svar utan dubbletter', () => {
    expect(kort.fragor).toHaveLength(60)
    expect(kort.svar).toHaveLength(150)
    expect(new Set(kort.fragor).size).toBe(60)
    expect(new Set(kort.svar).size).toBe(150)
  })

  it('har mjuka bindestreck i alla ord på minst 10 bokstäver, så att de bara bryts mellan orddelarna', () => {
    const SHY = '­'
    for (const text of [...kort.fragor, ...kort.svar]) {
      for (const word of text.split(/[^A-Za-zÅÄÖåäöéÉüÜ­]+/)) {
        const letters = word.replaceAll(SHY, '')
        if (letters.length >= 10) expect(word, text).toContain(SHY)
        // Aldrig först eller sist i ett ord, och aldrig två i rad.
        expect(word.startsWith(SHY) || word.endsWith(SHY) || word.includes(SHY + SHY), text).toBe(false)
      }
    }
    expect(kort.svar).toContain('ett rump­avtryck i snön')
  })

  it('har exakt en lucka i varje fråga och inga luckor i svaren', () => {
    expect(kort.fragor.filter((f) => f.split(GAP).length !== 2)).toEqual([])
    expect(kort.svar.filter((s) => s.includes('_') || s.trim() !== s || s.endsWith('.'))).toEqual([])
  })

  it('fyller i luckan så att man ser hela meningen', () => {
    // De mjuka bindestrecken syns inte och läses inte upp.
    expect(sentence({ prompt: 'f7', text: 'en ensam inlagd sill' }).replaceAll('­', '')).toBe(
      'Hemligheten bakom farmors kanelbullar är en ensam inlagd sill.',
    )
  })
})

describe('lobbyn', () => {
  it('har 5, 8 eller 10 rundor med 8 som förval', () => {
    expect(roundOptionsFor('kortkaos')).toEqual([5, 8, 10])
    expect(initialState('kortkaos').rounds).toBe(8)
    expect(setGame(initialState('narmast'), 'kortkaos').rounds).toBe(8)
    expect(setGame(initialState('kortkaos'), 'narmast').rounds).toBe(5)
  })

  it('kräver minst tre spelare och har ingen provomgång', () => {
    expect(canStart('kortkaos', 1)).toBe(false)
    expect(canStart('kortkaos', 2)).toBe(false)
    expect(canStart('kortkaos', 3)).toBe(true)
    expect(hostStart(lobby(['a', 'b']), ['a', 'b'], NOW).state.phase).toBe('waiting')
  })
})

describe('en match', () => {
  it('delar ut 7 riktiga kort till alla och visar frågekortet i 8 sekunder', () => {
    const host = hostStart(lobby(), ABC, NOW)
    expect(host.state.phase).toBe('playing')
    expect(host.state.deadline).toBe(NOW + 8_000)
    expect(kortkaosRules.promptText(host.state.cards!.prompt)).toContain(GAP)
    for (const id of ABC) {
      const hand = myHand(cards(host), id)!
      expect(hand.cards).toHaveLength(7)
      expect(hand.cards.every((card) => kortkaosRules.answerText(card))).toBe(true)
    }
  })

  it('räknas i topplistan och lämnar inget hemligt kvar efteråt', () => {
    let host = hostStart(lobby(ABC, 5), ABC, NOW)
    for (let round = 0; round < 5; round++) host = timeout(playRound(host))
    expect(host.state.phase).toBe('finished')
    expect(host.secrets).toBeNull()
    expect(host.state.matchesPlayed).toBe(1)
    expect(Object.values(host.state.scores).reduce((a, b) => a + b)).toBe(5)
    expect(backToWaiting(host.state).cards).toBeNull()
  })

  it('slutar och visar ställningen när färre än tre spelare är kvar', () => {
    const host = playRound(hostStart(lobby(), ABC, NOW))
    const ended = hostPresence(host, ['a', 'b'], NOW)
    expect(ended.state.phase).toBe('finished')
    expect(ended.state.round).toBe(1)
    expect(ended.secrets).toBeNull()
  })
})

describe('matchens bästa kort', () => {
  const table = {
    ...hostStart(lobby(), ABC, NOW).state.cards!,
    wins: [
      { round: 1, prompt: 'f0', text: 'lottad', player: 'a', asleep: true },
      { round: 2, prompt: 'f1', text: 'första', player: 'b', asleep: false },
      { round: 3, prompt: 'f2', text: 'vinnarens', player: 'c', asleep: false },
      { round: 4, prompt: 'f3', text: 'vinnarens andra', player: 'c', asleep: false },
    ],
  }

  it('är den första meningen som domaren valde från matchens vinnare', () => {
    expect(bestCard(table, ['c'])?.text).toBe('vinnarens')
  })

  it('tar den första vid delad seger och hoppar över lottade vinster', () => {
    expect(bestCard(table, ['a', 'b', 'c'])?.text).toBe('första')
    expect(bestCard({ ...table, wins: table.wins.slice(0, 1) }, ['a'])).toBeNull()
  })
})

describe('antal spelare', () => {
  // Kortleken har 150 svarskort. Samma kort kommer aldrig tillbaka i en match, så den som har för många spelare
  // får färre kort på handen mot slutet.
  function smallestHand(players: number, rounds: number): number {
    const ids = Array.from({ length: players }, (_, i) => `p${i}`)
    let host = hostStart(lobby(ids, rounds), ids, NOW, () => 0)
    let smallest = Infinity
    for (let round = 1; round <= rounds && host.state.phase === 'playing'; round++) {
      smallest = Math.min(smallest, ...ids.map((id) => cards(host).hands[id].length))
      host = playRound(host, ids)
      host = hostAdvance(host, NOW, round, ids)
    }
    return smallest
  }

  it('kortleken räcker till det största antalet spelare på spelkortet, oavsett antal rundor', () => {
    const max = GAMES.find((game) => game.id === 'kortkaos')!.maxPlayers!
    for (const rounds of roundOptionsFor('kortkaos')) {
      expect(smallestHand(max, rounds)).toBe(kortkaosRules.handSize)
    }
    // Med fler spelare tar korten slut mot slutet, så det går inte att starta.
    expect(canStart('kortkaos', max + 1)).toBe(false)
  })
})
