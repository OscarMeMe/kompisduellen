import { describe, expect, it } from 'vitest'
import { dealRound, DEFAULT_SETTINGS } from '@/lib/imposterjakten'
import { priceRules } from '@/lib/gissa-priset'
import { startCardMatch, shuffle, type CardGameRules } from '@/lib/kort'
import { addPlayers, initialState } from '@/lib/match'
import { narmastRules } from '@/lib/narmast'
import { cardRulesFor } from '@/lib/spelregler'

// Slumpen på riktigt, utan fuskad slumpgenerator: varje utfall ska komma ungefär lika ofta, och aldrig alltid samma.
// Gränserna är så vida att testet i praktiken aldrig faller av en slump (över tio standardavvikelser).
const RUNS = 4000
const PLAYERS = ['a', 'b', 'c', 'd']

function expectEven(counts: Map<string, number>, outcomes: number) {
  expect(counts.size).toBe(outcomes)
  const fair = 1 / outcomes
  for (const [outcome, count] of counts) {
    const share = count / RUNS
    expect(share, outcome).toBeGreaterThan(fair - 0.07)
    expect(share, outcome).toBeLessThan(fair + 0.07)
  }
}

function tally(pick: () => string) {
  const counts = new Map<string, number>()
  for (let i = 0; i < RUNS; i++) {
    const value = pick()
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

describe('slumpen i spelen', () => {
  it('Imposterjakten: alla blir impostern lika ofta', () => {
    expectEven(tally(() => dealRound(PLAYERS, DEFAULT_SETTINGS, []).secrets.imposter), 4)
  })

  it('Imposterjakten: alla börjar lika ofta, oberoende av vem som är impostern', () => {
    expectEven(tally(() => dealRound(PLAYERS, DEFAULT_SETTINGS, []).table.order[0]), 4)
    const imposterStarts = tally(() => {
      const { table, secrets } = dealRound(PLAYERS, DEFAULT_SETTINGS, [])
      return String(table.order[0] === secrets.imposter)
    })
    const share = (imposterStarts.get('true') ?? 0) / RUNS
    expect(share).toBeGreaterThan(0.25 - 0.07)
    expect(share).toBeLessThan(0.25 + 0.07)
  })

  it('Imposterjakten: orden varierar', () => {
    const words = tally(() => dealRound(PLAYERS, DEFAULT_SETTINGS, []).secrets.wordId)
    expect(words.size).toBeGreaterThan(100)
  })

  it('Gissa priset: första frågan varierar, och ingen fråga kommer två gånger förrän alla visats', () => {
    const first = tally(() => priceRules.pickItem!([]).itemId!)
    expect(first.size).toBeGreaterThan(100)
    let used: string[] = []
    const seen = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const picked = priceRules.pickItem!(used)
      expect(seen.has(picked.itemId!)).toBe(false)
      seen.add(picked.itemId!)
      used = picked.usedItemIds
    }
  })

  it('Närmast vinner: talet ligger mellan 1 och 100 och är inte alltid samma', () => {
    const targets = new Set<number>()
    for (let i = 0; i < RUNS; i++) {
      const { target } = narmastRules.scoreRound({}, null)
      expect(target).toBeGreaterThanOrEqual(1)
      expect(target).toBeLessThanOrEqual(100)
      targets.add(target)
    }
    expect(targets.size).toBe(100)
  })

  it('Kortkaos: alla blir första domare lika ofta', () => {
    const rules = cardRulesFor('kortkaos') as CardGameRules
    let state = initialState('kortkaos')
    state = addPlayers(state, Object.fromEntries(PLAYERS.map((id) => [id, { name: id, avatar: '🙂' }])))
    expectEven(tally(() => startCardMatch(state, rules, 0).state.cards!.judge), 4)
  })

  it('Korten blandas jämnt', () => {
    expectEven(tally(() => shuffle(['a', 'b', 'c', 'd'])[0]), 4)
    expectEven(tally(() => shuffle(['a', 'b', 'c', 'd'])[3]), 4)
  })
})
