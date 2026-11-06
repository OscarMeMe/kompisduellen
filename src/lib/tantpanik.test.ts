import { describe, expect, it } from 'vitest'
import { hostDeadline, hostMove, hostStart, initialState, type GameState, type HostState } from '@/lib/match'
import { parseMove, parseStateMessage, parseTantView } from '@/lib/meddelanden'
import {
  countAllCards,
  dealTant,
  deckTypes,
  isCombo,
  myTantView,
  setTantSettings,
  startTantMatch,
  sync,
  tantDeadline,
  tantMove,
  type TantHost,
  type TantMove,
  type TantSecrets,
  type TantTable,
} from '@/lib/tantpanik'
import { CARDS, type CardType } from '@/lib/tantpanik-kort'

// Styrbar slump (mulberry32), så att testerna blir likadana varje gång.
function seeded(seed = 1): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lobby(count: number, trap = true): GameState {
  const state = initialState('tantpanik')
  const players: GameState['players'] = {}
  for (let i = 1; i <= count; i++) players[`p${i}`] = { name: `Spelare ${i}`, avatar: '🙂' }
  return { ...state, players, tantSettings: { trap } }
}

// En match med bestämda händer och draghög (överst först). Spelarna sitter i den ordning händerna står, och den första
// har tur.
function setup(hands: Record<string, CardType[]>, deck: CardType[], options: { trap?: boolean } = {}): TantHost {
  const ids = Object.keys(hands)
  const base = lobby(0, options.trap ?? true)
  const players = Object.fromEntries(ids.map((id, i) => [id, { name: `Spelare ${i + 1}`, avatar: '🙂' }]))
  const started = startTantMatch({ ...base, players }, seeded(7))
  let n = 0
  const card = (type: CardType) => ({ id: `c${++n}`, type })
  const secrets: TantSecrets = {
    ...started.secrets,
    deck: deck.map(card),
    hands: Object.fromEntries(ids.map((id) => [id, hands[id].map(card)])),
    discard: [],
    removed: [],
  }
  const table: TantTable = {
    ...started.state.tantpanik!,
    order: ids,
    current: ids[0],
    turnsLeft: 1,
    attacked: false,
    out: [],
  }
  return sync({ state: { ...started.state, tantpanik: table }, secrets })
}

const random = seeded(3)
let moveNr = 0
function move(host: TantHost, player: string, m: TantMove, now = 1000): TantHost {
  moveNr += 1
  return tantMove(host, player, m, `nr${moveNr}`, now, random)
}

// Låter Nä du!-tiden gå ut.
function settle(host: TantHost): TantHost {
  const deadline = host.state.deadline
  if (deadline === null) return host
  return tantDeadline(host, deadline, deadline, random)
}

function cardId(host: TantHost, player: string, type: CardType, skip = 0): string {
  const found = host.secrets.hands[player].filter((card) => card.type === type)[skip]
  if (!found) throw new Error(`${player} har ingen ${type}`)
  return found.id
}

function play(host: TantHost, player: string, types: CardType[], extra: { target?: string; request?: CardType } = {}): TantHost {
  const used: Record<string, number> = {}
  const cards = types.map((type) => {
    used[type] = (used[type] ?? 0) + 1
    return cardId(host, player, type, used[type] - 1)
  })
  return move(host, player, {
    type: 'tPlay',
    cards,
    target: extra.target ?? null,
    request: extra.request ?? null,
  })
}

const table = (host: TantHost) => host.state.tantpanik!
const types = (host: TantHost, player: string) => host.secrets.hands[player].map((card) => card.type).sort()

function expectSameCount(before: TantHost, after: TantHost) {
  expect(countAllCards(after.secrets)).toBe(countAllCards(before.secrets))
}

describe('leken och utdelningen', () => {
  for (let players = 2; players <= 10; players++) {
    for (const trap of [true, false]) {
      it(`${players} spelare, fällor ${trap ? 'på' : 'av'}`, () => {
        const ids = Array.from({ length: players }, (_, i) => `p${i}`)
        const { deck, hands } = dealTant(ids, trap, seeded(players))
        for (const id of ids) {
          expect(hands[id]).toHaveLength(8)
          expect(hands[id].filter((card) => card.type === 'fika').length).toBeGreaterThanOrEqual(1)
          expect(hands[id].some((card) => card.type === 'tant')).toBe(false)
        }
        expect(deck.filter((card) => card.type === 'tant')).toHaveLength(players - 1)
        const total = deck.length + ids.reduce((sum, id) => sum + hands[id].length, 0)
        expect(total).toBe(deckTypes(players, trap).length + players - 1)
        const all = [...deck, ...ids.flatMap((id) => hands[id])]
        expect(all.filter((card) => card.type === 'snara')).toHaveLength(trap ? 2 : 0)
        expect(new Set(all.map((card) => card.id)).size).toBe(all.length)
      })
    }
  }

  it('kortgrupperna följer antalet spelare', () => {
    expect(deckTypes(3, false)).toHaveLength(44)
    expect(deckTypes(4, false)).toHaveLength(67)
    expect(deckTypes(8, false)).toHaveLength(111)
  })

  it('startar via värdens funktioner och kräver 2–10 spelare', () => {
    const host: HostState = { state: lobby(4), secrets: null }
    const started = hostStart(host, ['p1', 'p2', 'p3', 'p4'], 0, seeded(1))
    expect(started.state.phase).toBe('playing')
    expect(started.state.tantpanik?.deckCount).toBeGreaterThan(0)
    expect(hostStart({ state: lobby(1), secrets: null }, ['p1'], 0).state.phase).toBe('waiting')
    expect(
      hostStart(
        { state: lobby(11), secrets: null },
        Array.from({ length: 11 }, (_, i) => `p${i + 1}`),
        0,
      ).state.phase,
    ).toBe('waiting')
  })

  it('Tantsnaran går att slå av i väntrummet', () => {
    const state = setTantSettings(initialState('tantpanik'), { trap: false })
    expect(state.tantSettings.trap).toBe(false)
  })
})

describe('drag, utslagning och vinst', () => {
  it('ett vanligt drag lägger kortet på handen och ger turen vidare', () => {
    let host = setup({ a: ['fika'], b: ['fika'] }, ['bingo', 'kaffe', 'tant'])
    const before = host
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['bingo', 'fika'])
    expect(table(host).current).toBe('b')
    expect(table(host).deckCount).toBe(2)
    expectSameCount(before, host)
  })

  it('bara den som har tur får dra', () => {
    const host = setup({ a: [], b: [] }, ['bingo'])
    expect(table(move(host, 'b', { type: 'tDraw' }))).toEqual({
      ...table(host),
      log: table(host).log,
    })
  })

  it('Inte min tur avslutar turen utan drag', () => {
    let host = setup({ a: ['intemin'], b: [] }, ['bingo'])
    host = settle(play(host, 'a', ['intemin']))
    expect(table(host).current).toBe('b')
    expect(table(host).deckCount).toBe(1)
  })

  it('Dra underifrån tar det understa kortet', () => {
    let host = setup({ a: ['underifran'], b: [] }, ['tant', 'bingo'])
    host = settle(play(host, 'a', ['underifran']))
    expect(types(host, 'a')).toEqual(['bingo'])
    expect(table(host).current).toBe('b')
  })

  it('med tom hand drar man ändå', () => {
    let host = setup({ a: [], b: [] }, ['bingo', 'kaffe'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['bingo'])
  })

  it('utan Fikapaus åker man ut, och sist kvar vinner', () => {
    let host = setup({ a: ['bingo'], b: ['fika'] }, ['tant', 'kaffe'])
    const before = host
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(host).out).toEqual(['a'])
    expect(table(host).winner).toBe('b')
    expect(host.state.phase).toBe('finished')
    expect(host.state.scores).toEqual({ a: 1, b: 2 })
    expect(host.secrets.removed.map((card) => card.type)).toEqual(['bingo'])
    expectSameCount(before, host)
  })

  it('utslagen under extraturer: nästa som är kvar får en vanlig tur', () => {
    let host = setup({ a: ['dubbelpass'], b: [], c: [] }, ['tant', 'bingo', 'kaffe'])
    host = settle(play(host, 'a', ['dubbelpass']))
    expect(table(host).current).toBe('b')
    expect(table(host).turnsLeft).toBe(2)
    host = move(host, 'b', { type: 'tDraw' })
    expect(table(host).out).toEqual(['b'])
    expect(table(host).current).toBe('c')
    expect(table(host).turnsLeft).toBe(1)
  })

  it('genom hela värdens flöde i match.ts', () => {
    const start = setup({ a: [], b: ['fika'] }, ['tant'])
    let host: HostState = start
    host = hostMove(host, 'a', { type: 'tDraw' }, ['a', 'b'], 0, random, 'x1')
    expect(host.state.phase).toBe('finished')
    expect(host.secrets).toBeNull()
    expect(host.state.leaderboard.b.wins).toBe(1)
  })
})

describe('Fikapaus och att gömma tanten', () => {
  for (const [label, position, deck] of [
    ['överst', 0, ['bingo', 'kaffe']],
    ['mitt i', 1, ['bingo', 'kaffe']],
    ['underst', 2, ['bingo', 'kaffe']],
    ['i en tom hög', 0, []],
  ] as [string, number, CardType[]][]) {
    it(`gömmer tanten ${label}`, () => {
      let host = setup({ a: ['fika'], b: [] }, ['tant', ...deck])
      const before = host
      host = move(host, 'a', { type: 'tDraw' })
      expect(table(host).step).toBe('place')
      expect(types(host, 'a')).toEqual([])
      host = move(host, 'a', { type: 'tPlace', position })
      expect(host.secrets.deck.map((card) => card.type)[position]).toBe('tant')
      expect(table(host).current).toBe('b')
      expectSameCount(before, host)
    })
  }

  it('en plats utanför högen går inte', () => {
    let host = setup({ a: ['fika'], b: [] }, ['tant', 'bingo'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(move(host, 'a', { type: 'tPlace', position: 5 })).step).toBe('place')
  })

  it('bara en Fikapaus används, och turer kvar finns kvar', () => {
    let host = setup({ x: ['dubbelpass'], a: ['fika', 'fika'], b: [] }, ['tant', 'bingo', 'kaffe'])
    host = settle(play(host, 'x', ['dubbelpass']))
    expect(table(host).current).toBe('a')
    host = move(host, 'a', { type: 'tDraw' })
    host = move(host, 'a', { type: 'tPlace', position: 2 })
    expect(types(host, 'a')).toEqual(['fika'])
    expect(table(host).current).toBe('a')
    expect(table(host).turnsLeft).toBe(1)
  })
})

describe('attacker och turer', () => {
  it('Dubbelpass ger nästa två turer', () => {
    let host = setup({ a: ['dubbelpass'], b: [], c: [] }, ['bingo', 'kaffe', 'bingo'])
    host = settle(play(host, 'a', ['dubbelpass']))
    expect(table(host)).toMatchObject({
      current: 'b',
      turnsLeft: 2,
      attacked: true,
    })
    host = move(host, 'b', { type: 'tDraw' })
    expect(table(host)).toMatchObject({ current: 'b', turnsLeft: 1 })
    host = move(host, 'b', { type: 'tDraw' })
    expect(table(host)).toMatchObject({
      current: 'c',
      turnsLeft: 1,
      attacked: false,
    })
  })

  it('attack direkt tillbaka ger fyra turer', () => {
    let host = setup({ a: ['dubbelpass'], b: ['dubbelpass'] }, ['bingo'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['dubbelpass']))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 4 })
  })

  it('efter en avklarad attacktur ger nästa attack tre turer', () => {
    let host = setup({ a: ['dubbelpass'], b: ['dubbelpass'] }, ['bingo', 'kaffe'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = move(host, 'b', { type: 'tDraw' })
    host = settle(play(host, 'b', ['dubbelpass']))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 3 })
  })

  it('Du där! följer samma regler och går till den man väljer', () => {
    let host = setup({ a: ['dudar'], b: ['dudar'], c: [] }, ['bingo'])
    host = settle(play(host, 'a', ['dudar'], { target: 'c' }))
    expect(table(host)).toMatchObject({ current: 'c', turnsLeft: 2 })
    host = setup({ a: ['dubbelpass'], b: ['dudar'], c: [] }, ['bingo'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['dudar'], { target: 'a' }))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 4 })
  })

  it('Du där! på sig själv går inte', () => {
    const host = setup({ a: ['dudar'], b: [] }, ['bingo'])
    expect(table(play(host, 'a', ['dudar'], { target: 'a' })).step).toBe('turn')
  })

  it('Inte min tur tar bara en av turerna', () => {
    let host = setup({ a: ['dubbelpass'], b: ['intemin', 'intemin'], c: [] }, ['bingo'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['intemin']))
    expect(table(host)).toMatchObject({ current: 'b', turnsLeft: 1 })
    host = settle(play(host, 'b', ['intemin']))
    expect(table(host)).toMatchObject({ current: 'c', turnsLeft: 1 })
  })
})

describe('Nä du!', () => {
  it('stoppar ett kort, och ett andra Nä du! släpper igenom det', () => {
    let host = setup({ a: ['blanda', 'nadu'], b: ['nadu'] }, ['bingo', 'kaffe'])
    host = play(host, 'a', ['blanda'])
    expect(table(host).step).toBe('window')
    host = move(host, 'b', {
      type: 'tNope',
      card: cardId(host, 'b', 'nadu'),
      level: 0,
    })
    expect(table(host).pending?.nopes).toBe(1)
    host = move(host, 'a', {
      type: 'tNope',
      card: cardId(host, 'a', 'nadu'),
      level: 1,
    })
    expect(table(host).pending?.nopes).toBe(2)
    host = settle(host)
    expect(table(host).log.at(-1)?.text).toBe('Högen är blandad.')
  })

  it('en stoppad attack lämnar turen kvar', () => {
    let host = setup({ a: ['dubbelpass'], b: ['nadu'] }, ['bingo'])
    host = play(host, 'a', ['dubbelpass'])
    host = settle(
      move(host, 'b', {
        type: 'tNope',
        card: cardId(host, 'b', 'nadu'),
        level: 0,
      }),
    )
    expect(table(host)).toMatchObject({
      current: 'a',
      turnsLeft: 1,
      step: 'turn',
    })
  })

  it('en stoppad stöld förbrukar korten utan att något stjäls', () => {
    let host = setup({ a: ['bingo', 'bingo'], b: ['nadu', 'kaffe'] }, ['bingo'])
    const before = host
    host = play(host, 'a', ['bingo', 'bingo'], { target: 'b' })
    host = settle(
      move(host, 'b', {
        type: 'tNope',
        card: cardId(host, 'b', 'nadu'),
        level: 0,
      }),
    )
    expect(types(host, 'a')).toEqual([])
    expect(types(host, 'b')).toEqual(['kaffe'])
    expect(host.secrets.discard.map((card) => card.type)).toEqual(['bingo', 'bingo', 'nadu'])
    expectSameCount(before, host)
  })

  it('går inte att spela när kortet redan hänt', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'] }, ['bingo'])
    host = settle(play(host, 'a', ['blanda']))
    const after = move(host, 'b', {
      type: 'tNope',
      card: cardId(host, 'b', 'nadu'),
      level: 0,
    })
    expect(types(after, 'b')).toEqual(['nadu'])
  })

  it('två Nä du! samtidigt: bara det första räknas, det andra gäller en gammal kedja', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'], c: ['nadu'] }, ['bingo'])
    host = play(host, 'a', ['blanda'])
    host = move(host, 'b', {
      type: 'tNope',
      card: cardId(host, 'b', 'nadu'),
      level: 0,
    })
    host = move(host, 'c', {
      type: 'tNope',
      card: cardId(host, 'c', 'nadu'),
      level: 0,
    })
    expect(table(host).pending?.nopes).toBe(1)
    expect(types(host, 'c')).toEqual(['nadu'])
  })

  it('varje Nä du! börjar om tiden, och en gammal klocka gör inget', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'] }, ['bingo'])
    host = play(host, 'a', ['blanda'])
    const first = host.state.deadline!
    host = move(host, 'b', { type: 'tNope', card: cardId(host, 'b', 'nadu'), level: 0 }, 3000)
    expect(host.state.deadline).toBe(8000)
    expect(tantDeadline(host, first, first, random)).toBe(host)
  })

  it('vanliga drag går inte medan ett kort väntar', () => {
    let host = setup({ a: ['blanda'], b: [] }, ['bingo'])
    host = play(host, 'a', ['blanda'])
    expect(table(move(host, 'a', { type: 'tDraw' })).deckCount).toBe(1)
  })

  it('går via värdens klocka i match.ts', () => {
    let host: HostState = setup({ a: ['intemin'], b: [] }, ['bingo'])
    host = hostMove(host, 'a', { type: 'tPlay', cards: [cardId(host as TantHost, 'a', 'intemin')] }, [], 0, random, 'm1')
    host = hostDeadline(host, host.state.deadline!, host.state.deadline!, [], random)
    expect(host.state.tantpanik?.current).toBe('b')
  })
})

describe('titta, möblera och blanda', () => {
  it('Tjuvkika visar de tre översta i ordning, bara för den som spelade', () => {
    let host = setup({ a: ['tjuvkika'], b: [] }, ['bingo', 'tant', 'kaffe', 'stickning'])
    const deck = host.secrets.deck.map((card) => card.id)
    host = settle(play(host, 'a', ['tjuvkika']))
    expect(myTantView(host.secrets, table(host), 'a').peek).toEqual(['bingo', 'tant', 'kaffe'])
    expect(myTantView(host.secrets, table(host), 'b').peek).toBeNull()
    expect(host.secrets.deck.map((card) => card.id)).toEqual(deck)
  })

  it('Tjuvkika med färre än tre kort visar de som finns', () => {
    let host = setup({ a: ['tjuvkika'], b: [] }, ['kaffe'])
    host = settle(play(host, 'a', ['tjuvkika']))
    expect(myTantView(host.secrets, table(host), 'a').peek).toEqual(['kaffe'])
  })

  it('Möblera om ändrar bara de översta korten', () => {
    let host = setup({ a: ['mobblera'], b: [] }, ['bingo', 'tant', 'kaffe', 'stickning', 'tradgard'])
    const before = host
    host = settle(play(host, 'a', ['mobblera']))
    expect(table(host).step).toBe('arrange')
    expect(myTantView(host.secrets, table(host), 'a').arrange).toEqual(['bingo', 'tant', 'kaffe'])
    expectSameCount(before, host)
    host = move(host, 'a', { type: 'tArrange', order: [2, 0, 1] })
    expect(host.secrets.deck.map((card) => card.type)).toEqual(['kaffe', 'bingo', 'tant', 'stickning', 'tradgard'])
    expect(table(host).step).toBe('turn')
    expect(table(host).current).toBe('a')
  })

  it('Möblera om med två kort, och en felaktig ordning går inte', () => {
    let host = setup({ a: ['mobblera'], b: [] }, ['bingo', 'tant'])
    host = settle(play(host, 'a', ['mobblera']))
    expect(table(move(host, 'a', { type: 'tArrange', order: [0, 0] })).step).toBe('arrange')
    host = move(host, 'a', { type: 'tArrange', order: [1, 0] })
    expect(host.secrets.deck.map((card) => card.type)).toEqual(['tant', 'bingo'])
  })

  it('Blanda om behåller korten', () => {
    let host = setup({ a: ['blanda'], b: [] }, ['bingo', 'tant', 'kaffe', 'stickning', 'tradgard', 'vild'])
    const sorted = host.secrets.deck.map((card) => card.id).sort()
    host = settle(play(host, 'a', ['blanda']))
    expect(host.secrets.deck.map((card) => card.id).sort()).toEqual(sorted)
  })
})

describe('par, tretal, jokrar och tjänster', () => {
  it('ett par tar ett slumpat kort från målet', () => {
    let host = setup({ a: ['kaffe', 'kaffe'], b: ['bingo', 'tjuvkika'] }, ['bingo'])
    const before = host
    host = settle(play(host, 'a', ['kaffe', 'kaffe'], { target: 'b' }))
    expect(host.secrets.hands.a).toHaveLength(1)
    expect(host.secrets.hands.b).toHaveLength(1)
    expectSameCount(before, host)
  })

  it('ett par av vanliga kort med samma titel går också', () => {
    let host = setup({ a: ['blanda', 'blanda'], b: ['bingo'] }, ['bingo'])
    host = settle(play(host, 'a', ['blanda', 'blanda'], { target: 'b' }))
    expect(types(host, 'a')).toEqual(['bingo'])
  })

  it('tretal: träff ger kortet, miss ger inget', () => {
    let host = setup(
      {
        a: ['bingo', 'bingo', 'bingo', 'kaffe', 'kaffe', 'kaffe'],
        b: ['fika', 'tradgard'],
      },
      ['bingo'],
    )
    host = settle(
      play(host, 'a', ['bingo', 'bingo', 'bingo'], {
        target: 'b',
        request: 'fika',
      }),
    )
    expect(types(host, 'a')).toContain('fika')
    expect(types(host, 'b')).toEqual(['tradgard'])
    host = {
      ...host,
      state: { ...host.state, tantpanik: { ...table(host), current: 'a' } },
    }
    host = settle(
      play(host, 'a', ['kaffe', 'kaffe', 'kaffe'], {
        target: 'b',
        request: 'nadu',
      }),
    )
    expect(types(host, 'b')).toEqual(['tradgard'])
    expect(table(host).log.at(-1)?.text).toBe('Spelare 2 hade ingen Nä du!.')
  })

  it('jokrar kräver en riktig tant och matchar aldrig andra kort', () => {
    expect(isCombo(['bingo', 'vild'])).toBe(true)
    expect(isCombo(['vild', 'bingo', 'vild'])).toBe(true)
    expect(isCombo(['vild', 'vild'])).toBe(false)
    expect(isCombo(['vild', 'blanda'])).toBe(false)
    expect(isCombo(['bingo', 'kaffe'])).toBe(false)
    expect(isCombo(['bingo', 'kaffe', 'vild'])).toBe(false)
    expect(isCombo(['blanda', 'blanda'])).toBe(true)
    const host = setup({ a: ['vild', 'blanda'], b: ['bingo'] }, ['bingo'])
    expect(table(play(host, 'a', ['vild', 'blanda'], { target: 'b' })).step).toBe('turn')
  })

  it('stöld från en tom hand går inte att välja', () => {
    const host = setup({ a: ['bingo', 'bingo'], b: [] }, ['bingo'])
    expect(table(play(host, 'a', ['bingo', 'bingo'], { target: 'b' })).step).toBe('turn')
  })

  it('Gör mig en tjänst: målet väljer själv vilket kort', () => {
    let host = setup({ a: ['tjanst'], b: ['nadu', 'bingo'] }, ['bingo'])
    host = settle(play(host, 'a', ['tjanst'], { target: 'b' }))
    expect(table(host)).toMatchObject({
      step: 'give',
      favor: { from: 'b', to: 'a' },
    })
    expect(table(move(host, 'a', { type: 'tGive', card: cardId(host, 'b', 'bingo') })).step).toBe('give')
    host = move(host, 'b', { type: 'tGive', card: cardId(host, 'b', 'bingo') })
    expect(types(host, 'a')).toEqual(['bingo'])
    expect(types(host, 'b')).toEqual(['nadu'])
    expect(table(host)).toMatchObject({ step: 'turn', current: 'a' })
  })
})

describe('Tantsnaran', () => {
  it('slår igen vid ett par och ger ägaren två kort från tjuven', () => {
    let host = setup({ a: ['bingo', 'bingo', 'kaffe', 'tradgard', 'nadu'], b: ['snara'] }, ['bingo'])
    const before = host
    host = settle(play(host, 'a', ['bingo', 'bingo'], { target: 'b' }))
    expect(host.secrets.hands.a).toHaveLength(1)
    expect(host.secrets.hands.b).toHaveLength(2)
    expect(host.secrets.discard.map((card) => card.type)).toContain('snara')
    expect(table(host).log.at(-1)?.text).toContain('Tantsnara!')
    expectSameCount(before, host)
  })

  it('slår igen vid ett tretal som ber om den', () => {
    let host = setup({ a: ['bingo', 'bingo', 'bingo', 'kaffe'], b: ['snara', 'fika'] }, ['bingo'])
    host = settle(
      play(host, 'a', ['bingo', 'bingo', 'bingo'], {
        target: 'b',
        request: 'snara',
      }),
    )
    expect(types(host, 'a')).toEqual([])
    expect(types(host, 'b')).toEqual(['fika', 'kaffe'])
  })

  for (const [left, back] of [
    [2, 2],
    [1, 1],
    [0, 0],
  ]) {
    it(`tjuven har ${left} kort kvar: ägaren får ${back}`, () => {
      const extra: CardType[] = ['kaffe', 'tradgard'].slice(0, left) as CardType[]
      let host = setup({ a: ['bingo', 'bingo', ...extra], b: ['snara'] }, ['bingo'])
      host = settle(play(host, 'a', ['bingo', 'bingo'], { target: 'b' }))
      expect(host.secrets.hands.b).toHaveLength(back)
      expect(host.secrets.hands.a).toHaveLength(left - back)
    })
  }

  it('motstölden utlöser inga nya fällor: en snara hos tjuven blir ett vanligt kort', () => {
    let host = setup({ a: ['bingo', 'bingo', 'snara'], b: ['snara'] }, ['bingo'])
    host = settle(play(host, 'a', ['bingo', 'bingo'], { target: 'b' }))
    expect(types(host, 'b')).toEqual(['snara'])
    expect(host.secrets.discard.filter((card) => card.type === 'snara')).toHaveLength(1)
  })

  it('slår inte igen vid en tjänst eller när den dras', () => {
    let host = setup({ a: ['tjanst'], b: ['snara'] }, ['snara', 'bingo'])
    host = settle(play(host, 'a', ['tjanst'], { target: 'b' }))
    host = move(host, 'b', { type: 'tGive', card: cardId(host, 'b', 'snara') })
    expect(types(host, 'a')).toEqual(['snara'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['snara', 'snara'])
  })
})

describe('hemligheter och dubbla drag', () => {
  it('det alla får se avslöjar inga händer, ingen draghög och inget man tittat på', () => {
    let host = setup({ a: ['tjuvkika', 'fika'], b: ['bingo', 'kaffe'] }, ['tant', 'bingo', 'kaffe', 'tradgard'])
    host = settle(play(host, 'a', ['tjuvkika']))
    host = move(host, 'a', { type: 'tDraw' })
    host = move(host, 'a', { type: 'tPlace', position: 2 })
    const json = JSON.stringify(host.state)
    for (const card of [...host.secrets.deck, ...host.secrets.hands.a, ...host.secrets.hands.b]) expect(json).not.toContain(card.id)
    expect(json).not.toContain('"peek"')
    expect(json).not.toMatch(/position|plats \d/i)
    const bView = JSON.stringify(myTantView(host.secrets, table(host), 'b'))
    for (const card of host.secrets.hands.a) expect(bView).not.toContain(card.id)
  })

  it('läget och mitt eget meddelande går igenom kontrollen', () => {
    const host = setup({ a: ['bingo'], b: ['kaffe'] }, ['tant'])
    const parsed = parseStateMessage({ state: host.state, sentAt: 1 })
    expect(parsed?.state.tantpanik?.current).toBe('a')
    const view = myTantView(host.secrets, table(host), 'a')
    expect(parseTantView({ to: 'a', from: 'h', seq: 1, view })?.view).toEqual(view)
    expect(
      parseTantView({
        to: 'a',
        view: { ...view, hand: [{ id: 1, type: 'bingo' }] },
      }),
    ).toBeNull()
    expect(
      parseMove({
        id: 'a',
        nr: '1',
        move: { type: 'tPlay', cards: ['x'], target: 'b' },
      })?.move,
    ).toEqual({ type: 'tPlay', cards: ['x'], target: 'b', request: null })
    expect(parseMove({ id: 'a', move: { type: 'tPlay', cards: [], target: 'b' } })).toBeNull()
  })

  it('samma drag två gånger räknas bara en gång, och värden visar att draget hanterats', () => {
    let host = setup({ a: [], b: [] }, ['bingo', 'kaffe', 'tradgard'])
    host = tantMove(host, 'a', { type: 'tDraw' }, 'samma', 0, random)
    const again = tantMove(host, 'a', { type: 'tDraw' }, 'samma', 0, random)
    expect(again).toBe(host)
    expect(myTantView(host.secrets, table(host), 'a').handled).toContain('samma')
  })

  it('ett ogiltigt drag ändrar inga kort men syns som hanterat', () => {
    const host = setup({ a: ['bingo'], b: [] }, ['bingo'])
    const after = tantMove(host, 'a', { type: 'tPlay', cards: [cardId(host, 'a', 'bingo')] }, 'fel', 0, random)
    expect(after.secrets.hands).toEqual(host.secrets.hands)
    expect(after.secrets.deck).toEqual(host.secrets.deck)
    expect(myTantView(after.secrets, table(after), 'a').handled).toContain('fel')
    expect(myTantView(after.secrets, table(after), 'a').notice?.text).toBe('Det gick inte just nu.')
  })

  it('ett kort som inte finns på handen går inte att spela', () => {
    const host = setup({ a: ['blanda'], b: ['blanda'] }, ['bingo'])
    const after = move(host, 'a', {
      type: 'tPlay',
      cards: [cardId(host, 'b', 'blanda')],
    })
    expect(table(after).step).toBe('turn')
    expect(types(after, 'b')).toEqual(['blanda'])
  })

  it('en hel match med slumpade drag tappar eller dubblerar aldrig kort', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rnd = seeded(seed)
      let host = startTantMatch(lobby(2 + (seed % 9)), rnd)
      const total = countAllCards(host.secrets)
      for (let step = 0; step < 600 && host.state.phase === 'playing'; step++) {
        const t = table(host)
        const now = step * 10_000
        if (t.step === 'window') host = tantDeadline(host, host.state.deadline!, host.state.deadline!, rnd)
        else if (t.step === 'place')
          host = tantMove(host, t.current, { type: 'tPlace', position: Math.floor(rnd() * (t.deckCount + 1)) }, null, now, rnd)
        else if (t.step === 'arrange')
          host = tantMove(
            host,
            t.current,
            {
              type: 'tArrange',
              order: [...Array(host.secrets.arranging.length).keys()].reverse(),
            },
            null,
            now,
            rnd,
          )
        else if (t.step === 'give')
          host = tantMove(host, t.favor!.from, { type: 'tGive', card: host.secrets.hands[t.favor!.from][0].id }, null, now, rnd)
        else {
          const hand = host.secrets.hands[t.current]
          const action = hand.find((card) => CARDS[card.type].kind === 'action' && card.type !== 'dudar' && card.type !== 'tjanst')
          host =
            action && rnd() < 0.4
              ? tantMove(host, t.current, { type: 'tPlay', cards: [action.id] }, null, now, rnd)
              : tantMove(host, t.current, { type: 'tDraw' }, null, now, rnd)
        }
        expect(table(host).error).toBeNull()
        expect(countAllCards(host.secrets)).toBe(total)
      }
      expect(host.state.phase).toBe('finished')
      expect(table(host).winner).not.toBeNull()
    }
  })
})
