import { describe, expect, it } from 'vitest'
import {
  addGuess,
  addPlayers,
  advanceFromReveal,
  backToWaiting,
  canStart,
  everyoneHasGuessed,
  guessSecondsFor,
  handleDeadline,
  hostAdvance,
  hostDeadline,
  hostMove,
  hostPresence,
  hostRematch,
  hostRematchStart,
  hostStart,
  initialState,
  nextRound,
  pauseReveal,
  resumeReveal,
  cancelRematch,
  REMATCH_SECONDS,
  resolveRound,
  restoreHostState,
  roundOptionsFor,
  setGame,
  setTempo,
  startGame,
  type GameState,
  type HostState,
} from '@/lib/match'

const NOW = 1_000_000

// En lobby i väntrummet med spelarna a, b, c … (bara de som anges).
function lobby(game: string, ids: string[], changes: Partial<GameState> = {}): GameState {
  const players = Object.fromEntries(ids.map((id) => [id, { name: id.toUpperCase(), avatar: '👻' }]))
  return { ...addPlayers(initialState(game), players), ...changes }
}

// Spelar en runda: alla gissar, rundan avgörs med ett bestämt rätt svar.
function playRound(state: GameState, guesses: Record<string, number>, target: number, now = NOW): GameState {
  let next = state
  for (const [id, value] of Object.entries(guesses)) next = addGuess(next, id, value)
  return resolveRound(next, now, target)
}

describe('tempo i lobbyn', () => {
  it('låter värden välja 20, 30 eller 60 sekunder och ignorerar andra tider', () => {
    const state = lobby('gissa-priset', ['a', 'b'])
    expect(guessSecondsFor(state)).toBe(30)
    expect(setTempo(state, { guessSeconds: 20 }).guessSeconds).toBe(20)
    expect(setTempo(state, { guessSeconds: 60 }).guessSeconds).toBe(60)
    expect(setTempo(state, { guessSeconds: 45 })).toBe(state)
  })

  it('ändrar inte tempot under en match', () => {
    const playing = startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW)
    expect(setTempo(playing, { guessSeconds: 60, autoAdvance: false })).toBe(playing)
  })

  it('använder vald svarstid när rundan startar', () => {
    const state = setTempo(lobby('gissa-priset', ['a', 'b']), { guessSeconds: 60 })
    const playing = startGame(state, ['a', 'b'], NOW)
    expect(playing.deadline).toBe(NOW + 60_000)
  })

  it('låter Närmast vinner behålla sin egen tid och automatiska övergång', () => {
    const state = setTempo(lobby('gissa-priset', ['a', 'b']), { guessSeconds: 60, autoAdvance: false })
    const narmast = setGame(state, 'narmast')
    const playing = startGame(narmast, ['a', 'b'], NOW)
    expect(playing.deadline).toBe(NOW + 15_000)
    expect(playRound(playing, { a: 10, b: 20 }, 50).deadline).not.toBeNull()
  })
})

describe('efter facit', () => {
  it('startar en nedräkning i automatiskt läge', () => {
    const playing = startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW)
    const reveal = playRound(playing, { a: 100, b: 200 }, 100, NOW + 5000)
    expect(reveal.phase).toBe('reveal')
    expect(reveal.deadline).toBe(NOW + 5000 + 12_000)
  })

  it('står kvar utan klocka när värden går vidare själv', () => {
    const state = setTempo(lobby('gissa-priset', ['a', 'b']), { autoAdvance: false })
    const reveal = playRound(startGame(state, ['a', 'b'], NOW), { a: 100, b: 200 }, 100)
    expect(reveal.deadline).toBeNull()
    // Ingen timer kan flytta matchen vidare, bara värdens klick.
    expect(handleDeadline(reveal, NOW + 999_999, NOW + 12_000)).toBe(reveal)
    const next = advanceFromReveal(reveal, NOW + 1, reveal.round)
    expect(next.phase).toBe('guessing')
    expect(next.round).toBe(2)
  })

  it('hoppar inte över en runda vid dubbelklick', () => {
    const reveal = playRound(startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW), { a: 1, b: 2 }, 1)
    const once = advanceFromReveal(reveal, NOW + 1, 1)
    const twice = advanceFromReveal(once, NOW + 2, 1)
    expect(once.round).toBe(2)
    expect(twice).toBe(once)
  })

  it('låter inte en gammal timer avsluta nästa runda efter att värden hoppat fram', () => {
    const reveal = playRound(startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW), { a: 1, b: 2 }, 1)
    const revealDeadline = reveal.deadline!
    const round2 = advanceFromReveal(reveal, NOW + 100, 1)
    // Facit-timern hinner löpa ut samtidigt som klicket: den ska inte göra något.
    expect(handleDeadline(round2, revealDeadline + 1, revealDeadline)).toBe(round2)
    // Inte heller den första rundans gissningstimer.
    expect(handleDeadline(round2, NOW + 999_999, NOW + 30_000)).toBe(round2)
  })

  it('går vidare bara en gång när timern och klicket kommer samtidigt', () => {
    const reveal = playRound(startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW), { a: 1, b: 2 }, 1)
    const byTimer = handleDeadline(reveal, reveal.deadline!, reveal.deadline!)
    const thenClick = advanceFromReveal(byTimer, reveal.deadline! + 1, 1)
    expect(byTimer.round).toBe(2)
    expect(thenClick).toBe(byTimer)
  })

  it('väntar inte på klockan när den inte har löpt ut', () => {
    const playing = startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW)
    expect(handleDeadline(playing, playing.deadline! - 1, playing.deadline!)).toBe(playing)
    expect(handleDeadline(playing, playing.deadline!, playing.deadline!).phase).toBe('reveal')
  })
})

describe('svar', () => {
  it('visar facit när alla aktiva spelare har svarat', () => {
    let state = startGame(lobby('gissa-priset', ['a', 'b', 'c']), ['a', 'b', 'c'], NOW)
    state = addGuess(addGuess(state, 'a', 10), 'b', 20)
    expect(everyoneHasGuessed(state, ['a', 'b', 'c'])).toBe(false)
    // c har lämnat: de två som är kvar har svarat.
    expect(everyoneHasGuessed(state, ['a', 'b'])).toBe(true)
  })

  it('tar inte emot svar efter facit eller två gånger', () => {
    let state = startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW)
    state = addGuess(state, 'a', 10)
    expect(addGuess(state, 'a', 99)).toBe(state)
    const reveal = resolveRound(state, NOW, 10)
    expect(addGuess(reveal, 'b', 10)).toBe(reveal)
  })
})

describe('start och testläge', () => {
  it('kräver två spelare i Närmast vinner', () => {
    expect(canStart('narmast', 1)).toBe(false)
    expect(canStart('narmast', 2)).toBe(true)
    const alone = lobby('narmast', ['a'])
    expect(startGame(alone, ['a'], NOW)).toBe(alone)
  })

  it('låter en ensam spelare testa Gissa priset', () => {
    expect(canStart('gissa-priset', 1)).toBe(true)
    const playing = startGame(lobby('gissa-priset', ['a']), ['a'], NOW)
    expect(playing.phase).toBe('guessing')
    expect(playing.practice).toBe(true)
  })

  it('räknar inte en ensam provomgång i topplistan', () => {
    let state = startGame(lobby('gissa-priset', ['a'], { rounds: 1 }), ['a'], NOW)
    state = nextRound(playRound(state, { a: 100 }, 100), NOW)
    expect(state.phase).toBe('finished')
    expect(state.leaderboard).toEqual({})
    expect(state.matchesPlayed).toBe(0)
    expect(state.gamesPlayed).toEqual({})
  })

  it('räknar en vanlig match och behåller topplistan vid revansch', () => {
    let state = startGame(lobby('gissa-priset', ['a', 'b'], { rounds: 1 }), ['a', 'b'], NOW)
    state = nextRound(playRound(state, { a: 100, b: 1000 }, 100), NOW)
    expect(state.practice).toBe(false)
    expect(state.leaderboard.a).toMatchObject({ wins: 1, played: 1 })
    expect(state.leaderboard.b).toMatchObject({ wins: 0, played: 1 })

    const again = backToWaiting(state)
    expect(again.phase).toBe('waiting')
    expect(again.leaderboard).toEqual(state.leaderboard)
    expect(again.matchesPlayed).toBe(1)
    expect(again.matchRounds).toEqual([])
    expect(Object.keys(again.players)).toEqual(['a', 'b'])

    // Revanschen läggs till på samma topplista.
    let rematch = startGame(again, ['a', 'b'], NOW)
    rematch = nextRound(playRound(rematch, { a: 1000, b: 100 }, 100), NOW)
    expect(rematch.leaderboard.a).toMatchObject({ wins: 1, played: 2 })
    expect(rematch.leaderboard.b).toMatchObject({ wins: 1, played: 2 })
  })

  it('sparar varje runda för höjdpunkterna och börjar om vid ny match', () => {
    let state = startGame(lobby('gissa-priset', ['a', 'b'], { rounds: 2 }), ['a', 'b'], NOW)
    state = nextRound(playRound(state, { a: 1, b: 2 }, 1), NOW)
    state = playRound(state, { a: 5 }, 5)
    expect(state.matchRounds).toHaveLength(2)
    expect(state.matchRounds[1].guesses).toEqual({ a: 5 })
    const fresh = startGame(backToWaiting(nextRound(state, NOW)), ['a', 'b'], NOW)
    expect(fresh.matchRounds).toEqual([])
  })
})

describe('värdens funktioner för gissningsspelen', () => {
  it('startar och avslutar rundor precis som förut, utan hemlig data', () => {
    const state = lobby('narmast', ['a', 'b'])
    const host = hostStart({ state, secrets: null }, ['a', 'b'], NOW)
    expect(host).toEqual({ state: startGame(state, ['a', 'b'], NOW), secrets: null })
    const resolved = hostDeadline(host, host.state.deadline!, host.state.deadline!, ['a', 'b'])
    expect(resolved.state.phase).toBe('reveal')
    expect(hostAdvance(resolved, NOW, 1, ['a', 'b']).state.round).toBe(2)
  })

  it('ignorerar kortdrag och närvaro i ett gissningsspel', () => {
    const host = hostStart({ state: lobby('narmast', ['a', 'b']), secrets: null }, ['a', 'b'], NOW)
    expect(hostMove(host, 'a', { type: 'done' }, ['a', 'b'], NOW)).toBe(host)
    expect(hostPresence(host, ['a'], NOW)).toBe(host)
  })

  it('behåller 3, 5 och 10 rundor med 5 som förval', () => {
    expect(initialState('narmast').rounds).toBe(5)
    expect(roundOptionsFor('gissa-priset')).toEqual([3, 5, 10])
    expect(setGame(lobby('narmast', ['a'], { rounds: 10 }), 'gissa-priset').rounds).toBe(10)
  })
})

describe('omladdning hos värden', () => {
  it('fortsätter med sparat tillstånd och fyller i fält som saknas', () => {
    const state = startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW)
    const saved = JSON.parse(JSON.stringify({ state, secrets: null }))
    delete saved.state.cards
    expect(restoreHostState(saved)).toEqual({ state, secrets: null })
  })

  it('börjar om när datan är trasig eller ett kortspel saknar sin hemliga data', () => {
    expect(restoreHostState(null)).toBeNull()
    expect(restoreHostState({ state: { phase: 1 } })).toBeNull()
    const playing = { ...initialState('narmast'), phase: 'playing' }
    expect(restoreHostState({ state: playing, secrets: null })).toBeNull()
  })
})

describe('revansch', () => {
  // En avslutad match med två spelare i Gissa priset: a vann.
  function finished(game = 'gissa-priset', ids = ['a', 'b']): HostState {
    let state = startGame(lobby(game, ids, { rounds: 1, guessSeconds: 60 }), ids, NOW)
    state = nextRound(playRound(state, { a: 100, b: 1000 }, 100), NOW)
    return { state, secrets: null }
  }

  it('går tillbaka till väntrummet med samma spel och inställningar och startar en nedräkning', () => {
    const before = finished()
    const host = hostRematch(before, NOW)
    expect(host.state.phase).toBe('waiting')
    expect(host.state.game).toBe('gissa-priset')
    expect(host.state.rounds).toBe(1)
    expect(host.state.guessSeconds).toBe(60)
    expect(host.state.rematchAt).toBe(NOW + REMATCH_SECONDS * 1000)
    // Spelarna och kvällens ställning följer med, men matchens poäng nollas.
    expect(Object.keys(host.state.players)).toEqual(['a', 'b'])
    expect(host.state.leaderboard).toEqual(before.state.leaderboard)
    expect(host.state.scores).toEqual({ a: 0, b: 0 })
  })

  it('startar en ny match när nedräkningen är slut, utan att räkna den förra matchen igen', () => {
    const host = hostRematch(finished(), NOW)
    const at = host.state.rematchAt!
    const started = hostRematchStart(host, ['a', 'b'], at, at)
    expect(started.state.phase).toBe('guessing')
    expect(started.state.round).toBe(1)
    expect(started.state.rematchAt).toBeNull()
    expect(started.state.matchesPlayed).toBe(1)
    expect(started.state.leaderboard.a).toMatchObject({ wins: 1, played: 1 })
  })

  it('gör ingenting vid dubbelklick eller medan en match pågår', () => {
    const host = hostRematch(finished(), NOW)
    expect(hostRematch(host, NOW + 10)).toBe(host)
    const running = hostStart({ state: lobby('gissa-priset', ['a', 'b']), secrets: null }, ['a', 'b'], NOW)
    expect(hostRematch(running, NOW)).toBe(running)
  })

  it('startar inte före nedräkningens slut och inte två gånger', () => {
    const host = hostRematch(finished(), NOW)
    const at = host.state.rematchAt!
    expect(hostRematchStart(host, ['a', 'b'], at - 1, at)).toBe(host)
    const started = hostRematchStart(host, ['a', 'b'], at, at)
    expect(hostRematchStart(started, ['a', 'b'], at + 5, at)).toBe(started)
  })

  it('avbryts om för få spelare finns kvar', () => {
    const host = hostRematch(finished('narmast'), NOW)
    const at = host.state.rematchAt!
    const result = hostRematchStart(host, ['a'], at, at)
    expect(result.state.phase).toBe('waiting')
    expect(result.state.rematchAt).toBeNull()
  })

  it('låter en gammal timer inte starta något efter att revanschen avbrutits', () => {
    const host = hostRematch(finished(), NOW)
    const at = host.state.rematchAt!
    const cancelled = cancelRematch(host)
    expect(cancelled.state.rematchAt).toBeNull()
    expect(hostRematchStart(cancelled, ['a', 'b'], at, at)).toBe(cancelled)
    expect(cancelRematch(cancelled)).toBe(cancelled)
  })

  it('kan startas om efter en provomgång med en spelare', () => {
    let state = startGame(lobby('gissa-priset', ['a'], { rounds: 1 }), ['a'], NOW)
    state = nextRound(playRound(state, { a: 100 }, 100), NOW)
    const host = hostRematch({ state, secrets: null }, NOW)
    const at = host.state.rematchAt!
    const started = hostRematchStart(host, ['a'], at, at)
    expect(started.state.phase).toBe('guessing')
    expect(started.state.practice).toBe(true)
    expect(started.state.leaderboard).toEqual({})
  })
})

describe('paus efter facit', () => {
  function revealing() {
    return playRound(startGame(lobby('gissa-priset', ['a', 'b']), ['a', 'b'], NOW), { a: 100, b: 200 }, 100)
  }

  it('stoppar klockan och sparar tiden som var kvar', () => {
    const reveal = revealing()
    const paused = pauseReveal(reveal, NOW + 2000, 1, 'Värd')
    expect(paused.deadline).toBeNull()
    expect(paused.pause).toEqual({ by: 'Värd', msLeft: reveal.deadline! - (NOW + 2000) })
  })

  it('en pausad runda går inte vidare av sig själv', () => {
    const reveal = revealing()
    const paused = pauseReveal(reveal, NOW + 1000, 1, 'Värd')
    expect(handleDeadline(paused, NOW + 60_000, reveal.deadline!)).toBe(paused)
  })

  it('fortsätter med tiden som var kvar', () => {
    const paused = pauseReveal(revealing(), NOW + 1000, 1, 'Värd')
    const resumed = resumeReveal(paused, NOW + 30_000, 1)
    expect(resumed.pause).toBeNull()
    expect(resumed.deadline).toBe(NOW + 30_000 + paused.pause!.msLeft)
  })

  it('dubbeltryck gör ingenting extra', () => {
    const paused = pauseReveal(revealing(), NOW + 1000, 1, 'Värd')
    expect(pauseReveal(paused, NOW + 1500, 1, 'Värd')).toBe(paused)
    const resumed = resumeReveal(paused, NOW + 2000, 1)
    expect(resumeReveal(resumed, NOW + 2100, 1)).toBe(resumed)
  })

  it('pausar eller fortsätter inte fel runda', () => {
    const reveal = revealing()
    expect(pauseReveal(reveal, NOW, 2, 'Värd')).toBe(reveal)
    const paused = pauseReveal(reveal, NOW, 1, 'Värd')
    expect(resumeReveal(paused, NOW, 2)).toBe(paused)
  })

  it('Nästa nu under paus går vidare en gång och nollställer pausen', () => {
    const paused = pauseReveal(revealing(), NOW + 1000, 1, 'Värd')
    const next = advanceFromReveal(paused, NOW + 5000, 1)
    expect(next.round).toBe(2)
    expect(next.pause).toBeNull()
    expect(advanceFromReveal(next, NOW + 5100, 1)).toBe(next)
  })

  it('går inte att pausa när värden går vidare själv utan klocka', () => {
    const manual = playRound(
      startGame(lobby('gissa-priset', ['a', 'b'], { autoAdvance: false }), ['a', 'b'], NOW),
      { a: 100, b: 200 },
      100,
    )
    expect(pauseReveal(manual, NOW, 1, 'Värd')).toBe(manual)
  })
})

describe('snabbval vid revansch', () => {
  function finished(): HostState {
    let state = startGame(lobby('gissa-priset', ['a', 'b'], { rounds: 3, guessSeconds: 30 }), ['a', 'b'], NOW)
    state = { ...state, round: 3 }
    state = nextRound(playRound(state, { a: 100, b: 1000 }, 100), NOW)
    return { state, secrets: null }
  }

  it('nästa match använder valen på resultatsidan', () => {
    const host = hostRematch(finished(), NOW, { rounds: 10, guessSeconds: 60, autoAdvance: false })
    expect(host.state.rounds).toBe(10)
    expect(host.state.guessSeconds).toBe(60)
    expect(host.state.autoAdvance).toBe(false)
    expect(host.state.rematchAt).toBe(NOW + REMATCH_SECONDS * 1000)
  })

  it('utan val gäller samma inställningar som förut, och ogiltiga val ignoreras', () => {
    expect(hostRematch(finished(), NOW).state).toMatchObject({ rounds: 3, guessSeconds: 30, autoAdvance: true })
    expect(hostRematch(finished(), NOW, { rounds: 7, guessSeconds: 45 }).state).toMatchObject({ rounds: 3, guessSeconds: 30 })
  })

  it('startar matchen med de nya valen', () => {
    const host = hostRematch(finished(), NOW, { rounds: 10, guessSeconds: 20 })
    const at = host.state.rematchAt!
    const started = hostRematchStart(host, ['a', 'b'], at, at)
    expect(started.state.phase).toBe('guessing')
    expect(started.state.rounds).toBe(10)
    expect(started.state.deadline).toBe(at + 20_000)
  })
})
