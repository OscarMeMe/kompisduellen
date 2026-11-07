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
  END_MS,
  tantPlacementText,
  type TantHost,
  type TantMove,
  type TantLevel,
  type TantSecrets,
  type TantTable,
  bombCount,
  bombsInDeck,
  levelFor,
  levelLine,
  moveAllowed,
  validTargets,
} from '@/lib/tantpanik'
import { CARDS, NOPE_SECONDS, trapCount, type CardType } from '@/lib/tantpanik-kort'

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

function lobby(count: number, trap = true, level: TantLevel = 'normal'): GameState {
  const state = initialState('tantpanik')
  const players: GameState['players'] = {}
  for (let i = 1; i <= count; i++) players[`p${i}`] = { name: `Spelare ${i}`, avatar: '🙂' }
  return { ...state, players, tantSettings: { trap, level } }
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

// Par: tjuven väljer kortet på plats index bland baksidorna.
function pick(host: TantHost, index = 0): TantHost {
  const chooser = table(host).pick?.by
  if (!chooser) throw new Error('Ingen väljer ett kort')
  return move(host, chooser, { type: 'tPick', index })
}

// Låter Nope!-tiden gå ut.
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
        expect(all.filter((card) => card.type === 'snara')).toHaveLength(trap ? trapCount(players) : 0)
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
    let host = setup({ a: ['fika'], b: ['fika'] }, ['regnbage', 'kupong', 'tant'])
    const before = host
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['fika', 'regnbage'])
    expect(table(host).current).toBe('b')
    expect(table(host).deckCount).toBe(2)
    expectSameCount(before, host)
  })

  it('bara den som har tur får dra', () => {
    const host = setup({ a: [], b: [] }, ['regnbage'])
    expect(table(move(host, 'b', { type: 'tDraw' }))).toEqual({
      ...table(host),
      log: table(host).log,
    })
  })

  it('Hoppa över avslutar turen utan drag', () => {
    let host = setup({ a: ['intemin'], b: [] }, ['regnbage'])
    host = settle(play(host, 'a', ['intemin']))
    expect(table(host).current).toBe('b')
    expect(table(host).deckCount).toBe(1)
  })

  it('Dra underifrån tar det understa kortet', () => {
    let host = setup({ a: ['underifran'], b: [] }, ['tant', 'regnbage'])
    host = settle(play(host, 'a', ['underifran']))
    expect(types(host, 'a')).toEqual(['regnbage'])
    expect(table(host).current).toBe('b')
  })

  it('med tom hand drar man ändå', () => {
    let host = setup({ a: [], b: [] }, ['regnbage', 'kupong'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['regnbage'])
  })

  it('utan Desarmera-kort åker man ut, och sist kvar vinner', () => {
    let host = setup({ a: ['regnbage'], b: ['fika'] }, ['tant', 'kupong'])
    const before = host
    host = move(host, 'a', { type: 'tDraw' }, 1000)
    expect(table(host).out).toEqual(['a'])
    expect(table(host).winner).toBe('b')
    // Vinnaren firas vid bordet en stund innan slutskärmen.
    expect(host.state.phase).toBe('playing')
    expect(host.state.deadline).toBe(1000 + END_MS)
    expect(table(move(host, 'b', { type: 'tDraw' })).deckCount).toBe(table(host).deckCount)
    host = settle(host)
    expect(host.state.phase).toBe('finished')
    expect(host.state.scores).toEqual({ a: 1, b: 2 })
    expect(host.secrets.removed.map((card) => card.type)).toEqual(['regnbage'])
    expectSameCount(before, host)
  })

  it('utslagen under extraturer: nästa som är kvar får en vanlig tur', () => {
    let host = setup({ a: ['dubbelpass'], b: [], c: [] }, ['tant', 'regnbage', 'kupong'])
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
    expect(host.state.phase).toBe('playing')
    host = hostDeadline(host, host.state.deadline!, host.state.deadline!, [], random)
    expect(host.state.phase).toBe('finished')
    expect(host.secrets).toBeNull()
    expect(host.state.leaderboard.b.wins).toBe(1)
  })
})

describe('Desarmera och att gömma tanten', () => {
  for (const [label, position, deck] of [
    ['överst', 0, ['regnbage', 'kupong']],
    ['mitt i', 1, ['regnbage', 'kupong']],
    ['underst', 2, ['regnbage', 'kupong']],
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
    let host = setup({ a: ['fika'], b: [] }, ['tant', 'regnbage'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(move(host, 'a', { type: 'tPlace', position: 5 })).step).toBe('place')
  })

  it('bara ett Desarmera-kort används, och turer kvar finns kvar', () => {
    let host = setup({ x: ['dubbelpass'], a: ['fika', 'fika'], b: [] }, ['tant', 'regnbage', 'kupong'])
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
  it('Attack ger nästa två turer', () => {
    let host = setup({ a: ['dubbelpass'], b: [], c: [] }, ['regnbage', 'kupong', 'regnbage'])
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
    let host = setup({ a: ['dubbelpass'], b: ['dubbelpass'] }, ['regnbage'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['dubbelpass']))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 4 })
  })

  it('efter en avklarad attacktur ger nästa attack tre turer', () => {
    let host = setup({ a: ['dubbelpass'], b: ['dubbelpass'] }, ['regnbage', 'kupong'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = move(host, 'b', { type: 'tDraw' })
    host = settle(play(host, 'b', ['dubbelpass']))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 3 })
  })

  it('Riktad attack följer samma regler och går till den man väljer', () => {
    let host = setup({ a: ['dudar'], b: ['dudar'], c: [] }, ['regnbage'])
    host = settle(play(host, 'a', ['dudar'], { target: 'c' }))
    expect(table(host)).toMatchObject({ current: 'c', turnsLeft: 2 })
    host = setup({ a: ['dubbelpass'], b: ['dudar'], c: [] }, ['regnbage'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['dudar'], { target: 'a' }))
    expect(table(host)).toMatchObject({ current: 'a', turnsLeft: 4 })
  })

  it('Riktad attack på sig själv går inte', () => {
    const host = setup({ a: ['dudar'], b: [] }, ['regnbage'])
    expect(table(play(host, 'a', ['dudar'], { target: 'a' })).step).toBe('turn')
  })

  it('Hoppa över tar bara en av turerna', () => {
    let host = setup({ a: ['dubbelpass'], b: ['intemin', 'intemin'], c: [] }, ['regnbage'])
    host = settle(play(host, 'a', ['dubbelpass']))
    host = settle(play(host, 'b', ['intemin']))
    expect(table(host)).toMatchObject({ current: 'b', turnsLeft: 1 })
    host = settle(play(host, 'b', ['intemin']))
    expect(table(host)).toMatchObject({ current: 'c', turnsLeft: 1 })
  })
})

describe('Nope!', () => {
  it('stoppar ett kort, och ett andra Nope! släpper igenom det', () => {
    let host = setup({ a: ['blanda', 'nadu'], b: ['nadu'] }, ['regnbage', 'kupong'])
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
    let host = setup({ a: ['dubbelpass'], b: ['nadu'] }, ['regnbage'])
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
    let host = setup({ a: ['regnbage', 'regnbage'], b: ['nadu', 'kupong'] }, ['regnbage'])
    const before = host
    host = play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })
    host = settle(
      move(host, 'b', {
        type: 'tNope',
        card: cardId(host, 'b', 'nadu'),
        level: 0,
      }),
    )
    expect(types(host, 'a')).toEqual([])
    expect(types(host, 'b')).toEqual(['kupong'])
    expect(host.secrets.discard.map((card) => card.type)).toEqual(['regnbage', 'regnbage', 'nadu'])
    expectSameCount(before, host)
  })

  it('går inte att spela när kortet redan hänt', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'] }, ['regnbage'])
    host = settle(play(host, 'a', ['blanda']))
    const after = move(host, 'b', {
      type: 'tNope',
      card: cardId(host, 'b', 'nadu'),
      level: 0,
    })
    expect(types(after, 'b')).toEqual(['nadu'])
  })

  it('två Nope! samtidigt: bara det första räknas, det andra gäller en gammal kedja', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'], c: ['nadu'] }, ['regnbage'])
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

  it('varje Nope! börjar om tiden, och en gammal klocka gör inget', () => {
    let host = setup({ a: ['blanda'], b: ['nadu'] }, ['regnbage'])
    host = play(host, 'a', ['blanda'])
    const first = host.state.deadline!
    host = move(host, 'b', { type: 'tNope', card: cardId(host, 'b', 'nadu'), level: 0 }, 3000)
    expect(host.state.deadline).toBe(3000 + NOPE_SECONDS * 1000)
    expect(tantDeadline(host, first, first, random)).toBe(host)
  })

  it('vanliga drag går inte medan ett kort väntar', () => {
    let host = setup({ a: ['blanda'], b: [] }, ['regnbage'])
    host = play(host, 'a', ['blanda'])
    expect(table(move(host, 'a', { type: 'tDraw' })).deckCount).toBe(1)
  })

  it('går via värdens klocka i match.ts', () => {
    let host: HostState = setup({ a: ['intemin'], b: [] }, ['regnbage'])
    host = hostMove(host, 'a', { type: 'tPlay', cards: [cardId(host as TantHost, 'a', 'intemin')] }, [], 0, random, 'm1')
    host = hostDeadline(host, host.state.deadline!, host.state.deadline!, [], random)
    expect(host.state.tantpanik?.current).toBe('b')
  })
})

describe('titta, möblera och blanda', () => {
  it('Se framtiden visar de tre översta i ordning, bara för den som spelade', () => {
    let host = setup({ a: ['tjuvkika'], b: [] }, ['regnbage', 'tant', 'kupong', 'stickning'])
    const deck = host.secrets.deck.map((card) => card.id)
    host = settle(play(host, 'a', ['tjuvkika']))
    expect(myTantView(host.secrets, table(host), 'a').peek).toEqual(['regnbage', 'tant', 'kupong'])
    expect(myTantView(host.secrets, table(host), 'b').peek).toBeNull()
    expect(host.secrets.deck.map((card) => card.id)).toEqual(deck)
  })

  it('Se framtiden med färre än tre kort visar de som finns', () => {
    let host = setup({ a: ['tjuvkika'], b: [] }, ['kupong'])
    host = settle(play(host, 'a', ['tjuvkika']))
    expect(myTantView(host.secrets, table(host), 'a').peek).toEqual(['kupong'])
  })

  it('Ändra framtiden ändrar bara de översta korten', () => {
    let host = setup({ a: ['mobblera'], b: [] }, ['regnbage', 'tant', 'kupong', 'stickning', 'tradgard'])
    const before = host
    host = settle(play(host, 'a', ['mobblera']))
    expect(table(host).step).toBe('arrange')
    expect(myTantView(host.secrets, table(host), 'a').arrange).toEqual(['regnbage', 'tant', 'kupong'])
    expectSameCount(before, host)
    host = move(host, 'a', { type: 'tArrange', order: [2, 0, 1] })
    expect(host.secrets.deck.map((card) => card.type)).toEqual(['kupong', 'regnbage', 'tant', 'stickning', 'tradgard'])
    expect(table(host).step).toBe('turn')
    expect(table(host).current).toBe('a')
  })

  it('Ändra framtiden med två kort, och en felaktig ordning går inte', () => {
    let host = setup({ a: ['mobblera'], b: [] }, ['regnbage', 'tant'])
    host = settle(play(host, 'a', ['mobblera']))
    expect(table(move(host, 'a', { type: 'tArrange', order: [0, 0] })).step).toBe('arrange')
    host = move(host, 'a', { type: 'tArrange', order: [1, 0] })
    expect(host.secrets.deck.map((card) => card.type)).toEqual(['tant', 'regnbage'])
  })

  it('Blanda behåller korten', () => {
    let host = setup({ a: ['blanda'], b: [] }, ['regnbage', 'tant', 'kupong', 'stickning', 'tradgard', 'vild'])
    const sorted = host.secrets.deck.map((card) => card.id).sort()
    host = settle(play(host, 'a', ['blanda']))
    expect(host.secrets.deck.map((card) => card.id).sort()).toEqual(sorted)
  })
})

describe('par, tretal, jokrar och tjänster', () => {
  it('ett par låter tjuven välja ett av målets kort', () => {
    let host = setup({ a: ['kupong', 'kupong'], b: ['regnbage', 'tjuvkika'] }, ['regnbage'])
    const before = host
    host = pick(settle(play(host, 'a', ['kupong', 'kupong'], { target: 'b' })))
    expect(host.secrets.hands.a).toHaveLength(1)
    expect(host.secrets.hands.b).toHaveLength(1)
    expectSameCount(before, host)
  })

  it('ett par av vanliga kort med samma titel går också', () => {
    let host = setup({ a: ['blanda', 'blanda'], b: ['regnbage'] }, ['regnbage'])
    host = pick(settle(play(host, 'a', ['blanda', 'blanda'], { target: 'b' })))
    expect(types(host, 'a')).toEqual(['regnbage'])
  })

  it('tretal: träff ger kortet, miss ger inget', () => {
    let host = setup(
      {
        a: ['regnbage', 'regnbage', 'regnbage', 'kupong', 'kupong', 'kupong'],
        b: ['fika', 'tradgard'],
      },
      ['regnbage'],
    )
    host = settle(
      play(host, 'a', ['regnbage', 'regnbage', 'regnbage'], {
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
      play(host, 'a', ['kupong', 'kupong', 'kupong'], {
        target: 'b',
        request: 'nadu',
      }),
    )
    expect(types(host, 'b')).toEqual(['tradgard'])
    expect(table(host).log.at(-1)?.text).toBe('Spelare 2 hade ingen Nope!')
  })

  it('jokrar kräver en riktig tant och matchar aldrig andra kort', () => {
    expect(isCombo(['regnbage', 'vild'])).toBe(true)
    expect(isCombo(['vild', 'regnbage', 'vild'])).toBe(true)
    expect(isCombo(['vild', 'vild'])).toBe(false)
    expect(isCombo(['vild', 'blanda'])).toBe(false)
    expect(isCombo(['regnbage', 'kupong'])).toBe(false)
    expect(isCombo(['regnbage', 'kupong', 'vild'])).toBe(false)
    expect(isCombo(['blanda', 'blanda'])).toBe(true)
    const host = setup({ a: ['vild', 'blanda'], b: ['regnbage'] }, ['regnbage'])
    expect(table(play(host, 'a', ['vild', 'blanda'], { target: 'b' })).step).toBe('turn')
  })

  it('stöld från en tom hand går inte att välja', () => {
    const host = setup({ a: ['regnbage', 'regnbage'], b: [] }, ['regnbage'])
    expect(table(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })).step).toBe('turn')
  })

  it('Tjänst: målet väljer själv vilket kort', () => {
    let host = setup({ a: ['tjanst'], b: ['nadu', 'regnbage'] }, ['regnbage'])
    host = settle(play(host, 'a', ['tjanst'], { target: 'b' }))
    expect(table(host)).toMatchObject({
      step: 'give',
      favor: { from: 'b', to: 'a' },
    })
    expect(table(move(host, 'a', { type: 'tGive', card: cardId(host, 'b', 'regnbage') })).step).toBe('give')
    host = move(host, 'b', { type: 'tGive', card: cardId(host, 'b', 'regnbage') })
    expect(types(host, 'a')).toEqual(['regnbage'])
    expect(types(host, 'b')).toEqual(['nadu'])
    expect(table(host)).toMatchObject({ step: 'turn', current: 'a' })
  })
})

describe('Tantsnaran', () => {
  it('finns 1 gång med 2–3 spelare, 2 med 4–7 och 3 med 8–10', () => {
    expect([2, 3, 4, 7, 8, 10].map(trapCount)).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('slår igen för alla vid ett par, och ägaren väljer två kort ur tjuvens hand utan att se dem', () => {
    let host = setup({ a: ['regnbage', 'regnbage', 'kupong', 'tradgard', 'nadu'], b: ['snara'] }, ['regnbage'])
    const before = host
    host = pick(settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })))
    // Fällan slår igen, syns för alla och ligger i slänghögen.
    expect(table(host).lastAction).toMatchObject({ kind: 'trap', player: 'b', from: 'a', card: 'snara' })
    expect(host.secrets.discard.map((card) => card.type)).toContain('snara')
    expect(table(host).log.at(-1)?.text).toContain('Tantsnara!')
    // Ägaren väljer bland tjuvens kort, med baksidan upp.
    expect(table(host)).toMatchObject({ step: 'pick', pick: { by: 'b', from: 'a', count: 3, trap: true, left: 2 } })
    expect(JSON.stringify(myTantView(host.secrets, table(host), 'b'))).not.toMatch(/kupong|tradgard|nadu/)
    host = pick(host, 0)
    expect(table(host)).toMatchObject({ step: 'pick', pick: { by: 'b', from: 'a', count: 2, left: 1 } })
    host = pick(host, 1)
    expect(table(host)).toMatchObject({ step: 'turn', current: 'a', pick: null })
    expect(host.secrets.hands.a).toHaveLength(1)
    expect(host.secrets.hands.b).toHaveLength(2)
    expectSameCount(before, host)
  })

  it('tjuven ser vilka kort som togs, de andra bara att kort byter hand', () => {
    let host = setup({ a: ['regnbage', 'regnbage', 'kupong'], b: ['snara'], c: [] }, ['regnbage'])
    host = pick(pick(settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' }))))
    const action = table(host).lastAction!
    expect(action).toMatchObject({ kind: 'take', player: 'b', from: 'a', card: null })
    expect(myTantView(host.secrets, table(host), 'a').lost).toEqual({ n: action.n, type: 'kupong', to: 'b' })
    expect(myTantView(host.secrets, table(host), 'b').drew).toMatchObject({ type: 'kupong', from: 'a' })
    expect(myTantView(host.secrets, table(host), 'c').drew).toBeNull()
  })

  it('slår igen vid ett tretal som ber om den', () => {
    let host = setup({ a: ['regnbage', 'regnbage', 'regnbage', 'kupong'], b: ['snara', 'fika'] }, ['regnbage'])
    host = settle(
      play(host, 'a', ['regnbage', 'regnbage', 'regnbage'], {
        target: 'b',
        request: 'snara',
      }),
    )
    expect(table(host)).toMatchObject({ step: 'pick', pick: { by: 'b', from: 'a', count: 1, left: 1 } })
    host = pick(host)
    expect(types(host, 'a')).toEqual([])
    expect(types(host, 'b')).toEqual(['fika', 'kupong'])
  })

  for (const [left, back] of [
    [2, 2],
    [1, 1],
    [0, 0],
  ]) {
    it(`tjuven har ${left} kort kvar: ägaren får ${back}`, () => {
      const extra: CardType[] = ['kupong', 'tradgard'].slice(0, left) as CardType[]
      let host = setup({ a: ['regnbage', 'regnbage', ...extra], b: ['snara'] }, ['regnbage'])
      host = pick(settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })))
      for (let i = 0; i < back; i++) host = pick(host)
      expect(table(host).step).toBe('turn')
      expect(host.secrets.hands.b).toHaveLength(back)
      expect(host.secrets.hands.a).toHaveLength(left - back)
    })
  }

  it('motstölden utlöser inga nya fällor: en snara hos tjuven blir ett vanligt kort', () => {
    let host = setup({ a: ['regnbage', 'regnbage', 'snara'], b: ['snara'] }, ['regnbage'])
    host = pick(settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })))
    host = pick(host)
    expect(types(host, 'b')).toEqual(['snara'])
    expect(host.secrets.discard.filter((card) => card.type === 'snara')).toHaveLength(1)
  })

  it('slår inte igen vid en tjänst eller när den dras', () => {
    let host = setup({ a: ['tjanst'], b: ['snara'] }, ['snara', 'regnbage'])
    host = settle(play(host, 'a', ['tjanst'], { target: 'b' }))
    host = move(host, 'b', { type: 'tGive', card: cardId(host, 'b', 'snara') })
    expect(types(host, 'a')).toEqual(['snara'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(types(host, 'a')).toEqual(['snara', 'snara'])
  })
})

describe('hemligheter och dubbla drag', () => {
  it('det alla får se avslöjar inga händer, ingen draghög och inget man tittat på', () => {
    let host = setup({ a: ['tjuvkika', 'fika'], b: ['regnbage', 'kupong'] }, ['tant', 'regnbage', 'kupong', 'tradgard'])
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
    const host = setup({ a: ['regnbage'], b: ['kupong'] }, ['tant'])
    const parsed = parseStateMessage({ state: host.state, sentAt: 1 })
    expect(parsed?.state.tantpanik?.current).toBe('a')
    const view = myTantView(host.secrets, table(host), 'a')
    expect(parseTantView({ to: 'a', from: 'h', seq: 1, view })?.view).toEqual(view)
    expect(
      parseTantView({
        to: 'a',
        view: { ...view, hand: [{ id: 1, type: 'regnbage' }] },
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
    let host = setup({ a: [], b: [] }, ['regnbage', 'kupong', 'tradgard'])
    host = tantMove(host, 'a', { type: 'tDraw' }, 'samma', 0, random)
    const again = tantMove(host, 'a', { type: 'tDraw' }, 'samma', 0, random)
    expect(again).toBe(host)
    expect(myTantView(host.secrets, table(host), 'a').handled).toContain('samma')
  })

  it('ett ogiltigt drag ändrar inga kort men syns som hanterat', () => {
    const host = setup({ a: ['regnbage'], b: [] }, ['regnbage'])
    const after = tantMove(host, 'a', { type: 'tPlay', cards: [cardId(host, 'a', 'regnbage')] }, 'fel', 0, random)
    expect(after.secrets.hands).toEqual(host.secrets.hands)
    expect(after.secrets.deck).toEqual(host.secrets.deck)
    expect(myTantView(after.secrets, table(after), 'a').handled).toContain('fel')
    expect(myTantView(after.secrets, table(after), 'a').notice?.text).toBe('Det gick inte just nu.')
  })

  it('ett kort som inte finns på handen går inte att spela', () => {
    const host = setup({ a: ['blanda'], b: ['blanda'] }, ['regnbage'])
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
        if (t.winner) host = tantDeadline(host, host.state.deadline!, host.state.deadline!, rnd)
        else if (t.step === 'window') host = tantDeadline(host, host.state.deadline!, host.state.deadline!, rnd)
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
        else if (t.step === 'pick')
          host = tantMove(host, t.pick!.by, { type: 'tPick', index: Math.floor(rnd() * t.pick!.count) }, null, now, rnd)
        else if (t.step === 'give')
          host = tantMove(host, t.favor!.from, { type: 'tGive', card: host.secrets.hands[t.favor!.from][0].id }, null, now, rnd)
        else {
          const hand = host.secrets.hands[t.current]
          const action = hand.find((card) => CARDS[card.type].kind === 'action' && card.type !== 'dudar' && card.type !== 'tjanst')
          // Par med samma kort, mot den första som har kort, så att valet bland baksidorna också körs.
          const first = hand.find((card) => hand.some((other) => other !== card && other.type === card.type))
          const second = first && hand.find((other) => other !== first && other.type === first.type)
          const victim = validTargets(t, t.current, true)[0]
          host =
            first && second && victim && rnd() < 0.3
              ? tantMove(host, t.current, { type: 'tPlay', cards: [first.id, second.id], target: victim }, null, now, rnd)
              : action && rnd() < 0.4
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

describe('händelserna vid bordet', () => {
  it('ett vanligt drag visar för alla att någon drog, men bara den som drog ser kortet', () => {
    let host = setup({ a: ['fika'], b: ['fika'] }, ['stickning', 'regnbage', 'tant'])
    host = move(host, 'a', { type: 'tDraw' })
    const action = table(host).lastAction!
    expect(action).toMatchObject({ kind: 'draw', player: 'a', card: null })
    expect(myTantView(host.secrets, table(host), 'a').drew).toEqual({ n: action.n, type: 'stickning', id: cardId(host, 'a', 'stickning') })
    expect(myTantView(host.secrets, table(host), 'b').drew).toBeNull()
    expect(JSON.stringify(host.state)).not.toContain('stickning')
  })

  it('en exploderande tant visas för alla, med om spelaren klarade sig', () => {
    let host = setup({ a: ['fika'], b: [], c: [] }, ['tant', 'regnbage', 'tant'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(host).lastAction).toMatchObject({ kind: 'bomb', player: 'a', card: 'tant', saved: true })
    host = move(host, 'a', { type: 'tPlace', position: 0 })
    host = move(host, 'b', { type: 'tDraw' })
    expect(table(host).lastAction).toMatchObject({ kind: 'bomb', player: 'b', card: 'tant', saved: false })
  })

  it('ett spelat kort syns för alla', () => {
    let host = setup({ a: ['blanda'], b: [] }, ['regnbage'])
    host = play(host, 'a', ['blanda'])
    expect(table(host).lastAction).toMatchObject({ kind: 'play', player: 'a', card: 'blanda' })
  })

  it('ett gammalt besked står inte kvar när det blir ens tur, och tanten ger ett nytt besked', () => {
    let host = setup({ a: ['fika'], b: ['fika'] }, ['stickning', 'regnbage', 'tant', 'kupong'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(myTantView(host.secrets, table(host), 'a').notice?.text).toBe('Du drog Sticktanten.')
    host = move(host, 'b', { type: 'tDraw' })
    // Det blir a:s tur igen, och det gamla beskedet är borta.
    expect(myTantView(host.secrets, table(host), 'a').notice).toBeNull()
    host = move(host, 'a', { type: 'tDraw' })
    expect(myTantView(host.secrets, table(host), 'a').notice?.text).toContain('exploderande tant')
  })

  it('historiken sparar de 30 senaste händelserna', () => {
    let host = setup({ a: [], b: [] }, Array.from({ length: 40 }, () => 'regnbage' as const))
    for (let i = 0; i < 40; i++) host = move(host, i % 2 === 0 ? 'a' : 'b', { type: 'tDraw' })
    expect(table(host).log).toHaveLength(30)
  })
})

describe('par: tjuven väljer bland baksidor', () => {
  it('ett par som går igenom låter tjuven välja, och inget annat går under tiden', () => {
    let host = setup({ a: ['regnbage', 'regnbage', 'blanda'], b: ['fika', 'nadu', 'kupong'], c: ['regnbage'] }, ['regnbage'])
    host = settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' }))
    expect(table(host)).toMatchObject({ step: 'pick', pick: { by: 'a', from: 'b', count: 3 } })
    expect(myTantView(host.secrets, table(host), 'b').notice?.text).toBe('Spelare 1 väljer ett kort ur din hand…')
    // Ingen annan kan välja, och tjuven kan inte göra något annat.
    expect(table(move(host, 'b', { type: 'tPick', index: 0 })).step).toBe('pick')
    expect(table(move(host, 'a', { type: 'tDraw' })).step).toBe('pick')
    expect(table(play(host, 'a', ['blanda'])).step).toBe('pick')
    expect(table(move(host, 'a', { type: 'tPick', index: 3 })).step).toBe('pick')
    expect(table(move(host, 'a', { type: 'tPick', index: -1 })).step).toBe('pick')
  })

  it('tjuven får kortet på platsen den valde', () => {
    let host = setup({ a: ['regnbage', 'regnbage'], b: ['fika', 'nadu', 'kupong'] }, ['regnbage'])
    host = settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' }))
    const before = host
    const chosen = host.secrets.pickOrder![2]
    const type = host.secrets.hands.b.find((card) => card.id === chosen)!.type
    host = pick(host, 2)
    expect(types(host, 'a')).toEqual([type])
    expect(host.secrets.hands.b.map((card) => card.id)).not.toContain(chosen)
    expect(table(host)).toMatchObject({ step: 'turn', current: 'a', pick: null })
    expect(myTantView(host.secrets, table(host), 'b').notice?.text).toMatch(/^Spelare 1 tog .+ från dig.$/)
    expectSameCount(before, host)
  })

  it('inget om målets kort syns innan valet, bara antalet', () => {
    let host = setup({ a: ['regnbage', 'regnbage'], b: ['fika', 'nadu', 'kupong'] }, ['regnbage'])
    host = settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' }))
    const state = JSON.stringify(host.state)
    const view = JSON.stringify(myTantView(host.secrets, table(host), 'a'))
    for (const card of host.secrets.hands.b) {
      expect(state).not.toContain(card.id)
      expect(view).not.toContain(card.id)
      expect(view).not.toContain(card.type)
    }
  })

  it('ordningen blandas om varje gång', () => {
    const orders = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const host = setup({ a: ['regnbage', 'regnbage'], b: ['fika', 'nadu', 'kupong', 'blanda'] }, ['regnbage'])
      const played = play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })
      const done = tantDeadline(played, played.state.deadline!, played.state.deadline!, seeded(seed))
      const hand = done.secrets.hands.b.map((card) => card.id)
      expect([...done.secrets.pickOrder!].sort()).toEqual([...hand].sort())
      orders.add(done.secrets.pickOrder!.join())
    }
    expect(orders.size).toBeGreaterThan(3)
  })

  it('ett stoppat par ger inget val', () => {
    let host = setup({ a: ['regnbage', 'regnbage'], b: ['nadu', 'kupong'] }, ['regnbage'])
    host = play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })
    host = settle(move(host, 'b', { type: 'tNope', card: cardId(host, 'b', 'nadu'), level: 0 }))
    expect(table(host)).toMatchObject({ step: 'turn', pick: null })
    expect(types(host, 'b')).toEqual(['kupong'])
  })

  it('draget tPick går igenom kontrollen', () => {
    expect(parseMove({ id: 'a', nr: 'x', move: { type: 'tPick', index: 2 } })?.move).toEqual({ type: 'tPick', index: 2 })
    expect(parseMove({ id: 'a', nr: 'x', move: { type: 'tPick', index: 'två' } })).toBeNull()
  })
})

describe('svårigheten', () => {
  const levels: TantLevel[] = ['normal', 'svar', 'kaos']
  for (let players = 2; players <= 10; players++) {
    for (const level of levels) {
      it(`${players} spelare, ${level}`, () => {
        const ids = Array.from({ length: players }, (_, i) => `p${i}`)
        const { deck } = dealTant(ids, true, seeded(players), level)
        // Kaos med färre än fem spelare blir Svår.
        const extra = level === 'normal' ? 0 : level === 'svar' || players < 5 ? 1 : 2
        expect(deck.filter((card) => card.type === 'tant')).toHaveLength(players - 1 + extra)
        expect(bombCount(players, level)).toBe(players - 1 + extra)
      })
    }
  }

  it('Kaos kräver minst fem spelare, annars blir det Svår', () => {
    expect(levelFor('kaos', 4)).toBe('svar')
    expect(levelFor('kaos', 5)).toBe('kaos')
    expect(levelFor(undefined, 3)).toBe('normal')
  })

  it('värden väljer i väntrummet, och valet låses när matchen startar', () => {
    let state = setTantSettings(initialState('tantpanik'), { level: 'svar' })
    expect(state.tantSettings).toEqual({ trap: true, level: 'svar' })
    state = setTantSettings(state, { trap: false })
    expect(state.tantSettings).toEqual({ trap: false, level: 'svar' })
    const host = startTantMatch(lobby(4, true, 'svar'), seeded(2))
    expect(table(host).level).toBe('svar')
    expect(host.secrets.deck.filter((card) => card.type === 'tant')).toHaveLength(4)
    expect(setTantSettings(host.state, { level: 'normal' })).toBe(host.state)
  })

  it('statusraden räknar tanterna i högen', () => {
    let host = setup({ a: [], b: ['fika'], c: [] }, ['tant', 'regnbage', 'tant'])
    host = { ...host, state: { ...host.state, tantpanik: { ...table(host), level: 'svar' } } }
    expect(levelLine(table(host))).toBe('Svår: 3 tanter i högen')
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(host).out).toEqual(['a'])
    expect(bombsInDeck(table(host))).toBe(2)
    expect(levelLine({ ...table(host), level: undefined })).toBe('Normal: 1 tant i högen')
  })

  it('en värd med en äldre version utan svårighet går igenom kontrollen', () => {
    const host = startTantMatch(lobby(3), seeded(1))
    const { level: _level, pick: _pick, ...older } = table(host)
    const message = { state: { ...host.state, tantpanik: older, tantSettings: { trap: true } }, from: 'p1', sentAt: 1 }
    expect(parseStateMessage(message)).not.toBeNull()
    const bad = { state: { ...host.state, tantSettings: { trap: true, level: 'omöjlig' } }, from: 'p1', sentAt: 1 }
    expect(parseStateMessage(bad)).toBeNull()
  })
})

describe('Nope!-fönstret', () => {
  it('varar i sex sekunder', () => {
    expect(NOPE_SECONDS).toBe(6)
    const host = play(setup({ a: ['blanda'], b: [] }, ['regnbage']), 'a', ['blanda'])
    expect(host.state.deadline).toBe(1000 + 6000)
  })
})

describe('kort som byter hand', () => {
  it('en stöld visar alla att ett kort tas, men bara tjuven och den bestulna ser vilket', () => {
    let host = setup({ a: ['regnbage', 'regnbage'], b: ['blanda'], c: [] }, ['regnbage'])
    host = pick(settle(play(host, 'a', ['regnbage', 'regnbage'], { target: 'b' })))
    const action = table(host).lastAction!
    expect(action).toMatchObject({ kind: 'take', player: 'a', from: 'b', card: null })
    expect(myTantView(host.secrets, table(host), 'a').drew).toMatchObject({ n: action.n, type: 'blanda', from: 'b', gift: false })
    expect(myTantView(host.secrets, table(host), 'b').lost).toEqual({ n: action.n, type: 'blanda', to: 'a' })
    expect(myTantView(host.secrets, table(host), 'c').drew).toBeNull()
    expect(JSON.stringify(host.state)).not.toContain('blanda')
  })

  it('en tjänst syns som en gåva hos den som bad om den', () => {
    let host = setup({ a: ['tjanst'], b: ['blanda'] }, ['regnbage'])
    host = settle(play(host, 'a', ['tjanst'], { target: 'b' }))
    host = move(host, 'b', { type: 'tGive', card: cardId(host, 'b', 'blanda') })
    expect(myTantView(host.secrets, table(host), 'a').drew).toMatchObject({ type: 'blanda', from: 'b', gift: true })
  })
})

describe('slutet av matchen', () => {
  it('ett tryck hoppar vidare till slutskärmen, men bara för den som var med', () => {
    let host = setup({ a: [], b: ['fika'] }, ['tant'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(tantMove(host, 'x', { type: 'tFinish' }, null, 2000, random).state.phase).toBe('playing')
    host = tantMove(host, 'a', { type: 'tFinish' }, null, 2000, random)
    expect(host.state.phase).toBe('finished')
    expect(host.state.scores).toEqual({ a: 1, b: 2 })
  })

  it('tFinish går igenom kontrollen', () => {
    expect(parseMove({ id: 'a', nr: 'x', move: { type: 'tFinish' } })?.move).toEqual({ type: 'tFinish' })
  })
})

describe('prispallen', () => {
  it('säger Sist kvar! och i vilken ordning de andra exploderade', () => {
    expect(tantPlacementText(4, 4)).toBe('Sist kvar!')
    expect(tantPlacementText(1, 4)).toBe('Exploderade som 1:a')
    expect(tantPlacementText(2, 4)).toBe('Exploderade som 2:a')
    expect(tantPlacementText(3, 4)).toBe('Exploderade som 3:e')
  })
})

describe('statusraden medan tanten göms', () => {
  it('räknar tanten som göms, så att det aldrig står 0 tanter i högen', () => {
    let host = setup({ a: ['fika'], b: [] }, ['tant', 'regnbage'])
    host = move(host, 'a', { type: 'tDraw' })
    expect(table(host).step).toBe('place')
    expect(levelLine(table(host))).toBe('Normal: 1 tant i högen')
  })
})

describe('ingen genväg för värden', () => {
  // Värden (vard) och en bot (bot). Boten har tur och spelar Se framtiden.
  function botsTurn(): HostState {
    const host = setup({ bot: ['tjuvkika', 'fika', 'intemin'], vard: ['fika', 'blanda'] }, ['regnbage', 'tant', 'kupong', 'stickning', 'blanda'])
    return { ...host, state: { ...host.state, players: { ...host.state.players, bot: { ...host.state.players.bot, bot: 'normal' } } } }
  }
  const tryMove = (host: HostState, m: TantMove) => hostMove(host, 'vard', m, ['vard', 'bot'], 2000, seeded(9), `vard-${m.type}`)
  // Inget i matchen ändras: bordet, högen, händerna och klockan. Bara beskedet och dragets nummer (att värden sett det).
  function expectNothingChanged(before: HostState, after: HostState) {
    const a = before.secrets as TantSecrets
    const b = after.secrets as TantSecrets
    expect(after.state.tantpanik).toEqual(before.state.tantpanik)
    expect(after.state.deadline).toBe(before.state.deadline)
    expect(after.state.phase).toBe(before.state.phase)
    expect(b.deck).toEqual(a.deck)
    expect(b.hands).toEqual(a.hands)
    expect(b.discard).toEqual(a.discard)
    expect(b.removed).toEqual(a.removed)
    expect(b.notices.vard?.text).toBe('Det gick inte just nu.')
  }

  it('värden kan inte dra när det är en bots tur', () => {
    const before = botsTurn()
    expect(before.state.tantpanik!.current).toBe('bot')
    expectNothingChanged(before, tryMove(before, { type: 'tDraw' }))
    // Inte spela ett kort heller.
    const blanda = (before.secrets as TantSecrets).hands.vard.find((card) => card.type === 'blanda')!.id
    expectNothingChanged(before, tryMove(before, { type: 'tPlay', cards: [blanda] }))
  })

  it('värden kan inte dra medan en bot är mitt i Se framtiden', () => {
    const played = play(botsTurn() as TantHost, 'bot', ['tjuvkika'])
    // Nope!-fönstret för Se framtiden är öppet.
    expect(table(played).step).toBe('window')
    expectNothingChanged(played, tryMove(played, { type: 'tDraw' }))
    // Fönstret har stängts och boten tittar i högen: fortfarande botens tur.
    const peeking = settle(played)
    expect(table(peeking).step).toBe('turn')
    expect(table(peeking).current).toBe('bot')
    expect(myTantView(peeking.secrets, table(peeking), 'bot').peek).toEqual(['regnbage', 'tant', 'kupong'])
    expectNothingChanged(peeking, tryMove(peeking, { type: 'tDraw' }))
    // Inga andra steg heller.
    for (const m of [{ type: 'tPlace', position: 0 }, { type: 'tArrange', order: [0, 1, 2] }, { type: 'tPick', index: 0 }] as TantMove[]) {
      expectNothingChanged(peeking, tryMove(peeking, m))
    }
    // Boten kan dra som vanligt.
    const drawn = move(peeking, 'bot', { type: 'tDraw' })
    expect(table(drawn).current).toBe('vard')
  })

  it('moveAllowed följer fas, tur och steg för alla drag', () => {
    const host = botsTurn() as TantHost
    const t = table(host)
    expect(moveAllowed(t, 'bot', { type: 'tDraw' })).toBe(true)
    expect(moveAllowed(t, 'vard', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed(t, 'vard', { type: 'tNope', card: 'x', level: 0 })).toBe(false)
    expect(moveAllowed(t, 'okand', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed({ ...t, step: 'place' }, 'bot', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed({ ...t, step: 'place' }, 'bot', { type: 'tPlace', position: 0 })).toBe(true)
    expect(moveAllowed({ ...t, step: 'give', favor: { from: 'vard', to: 'bot' } }, 'vard', { type: 'tGive', card: 'x' })).toBe(true)
    expect(moveAllowed({ ...t, step: 'give', favor: { from: 'vard', to: 'bot' } }, 'bot', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed({ ...t, out: ['bot'] }, 'bot', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed({ ...t, winner: 'bot' }, 'bot', { type: 'tDraw' })).toBe(false)
    expect(moveAllowed({ ...t, winner: 'bot' }, 'vard', { type: 'tFinish' })).toBe(true)
  })
})

describe('tjuven ser aldrig min handordning', () => {
  // vard har tur och spelar ett par mot mig. Min hand i två olika ordningar hos värden.
  function pairAgainstMe(myHand: CardType[], seed: number): TantHost {
    const host = setup({ tjuv: ['regnbage', 'regnbage'], jag: myHand }, ['blanda', 'blanda', 'blanda'])
    const played = tantMove(host, 'tjuv', { type: 'tPlay', cards: host.secrets.hands.tjuv.map((card) => card.id), target: 'jag' }, null, 1000, seeded(seed))
    return tantDeadline(played, played.state.deadline!, played.state.deadline!, seeded(seed))
  }
  const sorted: CardType[] = ['fika', 'nadu', 'blanda', 'intemin', 'kupong']
  const reversed = [...sorted].reverse()

  it('tjuvens vy av min hand är densamma hur jag än ordnat den', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = pairAgainstMe(sorted, seed)
      const b = pairAgainstMe(reversed, seed)
      expect(table(a).step).toBe('pick')
      // Allt tjuven får: bordet (bara antalet baksidor) och sitt eget besked.
      expect(table(a).pick).toEqual(table(b).pick)
      expect(table(a).pick).toEqual({ by: 'tjuv', from: 'jag', count: 5 })
      const view = (host: TantHost) => {
        const own = myTantView(host.secrets, table(host), 'tjuv')
        return { ...own, hand: own.hand.map((card) => card.type) }
      }
      expect(view(a)).toEqual(view(b))
    }
  })

  it('baksidorna blandas på nytt varje gång, oberoende av ordningen i min hand', () => {
    const TRIES = 600
    for (const hand of [sorted, reversed]) {
      const firstAt: Record<string, number> = {}
      for (let seed = 1; seed <= TRIES; seed++) {
        const host = pairAgainstMe(hand, seed)
        const first = host.secrets.hands.jag.find((card) => card.id === host.secrets.pickOrder![0])!.type
        firstAt[first] = (firstAt[first] ?? 0) + 1
      }
      // Varje kort ligger först ungefär var femte gång, oavsett var det ligger i min hand.
      for (const type of sorted) expect(Math.abs((firstAt[type] ?? 0) / TRIES - 0.2)).toBeLessThan(0.06)
    }
  })

  it('Tantsnaran blandar tjuvens hand på nytt inför varje kort', () => {
    let same = 0
    const TRIES = 60
    for (let seed = 1; seed <= TRIES; seed++) {
      const host = setup({ tjuv: ['regnbage', 'regnbage', 'fika', 'nadu', 'blanda', 'intemin'], jag: ['snara'] }, ['blanda', 'blanda'])
      const played = tantMove(host, 'tjuv', { type: 'tPlay', cards: host.secrets.hands.tjuv.slice(0, 2).map((card) => card.id), target: 'jag' }, null, 1000, seeded(seed))
      let next = tantDeadline(played, played.state.deadline!, played.state.deadline!, seeded(seed))
      next = tantMove(next, 'tjuv', { type: 'tPick', index: 0 }, null, 2000, seeded(seed + 1000))
      expect(table(next).pick).toMatchObject({ by: 'jag', from: 'tjuv', trap: true, left: 2 })
      const before = next.secrets.pickOrder!
      const after = tantMove(next, 'jag', { type: 'tPick', index: 0 }, null, 3000, seeded(seed + 2000))
      expect(table(after).pick).toMatchObject({ by: 'jag', trap: true, left: 1 })
      expect(new Set(after.secrets.pickOrder)).toEqual(new Set(after.secrets.hands.tjuv.map((card) => card.id)))
      // Samma ordning som förra gången, bara utan det tagna kortet?
      if (JSON.stringify(before.slice(1)) === JSON.stringify(after.secrets.pickOrder)) same++
    }
    // Med fyra kort kvar blir det samma ordning ungefär var 24:e gång av en slump, inte varje gång.
    expect(same).toBeLessThan(TRIES / 4)
  })

})
