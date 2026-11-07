import { describe, expect, it } from 'vitest'
import { abortMatch, addBot, botIds, hostDeadline, hostMove, hostStart, initialState, removeBot, setBotLevel, setGame, type GameState, type HostState } from '@/lib/match'
import { botFallbackMove, botMustAct, botSight, decideBotMove, fastForwardBots, newBotMemory, observe, onlyBotsLeft, remember, type BotLevel, type BotMemory } from '@/lib/tantbot'
import { CARD_TYPES, type CardType } from '@/lib/tantpanik-kort'
import type { DeckChange } from '@/lib/tantpanik'
import { takeOverState } from '@/lib/vardbyte'
import { countAllCards, END_MS, myTantView, startTantMatch, sync, tantDeadline, tantMove, type TantHost } from '@/lib/tantpanik'

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

function lobby(count: number): GameState {
  const state = initialState('tantpanik')
  const players: GameState['players'] = {}
  for (let i = 1; i <= count; i++) players[`p${i}`] = { name: `Spelare ${i}`, avatar: '🙂' }
  return { ...state, players, tantSettings: { trap: true, level: 'svar' } }
}

// Spelar en hel match där alla är botar, med värdens funktioner precis som i lobbyn.
function playBots(count: number, levels: BotLevel[], seed: number): { host: TantHost; moves: number } {
  const random = seeded(seed)
  let host = startTantMatch(lobby(count), random)
  const total = countAllCards(host.secrets)
  let moves = 0
  for (let step = 0; step < 3000 && host.state.phase === 'playing'; step++) {
    const now = step * 10_000
    const table = host.state.tantpanik!
    if (table.winner || (table.step === 'window' && !table.order.some((id, i) => decideBotMove(botSight(host, id)!, levels[i % levels.length], seeded(seed + step))))) {
      host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
      continue
    }
    let moved = false
    for (const [i, id] of table.order.entries()) {
      const move = decideBotMove(botSight(host, id)!, levels[i % levels.length], random)
      if (!move) continue
      const next = tantMove(host, id, move, null, now, random)
      expect(countAllCards(next.secrets)).toBe(total)
      // Ett drag som inte går: boten drar i stället (om det är dess tur), som runnern i useLobby gör.
      host = next.state.tantpanik !== host.state.tantpanik ? next : tantMove(host, id, { type: 'tDraw' }, null, now, random)
      moved = true
      moves++
      break
    }
    if (!moved) host = tantDeadline(host, host.state.deadline ?? now, host.state.deadline ?? now, random)
  }
  return { host, moves }
}

describe('botarna i Exploderande Tanter', () => {
  for (const levels of [['latt'], ['normal'], ['svar'], ['latt', 'normal', 'svar']] as BotLevel[][]) {
    it(`spelar hela matcher med bara botar (${levels.join(', ')})`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const { host } = playBots(2 + (seed % 4), levels, seed)
        expect(host.state.tantpanik!.error).toBeNull()
        expect(host.state.phase).toBe('finished')
      }
    })
  }

  it('ser bara det en riktig spelare på dess plats ser: inga andras kort och inte högens ordning', () => {
    const host = startTantMatch(lobby(4), seeded(5))
    const sight = botSight(host, 'p1')!
    const json = JSON.stringify(sight)
    for (const [id, hand] of Object.entries(host.secrets.hands)) {
      if (id === 'p1') continue
      for (const card of hand) expect(json).not.toContain(card.id)
    }
    for (const card of host.secrets.deck) expect(json).not.toContain(card.id)
    expect(Object.keys(sight).sort()).toEqual(['me', 'table', 'view'])
  })

  it('fattar samma beslut oavsett vad som är dolt för den (andras händer och högens ordning)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const host = startTantMatch(lobby(3), seeded(seed))
      const me = host.state.tantpanik!.current
      // Samma läge för boten, men andra kort hos de andra och en blandad hög.
      const others = Object.keys(host.secrets.hands).filter((id) => id !== me)
      const swapped: TantHost = sync({
        state: host.state,
        secrets: {
          ...host.secrets,
          deck: [...host.secrets.deck].reverse(),
          hands: { ...host.secrets.hands, [others[0]]: host.secrets.hands[others[1]], [others[1]]: host.secrets.hands[others[0]] },
        },
      })
      for (const level of ['latt', 'normal', 'svar'] as BotLevel[]) {
        const a = decideBotMove(botSight(host, me)!, level, seeded(seed * 7))
        const b = decideBotMove(botSight(swapped, me)!, level, seeded(seed * 7))
        expect(b).toEqual(a)
      }
    }
  })

  it('säger Nope! mot en riktad attack mot sig själv (Normal)', () => {
    let host = startTantMatch(lobby(2), seeded(9))
    const [a, b] = host.state.tantpanik!.order
    // a får en Riktad attack, b ett Nope!.
    host = {
      ...host,
      secrets: {
        ...host.secrets,
        hands: { ...host.secrets.hands, [a]: [{ id: 'att', type: 'dudar' }], [b]: [{ id: 'nej', type: 'nadu' }] },
      },
    }
    host = sync(host)
    host = tantMove(host, a, { type: 'tPlay', cards: ['att'], target: b }, null, 0, seeded(1))
    expect(host.state.tantpanik!.step).toBe('window')
    expect(decideBotMove(botSight(host, b)!, 'normal', seeded(2))).toEqual({ type: 'tNope', card: 'nej', level: 0 })
  })

  it('gömmer tanten på en slumpad plats, med olika fördelning per svårighet', () => {
    let host = startTantMatch(lobby(3), seeded(11))
    const [a] = host.state.tantpanik!.order
    host = sync({
      ...host,
      secrets: { ...host.secrets, deck: [{ id: 'bomb', type: 'tant' }, ...host.secrets.deck], hands: { ...host.secrets.hands, [a]: [{ id: 'f', type: 'fika' }] } },
    })
    host = tantMove(host, a, { type: 'tDraw' }, null, 0, seeded(1))
    const table = host.state.tantpanik!
    expect(table.step).toBe('place')
    const max = table.deckCount
    expect(max).toBeGreaterThan(20)
    const TRIES = 1000
    // Andelen försök per plats, med botens riktiga beslut.
    function spread(level: BotLevel, t = table): number[] {
      const random = seeded(level.length + t.out.length)
      const counts = Array.from({ length: max + 1 }, () => 0)
      for (let i = 0; i < TRIES; i++) {
        const move = decideBotMove({ ...botSight(host, a)!, table: t }, level, random)
        if (move?.type !== 'tPlace') throw new Error('Ingen placering')
        expect(move.position).toBeGreaterThanOrEqual(0)
        expect(move.position).toBeLessThanOrEqual(max)
        counts[move.position]++
      }
      return counts.map((count) => count / TRIES)
    }
    const near = (share: number, expected: number) => expect(Math.abs(share - expected)).toBeLessThan(0.05)
    const sum = (shares: number[]) => shares.reduce((total, share) => total + share, 0)

    // Lätt: helt slumpat, ingen plats sticker ut och toppen är sällsynt.
    const easy = spread('latt')
    expect(easy[0]).toBeLessThan(0.08)
    expect(easy.filter((share) => share > 0).length).toBeGreaterThan(max * 0.8)

    // Normal: ungefär 35 % överst, 25 % på plats 2–3, resten längre ned.
    const normal = spread('normal')
    near(normal[0], 0.35)
    near(normal[1] + normal[2], 0.25)
    near(sum(normal.slice(3)), 0.4)

    // Svår: ungefär 40 % överst och 20 % näst överst.
    const hard = spread('svar')
    near(hard[0], 0.4)
    near(hard[1], 0.2)
    near(sum(hard.slice(2)), 0.4)
    // Bara två kvar: oftare överst.
    const two = spread('svar', { ...table, out: [table.order[2]] })
    near(two[0], 0.55)
    near(two[1], 0.2)
  })

  it('minns var den själv gömde tanten, även när platsen är slumpad', () => {
    let host = startTantMatch(lobby(3), seeded(12))
    const [a] = host.state.tantpanik!.order
    host = sync({
      ...host,
      secrets: { ...host.secrets, deck: [{ id: 'bomb', type: 'tant' }, ...host.secrets.deck], hands: { ...host.secrets.hands, [a]: [{ id: 'f', type: 'fika' }] } },
    })
    host = tantMove(host, a, { type: 'tDraw' }, null, 0, seeded(1))
    const sight = botSight(host, a)!
    const move = decideBotMove(sight, 'normal', () => 0.9)!
    expect(move.type).toBe('tPlace')
    const after = tantMove(host, a, move, null, 0, seeded(1))
    const memory = remember(newBotMemory(sight.table), move, sight, after.state.tantpanik!)
    const position = (move as { position: number }).position
    expect(position).toBeGreaterThanOrEqual(3)
    expect(memory.bombAt).toBe(position)
    expect(after.secrets.deck[position].type).toBe('tant')
  })
})

describe('botar i lobbyn', () => {
  const avatars = ['🤪', '🎩', '😴', '💧']
  const withHuman = () => ({ ...initialState('tantpanik'), players: { me: { name: 'Mia', avatar: '🤪' } }, scores: { me: 0 } })

  it('värden lägger till och tar bort botar med tantnamn, högst fyra', () => {
    let state: GameState = withHuman()
    for (let i = 0; i < 6; i++) state = addBot(state, `bot${i}`, avatars, 1, seeded(i + 1))
    expect(botIds(state)).toHaveLength(4)
    expect(state.players.bot0).toMatchObject({ name: 'Bot-Berit', bot: 'normal' })
    expect(state.players.bot1.name).toBe('Bot-Gunnel')
    expect(state.players.bot0.avatar).not.toBe('🤪')
    state = setBotLevel(state, 'bot0', 'svar')
    expect(state.players.bot0.bot).toBe('svar')
    state = removeBot(state, 'bot0')
    expect(botIds(state)).toHaveLength(3)
    expect(removeBot(state, 'me')).toBe(state)
  })

  it('finns i spelen med botar och ligger kvar när värden byter spel', () => {
    for (const game of ['narmast', 'gissa-priset', 'tantpanik']) {
      const state = { ...withHuman(), game }
      expect(botIds(addBot(state, 'bot0', avatars, 1))).toEqual(['bot0'])
    }
    // Imposterjakten och Kortkaos har inga botar: det går inte att lägga till någon där.
    for (const game of ['imposterjakten', 'kortkaos']) {
      const state = { ...withHuman(), game }
      expect(addBot(state, 'bot0', avatars, 1)).toBe(state)
    }
    let state = addBot(withHuman(), 'bot0', avatars, 1)
    for (const game of ['narmast', 'imposterjakten', 'kortkaos', 'gissa-priset']) {
      state = setGame(state, game)
      expect(botIds(state)).toEqual(['bot0'])
    }
    // Värden kan fortfarande ta bort dem, även i ett spel utan botar.
    expect(botIds(removeBot(setGame(state, 'kortkaos'), 'bot0'))).toEqual([])
  })

  it('i ett spel utan botar står botarna över matchen och kommer tillbaka efteråt', () => {
    for (const game of ['imposterjakten', 'kortkaos']) {
      const humans: GameState['players'] = {
        a: { name: 'A', avatar: '🤪' },
        b: { name: 'B', avatar: '🎩' },
        c: { name: 'C', avatar: '😴' },
      }
      let state: GameState = { ...initialState('tantpanik'), players: humans, scores: { a: 0, b: 0, c: 0 } }
      state = setGame(addBot(state, 'bot0', avatars, 3, seeded(1)), game)
      // Två riktiga spelare och en bot räcker inte: botar räknas inte som spelare här.
      const twoAndBot: GameState = { ...state, players: { a: humans.a, b: humans.b, bot0: state.players.bot0 } }
      expect(hostStart({ state: twoAndBot, secrets: null }, ['a', 'b', 'bot0'], 0, seeded(2)).state).toBe(twoAndBot)
      const host = hostStart({ state, secrets: null }, ['a', 'b', 'c', 'bot0'], 0, seeded(2))
      expect(host.state.phase).toBe('playing')
      expect(host.state.players.bot0).toBeUndefined()
      expect(host.state.matchPlayerIds).not.toContain('bot0')
      expect(host.state.benchBots.bot0?.bot).toBe('normal')
      const back = abortMatch(host.state)
      expect(back.players.bot0?.bot).toBe('normal')
      expect(back.benchBots).toEqual({})
      expect(botIds(back)).toEqual(['bot0'])
      // Även när en annan tar över som värd mitt i matchen.
      const takenOver = takeOverState(host.state, 0)
      expect(botIds(takenOver)).toEqual(['bot0'])
      expect(takenOver.benchBots).toEqual({})
    }
  })

  it('i Exploderande Tanter räknas botarna som vanliga spelare i kvällens ställning', () => {
    let state: GameState = addBot(withHuman(), 'bot0', avatars, 1, seeded(1))
    let host: HostState = hostStart({ state, secrets: null }, ['me', 'bot0'], 0, seeded(2))
    expect(host.state.phase).toBe('playing')
    expect(host.state.practice).toBe(false)
    // Spela tills någon vinner, med botens beslut för båda.
    for (let step = 0; step < 2000 && host.state.phase === 'playing'; step++) {
      const table = host.state.tantpanik!
      if (table.winner || table.step === 'window') {
        host = hostDeadline(host, host.state.deadline!, host.state.deadline!, ['me', 'bot0'], seeded(step))
        continue
      }
      const id = table.order.find((player) => decideBotMove(botSight(host as TantHost, player)!, 'normal', seeded(step)))
      if (!id) break
      const move = decideBotMove(botSight(host as TantHost, id)!, 'normal', seeded(step))!
      const next = hostMove(host, id, move, ['me', 'bot0'], step * 1000, seeded(step))
      host = next.state.tantpanik !== host.state.tantpanik ? next : hostMove(host, id, { type: 'tDraw' }, ['me', 'bot0'], step * 1000, seeded(step))
    }
    state = host.state
    expect(state.phase).toBe('finished')
    expect(Object.keys(state.leaderboard).sort()).toEqual(['bot0', 'me'])
    expect(state.leaderboard.bot0.bot).toBe('normal')
  })
})

describe('kloka botar', () => {
  it('slösar aldrig Nope! eller Desarmera på ett par (Normal och Svår)', () => {
    let host = startTantMatch(lobby(2), seeded(3))
    const [a] = host.state.tantpanik!.order
    host = sync({
      ...host,
      secrets: {
        ...host.secrets,
        hands: { ...host.secrets.hands, [a]: [{ id: 'n1', type: 'nadu' }, { id: 'n2', type: 'nadu' }, { id: 'f1', type: 'fika' }, { id: 'f2', type: 'fika' }] },
      },
    })
    for (const level of ['normal', 'svar'] as BotLevel[]) {
      for (let seed = 1; seed <= 20; seed++) {
        expect(decideBotMove(botSight(host, a)!, level, seeded(seed))).toEqual({ type: 'tDraw' })
      }
    }
  })
})

describe('risk och kunskap', () => {
  // En match med tre spelare där den första har handen hand och högen har deck kort (tanterna räknas ur bordet).
  function setup(hand: CardType[], deck: number): { host: TantHost; me: string } {
    let host = startTantMatch(lobby(3), seeded(4))
    const me = host.state.tantpanik!.order[0]
    const cards = (types: CardType[], prefix: string) => types.map((type, i) => ({ id: `${prefix}${i}`, type }))
    host = sync({
      ...host,
      state: { ...host.state, tantpanik: { ...host.state.tantpanik!, current: me, step: 'turn', level: 'normal' } },
      secrets: {
        ...host.secrets,
        deck: cards(Array.from({ length: deck }, () => 'kupong' as CardType), 'd'),
        hands: { ...host.secrets.hands, [me]: cards(hand, 'h') },
      },
    })
    return { host, me }
  }
  const protective = ['intemin', 'dubbelpass', 'dudar', 'underifran', 'blanda', 'tjuvkika', 'mobblera']

  it('en bot som vet att tanten ligger överst drar aldrig om den har ett skyddskort', () => {
    for (const card of ['intemin', 'dubbelpass', 'dudar', 'underifran', 'blanda', 'mobblera'] as CardType[]) {
      const { host, me } = setup([card, 'kupong'], 20)
      // Sett med Se framtiden.
      const peeked = { ...host, secrets: { ...host.secrets, peek: { [me]: ['tant', 'kupong', 'kupong'] as CardType[] } } }
      for (const level of ['normal', 'svar'] as BotLevel[]) {
        for (let seed = 1; seed <= 30; seed++) {
          expect(decideBotMove(botSight(peeked, me)!, level, seeded(seed))).not.toEqual({ type: 'tDraw' })
          // Eller för att den själv gömde tanten överst.
          expect(decideBotMove(botSight(host, me)!, level, seeded(seed), { n: 0, bombAt: 0 })).not.toEqual({ type: 'tDraw' })
        }
      }
    }
  })

  it('spelar fler skyddskort när risken är hög än när den är låg', () => {
    for (const level of ['normal', 'svar'] as BotLevel[]) {
      const count = (deck: number) => {
        const { host, me } = setup(['intemin', 'dubbelpass', 'kupong'], deck)
        let played = 0
        for (let seed = 1; seed <= 200; seed++) {
          const move = decideBotMove(botSight(host, me)!, level, seeded(seed))
          if (move?.type === 'tPlay' && move.cards.some((id) => protective.includes(host.secrets.hands[me].find((c) => c.id === id)!.type))) played++
        }
        return played
      }
      // Två tanter i högen: 4 kort ger hög risk, 40 kort låg.
      expect(count(4)).toBeGreaterThan(count(40) + 50)
      expect(count(40)).toBe(0)
    }
  })

  it('tittar med Se framtiden före ett drag när risken är hög', () => {
    const { host, me } = setup(['tjuvkika', 'kupong'], 4)
    expect(decideBotMove(botSight(host, me)!, 'normal', seeded(1))).toEqual({ type: 'tPlay', cards: ['h0'] })
  })

  it('minns var den själv gömde tanten: ett steg närmare toppen för varje kort som dras uppifrån', () => {
    const table = startTantMatch(lobby(3), seeded(2)).state.tantpanik!
    // Texterna spelar ingen roll, bara den strukturerade händelsen (deck).
    const at = (events: (DeckChange | undefined)[]) => ({ ...table, log: events.map((deck, i) => ({ n: 100 + i, text: 'vad som helst', deck })) })
    let memory: BotMemory = { n: 99, bombAt: 2 }
    memory = observe(memory, at(['top', 'bottom']))
    expect(memory.bombAt).toBe(1)
    memory = observe(memory, at(['top', 'bottom', undefined, 'top']))
    expect(memory.bombAt).toBe(0)
    expect(observe(memory, at(['top', 'bottom', undefined, 'top', 'shuffle'])).bombAt).toBeNull()
    expect(observe({ n: 99, bombAt: 3 }, at(['arrange'])).bombAt).toBeNull()
    expect(observe({ n: 99, bombAt: 3 }, at(['place'])).bombAt).toBeNull()
  })

  it('spelmotorn märker händelserna med vad som hände med högen', () => {
    let host = startTantMatch(lobby(2), seeded(6))
    const [a, b] = host.state.tantpanik!.order
    host = sync({
      ...host,
      secrets: {
        ...host.secrets,
        deck: [{ id: 'x1', type: 'kupong' }, { id: 'x2', type: 'kupong' }, { id: 'x3', type: 'kupong' }, { id: 'x4', type: 'kupong' }],
        hands: { ...host.secrets.hands, [a]: [{ id: 'u', type: 'underifran' }, { id: 'bl', type: 'blanda' }], [b]: [{ id: 'f', type: 'fika' }] },
      },
    })
    const last = (h: TantHost) => h.state.tantpanik!.log.at(-1)!
    host = tantMove(host, a, { type: 'tPlay', cards: ['bl'] }, null, 0, seeded(1))
    host = tantDeadline(host, host.state.deadline!, host.state.deadline!, seeded(1))
    expect(last(host).deck).toBe('shuffle')
    const before = last(host).n
    host = tantMove(host, a, { type: 'tPlay', cards: ['u'] }, null, 0, seeded(1))
    host = tantDeadline(host, host.state.deadline!, host.state.deadline!, seeded(1))
    expect(host.state.tantpanik!.log.filter((event) => event.n > before).map((event) => event.deck)).toContain('bottom')
    host = tantMove(host, b, { type: 'tDraw' }, null, 0, seeded(1))
    expect(host.state.tantpanik!.log.some((event) => event.deck === 'top')).toBe(true)
  })

  it('Svår lägger tanten överst med Ändra framtiden när den kan ta sig undan, Normal lägger den längst ned', () => {
    const { host, me } = setup(['intemin'], 20)
    const arranging = {
      ...host,
      state: { ...host.state, tantpanik: { ...host.state.tantpanik!, step: 'arrange' as const } },
      secrets: { ...host.secrets, arranging: [{ id: 'a', type: 'kupong' as CardType }, { id: 'b', type: 'tant' as CardType }, { id: 'c', type: 'blanda' as CardType }] },
    }
    expect(decideBotMove(botSight(arranging, me)!, 'svar', seeded(1))).toEqual({ type: 'tArrange', order: [1, 0, 2] })
    expect(decideBotMove(botSight(arranging, me)!, 'normal', seeded(1))).toEqual({ type: 'tArrange', order: [0, 2, 1] })
  })
})

describe('stöld medan jag väljer ett kort', () => {
  it('ett kort som just stulits går inte att spela, och inget annat ändras', () => {
    let host = startTantMatch(lobby(2), seeded(8))
    const [a, b] = host.state.tantpanik!.order
    host = sync({
      ...host,
      state: { ...host.state, tantpanik: { ...host.state.tantpanik!, current: b } },
      secrets: {
        ...host.secrets,
        hands: { ...host.secrets.hands, [a]: [{ id: 'blanda', type: 'blanda' }], [b]: [{ id: 'k1', type: 'kupong' }, { id: 'k2', type: 'kupong' }] },
      },
    })
    // b spelar ett par mot a och tar a:s enda kort, Blanda.
    host = tantMove(host, b, { type: 'tPlay', cards: ['k1', 'k2'], target: a }, null, 0, seeded(1))
    host = tantDeadline(host, host.state.deadline!, host.state.deadline!, seeded(1))
    host = tantMove(host, b, { type: 'tPick', index: 0 }, null, 0, seeded(1))
    expect(host.secrets.hands[b].map((card) => card.id)).toContain('blanda')
    // a trycker på Blanda (som inte längre finns), även när det blivit a:s tur.
    const before = host
    host = { ...host, state: { ...host.state, tantpanik: { ...host.state.tantpanik!, current: a } } }
    const after = tantMove(host, a, { type: 'tPlay', cards: ['blanda'] }, 'x', 0, seeded(1))
    expect(after.state.tantpanik!.step).toBe('turn')
    expect(after.state.tantpanik!.discardCount).toBe(before.state.tantpanik!.discardCount)
    expect(myTantView(after.secrets, after.state.tantpanik!, a).notice?.text).toBe('Det gick inte just nu.')
    expect(after.secrets.hands[b].map((card) => card.id)).toContain('blanda')
  })
})

describe('Spola fram när bara botar är kvar', () => {
  it('spelar klart till ett giltigt slut med rätt placeringar', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const random = seeded(seed)
      // p1 är en riktig spelare som redan exploderat, de andra är botar.
      const base = lobby(3 + (seed % 3))
      const levels: BotLevel[] = ['latt', 'normal', 'svar']
      const players = Object.fromEntries(
        Object.entries(base.players).map(([id, p], i) => [id, id === 'p1' ? p : { ...p, bot: levels[i % 3] }]),
      ) as GameState['players']
      let host = startTantMatch({ ...base, players }, random)
      const total = countAllCards(host.secrets)
      host = sync({
        ...host,
        state: { ...host.state, tantpanik: { ...host.state.tantpanik!, out: ['p1'], current: host.state.tantpanik!.order.find((id) => id !== 'p1')! } },
      })
      expect(onlyBotsLeft(host.state)).toBe(true)
      const end = fastForwardBots(host, 1_000_000, random)
      const table = end.state.tantpanik!
      expect(table.error).toBeNull()
      expect(table.winner).not.toBeNull()
      expect(players[table.winner!].bot).toBeDefined()
      expect(table.out).toHaveLength(table.order.length - 1)
      expect(table.out[0]).toBe('p1')
      expect(table.ending).toBe(true)
      expect(end.state.deadline).toBe(1_000_000 + END_MS)
      expect(countAllCards(end.secrets)).toBe(total)
      // Slutet: placeringen ger poäng, den som åkte ut först (p1) får 1 och vinnaren lika många som spelarna.
      const finished = tantDeadline(end, end.state.deadline!, end.state.deadline!, random)
      expect(finished.state.phase).toBe('finished')
      expect(finished.state.scores.p1).toBe(1)
      expect(finished.state.scores[table.winner!]).toBe(table.order.length)
    }
  })

  it('gör ingenting så länge en riktig spelare är kvar', () => {
    const host = startTantMatch(lobby(3), seeded(2))
    expect(onlyBotsLeft(host.state)).toBe(false)
    expect(fastForwardBots(host, 0, seeded(2))).toBe(host)
  })
})

describe('botarna fastnar aldrig', () => {
  // Spelar en hel match som runnern i useLobby: den bot som ska göra något (botMustAct) måste alltid ha ett drag som går
  // igenom, i varje steg. Nope! är frivilligt och klockan tar fönstret vidare. Räknar vilka kort som använts.
  function playToEnd(count: number, levels: BotLevel[], seed: number, used: Set<CardType>): { host: TantHost; fallbacks: number } {
    const random = seeded(seed)
    const players: GameState['players'] = {}
    for (let i = 1; i <= count; i++) players[`b${i}`] = { name: `Bot ${i}`, avatar: '🙂', bot: levels[i % levels.length] }
    let host = startTantMatch({ ...initialState('tantpanik'), players, tantSettings: { trap: true, level: 'normal' } }, random)
    const memories: Record<string, BotMemory> = {}
    let fallbacks = 0
    let seenAction = 0
    for (let step = 0; step < 4000 && host.state.phase === 'playing'; step++) {
      const now = step * 10_000
      const table = host.state.tantpanik!
      expect(table.error).toBeNull()
      // Det som hänt: vilka kort som spelats, desarmerats, slagit igen eller exploderat.
      const action = table.lastAction
      if (action && action.n !== seenAction) {
        seenAction = action.n
        if (action.kind === 'bomb') used.add('tant')
        if (action.kind === 'bomb' && action.saved) used.add('fika')
        if (action.kind === 'trap') used.add('snara')
      }
      if (table.step === 'window' && table.pending) for (const type of table.pending.cards) used.add(type)
      if (table.winner) {
        host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
        continue
      }
      const actor = table.order.find((id) => botMustAct(table, id))
      // Nope!: den första boten som vill säga det.
      const noper = table.step === 'window' ? table.order.find((id) => decideBotMove(botSight(host, id)!, players[id].bot!, seeded(seed + step))) : undefined
      const id = actor ?? noper
      if (!id) {
        expect(table.step).toBe('window')
        host = tantDeadline(host, host.state.deadline!, host.state.deadline!, random)
        continue
      }
      const sight = botSight(host, id)!
      const memory = observe(memories[id] ?? newBotMemory(sight.table), sight.table)
      const move = decideBotMove(sight, players[id].bot!, random, memory)
      // En bot som ska göra något har alltid ett beslut (annars skulle den stå still i lobbyn).
      if (actor) expect(move, `${id} i steget ${table.step}`).not.toBeNull()
      if (move?.type === 'tNope') used.add('nadu')
      let next = move ? tantMove(host, id, move, null, now, random) : host
      if (next.state.tantpanik === table && actor) {
        // Draget gick inte: reservdraget (som skyddet i useLobby) ska alltid gå.
        fallbacks++
        const fallback = botFallbackMove(sight)
        expect(fallback).not.toBeNull()
        next = tantMove(host, id, fallback!, null, now, random)
        expect(next.state.tantpanik).not.toBe(table)
      }
      if (move && next.state.tantpanik) memories[id] = remember(memory, move, sight, next.state.tantpanik)
      host = next
    }
    return { host, fallbacks }
  }

  it('hela matcher med bara botar tar alltid slut, och alla kort används', () => {
    const used = new Set<CardType>()
    let fallbacks = 0
    for (let seed = 1; seed <= 60; seed++) {
      const levels: BotLevel[][] = [['latt'], ['normal'], ['svar'], ['latt', 'normal', 'svar']]
      const result = playToEnd(2 + (seed % 9), levels[seed % levels.length], seed, used)
      expect(result.host.state.phase).toBe('finished')
      fallbacks += result.fallbacks
    }
    expect([...CARD_TYPES].filter((type) => !used.has(type))).toEqual([])
    // Botarnas egna beslut går alltid igenom, så reservdraget behövs aldrig.
    expect(fallbacks).toBe(0)
  })

  it('botarna försöker aldrig spela Tantsnaran i ett par eller tretal', () => {
    for (const level of ['latt', 'normal', 'svar'] as BotLevel[]) {
      for (let seed = 1; seed <= 200; seed++) {
        const host = startTantMatch(lobby(3), seeded(seed))
        const t = host.state.tantpanik!
        const me = t.current
        const hand = [
          { id: 's1', type: 'snara' as const },
          { id: 's2', type: 'snara' as const },
          { id: 's3', type: 'snara' as const },
          { id: 'v', type: 'vild' as const },
        ]
        const sight = { me, table: t, view: { ...myTantView(host.secrets, t, me), hand } }
        const move = decideBotMove(sight, level, seeded(seed * 7))
        if (move?.type === 'tPlay') expect(move.cards.some((id) => id.startsWith('s'))).toBe(false)
      }
    }
  })

  it('reservdraget finns i varje steg där en bot ska göra något', () => {
    const host = startTantMatch(lobby(3), seeded(4))
    const t = host.state.tantpanik!
    const me = t.current
    const sight = (table: typeof t) => ({ me, table, view: myTantView(host.secrets, table, me) })
    expect(botFallbackMove(sight(t))).toEqual({ type: 'tDraw' })
    expect(botFallbackMove(sight({ ...t, step: 'place' }))).toEqual({ type: 'tPlace', position: 0 })
    expect(botFallbackMove(sight({ ...t, step: 'pick', pick: { by: me, from: 'x', count: 3 } }))).toEqual({ type: 'tPick', index: 0 })
    expect(botFallbackMove(sight({ ...t, step: 'give', favor: { from: me, to: 'x' } }))?.type).toBe('tGive')
    expect(botFallbackMove({ ...sight({ ...t, step: 'arrange' }), view: { ...myTantView(host.secrets, t, me), arrange: ['blanda', 'tant', 'fika'] } })).toEqual({ type: 'tArrange', order: [0, 1, 2] })
    // Inte när det är någon annans tur, eller i Nope!-fönstret.
    const other = t.order.find((id) => id !== me)!
    expect(botFallbackMove({ me: other, table: t, view: myTantView(host.secrets, t, other) })).toBeNull()
    expect(botFallbackMove(sight({ ...t, step: 'window' }))).toBeNull()
  })
})
