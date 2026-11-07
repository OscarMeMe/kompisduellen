import { describe, expect, it } from 'vitest'
import { addBot, botIds, hostDeadline, hostMove, hostStart, initialState, removeBot, setBotLevel, setGame, type GameState, type HostState } from '@/lib/match'
import { botSight, decideBotMove, type BotLevel } from '@/lib/tantbot'
import { countAllCards, startTantMatch, sync, tantDeadline, tantMove, type TantHost } from '@/lib/tantpanik'

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

  it('gömmer tanten överst när nästa ska dra (Normal)', () => {
    let host = startTantMatch(lobby(2), seeded(11))
    const [a] = host.state.tantpanik!.order
    host = sync({
      ...host,
      secrets: { ...host.secrets, deck: [{ id: 'bomb', type: 'tant' }, ...host.secrets.deck], hands: { ...host.secrets.hands, [a]: [{ id: 'f', type: 'fika' }] } },
    })
    host = tantMove(host, a, { type: 'tDraw' }, null, 0, seeded(1))
    expect(host.state.tantpanik!.step).toBe('place')
    expect(decideBotMove(botSight(host, a)!, 'normal', () => 0.1)).toEqual({ type: 'tPlace', position: 0 })
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

  it('finns bara i Exploderande Tanter', () => {
    const other = { ...withHuman(), game: 'narmast' }
    expect(addBot(other, 'bot0', avatars, 1)).toBe(other)
    const state = addBot(withHuman(), 'bot0', avatars, 1)
    expect(botIds(setGame(state, 'narmast'))).toEqual([])
  })

  it('man kan spela ensam med botar, och botarna räknas inte i kvällens ställning', () => {
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
    expect(Object.keys(state.leaderboard)).toEqual(['me'])
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
