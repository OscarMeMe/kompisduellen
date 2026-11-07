import { describe, expect, it } from 'vitest'
import { botGuess, botGuessDelay, PRICE_MARGIN } from '@/lib/botgissning'
import { addBot, addGuess, advanceFromReveal, botIds, hostStart, initialState, isValidGuess, resolveRound, type GameState } from '@/lib/match'
import { GAME_ITEMS } from '@/lib/prisdata'
import type { BotLevel } from '@/lib/tantbot'

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

const LEVELS: BotLevel[] = ['latt', 'normal', 'svar']

describe('botarnas gissningar', () => {
  it('Närmast vinner: ett giltigt tal 1–100, samma för alla svårigheter', () => {
    const seen = new Set<number>()
    for (const level of LEVELS) {
      const random = seeded(4)
      for (let i = 0; i < 1000; i++) {
        const guess = botGuess({ game: 'narmast', itemId: null }, level, random)!
        expect(isValidGuess('narmast', guess)).toBe(true)
        seen.add(guess)
      }
    }
    expect(seen.size).toBe(100)
    expect(botGuess({ game: 'narmast', itemId: null }, 'latt', seeded(9))).toBe(botGuess({ game: 'narmast', itemId: null }, 'svar', seeded(9)))
  })

  it('Gissa priset: rätt pris med en slumpad felmarginal, ±60 %, ±30 % och ±15 %, för alla frågor', () => {
    for (const level of LEVELS) {
      const random = seeded(7)
      for (const item of GAME_ITEMS) {
        const price = item.priceSek
        // Avrundningen av gissningen (som mest en halv krona) kan ge lite extra.
        const slack = 0.5 / price + 1e-9
        let widest = 0
        let exact = 0
        const TRIES = 100
        for (let i = 0; i < TRIES; i++) {
          const guess = botGuess({ game: 'gissa-priset', itemId: item.id }, level, random)!
          expect(isValidGuess('gissa-priset', guess)).toBe(true)
          const off = Math.abs(guess - price) / price
          expect(off).toBeLessThanOrEqual(PRICE_MARGIN[level] + slack)
          widest = Math.max(widest, off)
          if (guess === price) exact++
        }
        // Felmarginalen används, och boten gissar inte exakt rätt för det mesta. Under en krona (t.ex. 5 öre) är felmarginalen
        // ibland mindre än ett öre, och mindre än så går inte att skriva.
        expect(widest).toBeGreaterThan(PRICE_MARGIN[level] * 0.6 - (price < 1 ? 0.01 / price : 0))
        if (price >= 1) expect(exact).toBeLessThan(TRIES / 2)
      }
    }
    expect(botGuess({ game: 'gissa-priset', itemId: null }, 'normal', seeded(1))).toBeNull()
  })

  it('gissar i god tid innan tiden är ute', () => {
    const random = seeded(3)
    for (const seconds of [15, 30, 45, 60]) {
      for (let i = 0; i < 200; i++) {
        const delay = botGuessDelay(seconds, random)
        expect(delay).toBeGreaterThanOrEqual(1500)
        expect(delay).toBeLessThan(seconds * 1000 * 0.7)
      }
    }
  })
})

describe('botar i gissningsspelen', () => {
  for (const game of ['narmast', 'gissa-priset']) {
    it(`${game}: en spelare och en bot är en vanlig match, och boten står i kvällens ställning`, () => {
      let state: GameState = { ...initialState(game), players: { me: { name: 'Mia', avatar: '🤪' } }, scores: { me: 0 } }
      state = addBot(state, 'bot0', ['🎩', '😴'], 1, seeded(1))
      expect(botIds(state)).toEqual(['bot0'])
      state = hostStart({ state, secrets: null }, ['me', 'bot0'], 0, seeded(2)).state
      expect(state.phase).toBe('guessing')
      expect(state.practice).toBe(false)
      const random = seeded(5)
      for (let step = 0; step < 50 && state.phase !== 'finished'; step++) {
        const now = (step + 1) * 100_000
        if (state.phase === 'guessing') {
          const guess = botGuess(state, 'svar', random)!
          // Jag gissar samma som boten, så att någon alltid får poäng.
          state = addGuess(addGuess(state, 'bot0', guess, now), 'me', guess, now)
          state = resolveRound(state, now)
        } else if (state.phase === 'reveal') {
          state = advanceFromReveal(state, now, state.round)
        }
      }
      expect(state.phase).toBe('finished')
      expect(Object.keys(state.leaderboard).sort()).toEqual(['bot0', 'me'])
      expect(state.leaderboard.bot0.bot).toBe('normal')
      expect(state.leaderboard.bot0.played).toBe(1)
    })
  }
})
