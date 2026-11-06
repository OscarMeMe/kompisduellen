import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuessStatusList } from '@/components/lobby/GuessStatusList'
import { initialState } from '@/lib/match'

describe('spelarna under statusraden', () => {
  it('står i matchens ordning, även när närvarolistan har en annan ordning efter en omladdning', () => {
    const players = { a: { name: 'Anna', avatar: '🙂' }, b: { name: 'Bo', avatar: '🙂' }, c: { name: 'Cia', avatar: '🙂' } }
    const state = { ...initialState('gissa-priset'), phase: 'guessing' as const, players }
    const online = ['c', 'a', 'b'].map((id) => ({ id, name: players[id as 'a'].name, avatar: '🙂', host: id === 'a', joinedAt: 0 }))
    const html = renderToStaticMarkup(<GuessStatusList state={state} online={online} clockOffset={0} meId="a" locked={null} hideLine />)
    expect(html.indexOf('Anna')).toBeLessThan(html.indexOf('Bo'))
    expect(html.indexOf('Bo')).toBeLessThan(html.indexOf('Cia'))
  })
})
