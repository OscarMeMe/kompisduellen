import { describe, expect, it } from 'vitest'
import {
  abortMatch,
  addGuess,
  addPlayers,
  advanceFromReveal,
  backToWaiting,
  canStart,
  changeGame,
  everyoneHasGuessed,
  guessSecondsFor,
  handleDeadline,
  hostAdvance,
  hostCountdownStart,
  hostDeadline,
  hostMove,
  hostPresence,
  hostRematch,
  hostRematchStart,
  hostStart,
  initialState,
  matchWinners,
  nextRound,
  pauseReveal,
  rankLeaderboard,
  rankPlayers,
  podiumShare,
  resumeReveal,
  cancelRematch,
  REMATCH_SECONDS,
  resolveRound,
  restoreHostState,
  roundOptionsFor,
  roundStanding,
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

describe('provrunda', () => {
  const solo = () => hostStart({ state: lobby('gissa-priset', ['a'], { rounds: 10 }), secrets: null }, ['a'], NOW)

  it('har en runda, och lobbyns antal rundor kommer tillbaka efteråt', () => {
    const started = solo()
    expect(started.state.practice).toBe(true)
    expect(started.state.rounds).toBe(1)
    let state = nextRound(playRound(started.state, { a: 100 }, 100), NOW)
    expect(state.phase).toBe('finished')
    state = backToWaiting(state)
    expect(state.rounds).toBe(10)
    expect(state.savedRounds).toBeNull()
  })

  it('Testa mer ger en ny provrunda utan att tappa lobbyns inställning', () => {
    const finished = nextRound(playRound(solo().state, { a: 100 }, 100), NOW)
    const counting = hostRematch({ state: finished, secrets: null }, NOW)
    expect(counting.state.rounds).toBe(10)
    const at = counting.state.rematchAt!
    const again = hostRematchStart(counting, ['a'], at, at)
    expect(again.state.phase).toBe('guessing')
    expect(again.state.rounds).toBe(1)
    expect(again.state.practice).toBe(true)
  })

  it('en vanlig match med flera spelare använder lobbyns antal rundor', () => {
    const lobbyState = lobby('gissa-priset', ['a', 'b'], { rounds: 10 })
    expect(startGame(lobbyState, ['a', 'b'], NOW).rounds).toBe(10)
  })
})

describe('första starten med nedräkning', () => {
  it('startar en nedräkning och sedan matchen när tiden är ute', () => {
    const waiting: HostState = { state: lobby('gissa-priset', ['a', 'b']), secrets: null }
    const counting = hostCountdownStart(waiting, ['a', 'b'], NOW)
    expect(counting.state.phase).toBe('waiting')
    expect(counting.state.rematchAt).toBe(NOW + REMATCH_SECONDS * 1000)
    expect(counting.state.countdownKind).toBe('first')
    const at = counting.state.rematchAt!
    expect(hostRematchStart(counting, ['a', 'b'], at - 1, at)).toBe(counting)
    const started = hostRematchStart(counting, ['a', 'b'], at, at)
    expect(started.state.phase).toBe('guessing')
    // Svarstiden börjar först efter nedräkningen.
    expect(started.state.deadline).toBe(at + started.state.guessSeconds * 1000)
  })

  it('dubbelklick startar inte två nedräkningar', () => {
    const waiting: HostState = { state: lobby('gissa-priset', ['a', 'b']), secrets: null }
    const counting = hostCountdownStart(waiting, ['a', 'b'], NOW)
    expect(hostCountdownStart(counting, ['a', 'b'], NOW + 500)).toBe(counting)
  })

  it('startar inte med för få spelare, och avbryts om någon lämnar under nedräkningen', () => {
    const lonely: HostState = { state: lobby('narmast', ['a']), secrets: null }
    expect(hostCountdownStart(lonely, ['a'], NOW)).toBe(lonely)
    const waiting: HostState = { state: lobby('narmast', ['a', 'b']), secrets: null }
    const counting = hostCountdownStart(waiting, ['a', 'b'], NOW)
    const at = counting.state.rematchAt!
    expect(hostRematchStart(counting, ['a'], at, at).state.rematchAt).toBeNull()
  })

  it('värden kan avbryta', () => {
    const waiting: HostState = { state: lobby('gissa-priset', ['a', 'b']), secrets: null }
    expect(cancelRematch(hostCountdownStart(waiting, ['a', 'b'], NOW)).state.rematchAt).toBeNull()
  })
})

describe('byt spel efter en match', () => {
  function finished(): GameState {
    let state = startGame(lobby('gissa-priset', ['a', 'b', 'c'], { rounds: 1 }), ['a', 'b', 'c'], NOW)
    state = nextRound(playRound(state, { a: 100, b: 500, c: 900 }, 100), NOW)
    return state
  }

  it('går till väntrummet i samma lobby med spelare och ställning kvar, och markerar att värden väljer spel', () => {
    const before = finished()
    const next = changeGame(before)
    expect(next.phase).toBe('waiting')
    expect(next.choosingGame).toBe(true)
    expect(Object.keys(next.players)).toEqual(['a', 'b', 'c'])
    expect(next.leaderboard).toEqual(before.leaderboard)
    expect(next.matchesPlayed).toBe(1)
    expect(next.gamesPlayed).toEqual({ 'gissa-priset': 1 })
  })

  it('dubbeltryck gör ingenting extra', () => {
    const once = changeGame(finished())
    expect(changeGame(once)).toBe(once)
  })

  it('markeringen försvinner när värden väljer spel, även samma spel, och när nedräkningen startar', () => {
    const choosing = changeGame(finished())
    expect(setGame(choosing, 'narmast').choosingGame).toBe(false)
    expect(setGame(choosing, 'gissa-priset').choosingGame).toBe(false)
    const counting = hostCountdownStart({ state: choosing, secrets: null }, ['a', 'b', 'c'], NOW)
    expect(counting.state.choosingGame).toBe(false)
  })

  it('kvällens ställning räknar matcher från alla spel', () => {
    let state = changeGame(finished())
    state = setGame(state, 'narmast')
    state = startGame(state, ['a', 'b', 'c'], NOW)
    state = nextRound(playRound({ ...state, rounds: 1 }, { a: 10, b: 50, c: 90 }, 12), NOW)
    expect(state.matchesPlayed).toBe(2)
    expect(state.gamesPlayed).toEqual({ 'gissa-priset': 1, narmast: 1 })
    // Tre spelare i lobbyn, ingen dubblett.
    expect(Object.keys(state.leaderboard)).toHaveLength(3)
  })

  it('för få spelare för det nya spelet går att välja men kan inte startas', () => {
    const two = changeGame(
      nextRound(playRound(startGame(lobby('gissa-priset', ['a', 'b'], { rounds: 1 }), ['a', 'b'], NOW), { a: 100, b: 500 }, 100), NOW),
    )
    const kortkaos = setGame(two, 'kortkaos')
    expect(kortkaos.game).toBe('kortkaos')
    expect(canStart('kortkaos', 2)).toBe(false)
    expect(hostCountdownStart({ state: kortkaos, secrets: null }, ['a', 'b'], NOW).state.rematchAt).toBeNull()
  })
})

describe('ställningen efter en runda', () => {
  // Närmast vinner: den närmaste får 1 poäng.
  const match = (ids = ['a', 'b', 'c'], rounds = 5) => startGame(lobby('narmast', ids, { rounds }), ids, NOW)
  // Spelar rundor där vinnaren gissar rätt och de andra långt bort.
  function play(state: GameState, winners: string[]): GameState {
    let next = state
    winners.forEach((winner, i) => {
      if (i > 0) next = nextRound(next, NOW)
      const guesses = Object.fromEntries(Object.keys(next.players).map((id) => [id, id === winner ? 50 : 1]))
      next = playRound(next, guesses, 50)
    })
    return next
  }

  it('säger ungefär var man ligger, utan placering', () => {
    const state = play(match(['a', 'b', 'c', 'd', 'e']), ['a', 'a', 'a', 'b'])
    // a 3, b 1, c d e 0. Nära = högst 1 poäng bakom. Lägst poäng är sist, även delat.
    expect(roundStanding(state, 'a')?.kind).toBe('leader')
    expect(roundStanding(state, 'b')?.kind).toBe('top')
    expect(roundStanding(state, 'c')?.kind).toBe('last')
    expect(roundStanding(state, 'e')?.kind).toBe('last')
  })

  it('nära ledaren går före sist', () => {
    const state = play(match(['a', 'b']), ['a'])
    expect(roundStanding(state, 'b')?.kind).toBe('close')
  })

  it('mitt i klungan i undre halvan', () => {
    const state = play(match(['a', 'b', 'c', 'd', 'e'], 10), ['a', 'a', 'a', 'b', 'b', 'c', 'c', 'd'])
    // a 3, b 2, c 2, d 1, e 0
    expect(roundStanding(state, 'b')?.kind).toBe('close')
    expect(roundStanding(state, 'd')?.kind).toBe('middle')
    expect(roundStanding(state, 'e')?.kind).toBe('last')
  })

  it('delad ledning och ingen ledare innan någon fått poäng', () => {
    expect(roundStanding(play(match(), ['a', 'b']), 'b')?.kind).toBe('shared')
    expect(roundStanding(playRound(match(), {}, 12), 'a')).toMatchObject({ kind: 'none', leaderIds: [] })
  })

  it('visar bara när man klättrar, aldrig i första rundan', () => {
    const first = play(match(), ['c'])
    expect(roundStanding(first, 'c')?.climbed).toBe(false)
    const second = play(match(), ['a', 'a', 'c', 'c'])
    expect(roundStanding(second, 'c')?.climbed).toBe(true)
    expect(roundStanding(second, 'a')?.climbed).toBe(false)
  })

  it('skiljer rundans vinnare från matchledaren', () => {
    const state = play(match(), ['a', 'a', 'b'])
    expect(state.lastResult?.winners).toEqual(['b'])
    expect(roundStanding(state, 'b')?.leaderIds).toEqual(['a'])
  })

  it('visar ingenting efter sista rundan, så att prispallen får avslöja resultatet', () => {
    const last = play(match(['a', 'b'], 2), ['a', 'a'])
    expect(last.round).toBe(last.rounds)
    expect(roundStanding(last, 'a')).toBeNull()
    expect(roundStanding(last, 'b')).toBeNull()
  })

  it('allt avgörs i sista rundan när toppen ligger jämnt', () => {
    expect(roundStanding(play(match(['a', 'b'], 3), ['a', 'b']), 'a')?.decider).toBe(true)
    expect(roundStanding(play(match(['a', 'b'], 4), ['a', 'a', 'a']), 'b')?.decider).toBe(false)
    expect(roundStanding(play(match(['a', 'b'], 4), ['a', 'b']), 'a')?.decider).toBe(false)
  })
})

describe('stapelhöjden på prispallen', () => {
  it('följer poängen, så att låga poäng får en tydligt lägre stapel', () => {
    expect(podiumShare(247, 247)).toBe(1)
    expect(podiumShare(201, 247)).toBeCloseTo(0.81, 2)
    expect(podiumShare(6, 247)).toBeLessThan(0.03)
  })

  it('ger lika poäng samma höjd och alla samma höjd när ingen har poäng', () => {
    expect(podiumShare(120, 240)).toBe(podiumShare(120, 240))
    expect(podiumShare(3, 3)).toBe(1)
    expect(podiumShare(0, 0)).toBe(1)
    expect(podiumShare(0, 10)).toBe(0)
  })
})

describe('lika resultat', () => {
  // Gissa priset: 0–100 poäng efter hur många gånger fel man var. Priset är 1 000 kr.
  function priceRound(guesses: Record<string, number>) {
    const state = startGame(lobby('gissa-priset', ['a', 'b', 'c', 'd'], { rounds: 1 }), ['a', 'b', 'c', 'd'], NOW)
    return playRound(state, guesses, 1000)
  }

  it('alla som delar rundans bästa resultat är vinnare, ingen annan', () => {
    // a och b exakt rätt (100), c och d dubbelt fel åt var sitt håll, alltså lika långt bort men sämre.
    const state = priceRound({ a: 1000, b: 1000, c: 2000, d: 500 })
    const result = state.lastResult!
    expect(result.points.a).toBe(100)
    expect(result.points.c).toBe(result.points.d)
    expect(result.points.c).toBeLessThan(100)
    expect(result.winners.sort()).toEqual(['a', 'b'])
  })

  it('samma poäng under den bästa gör ingen till vinnare', () => {
    const state = priceRound({ a: 1000, c: 2000, d: 500 })
    expect(state.lastResult!.winners).toEqual(['a'])
  })

  it('ingen vinner rundan när alla får noll', () => {
    const state = priceRound({ a: 100_000, b: 100_000 })
    expect(state.lastResult!.points.a).toBe(0)
    expect(state.lastResult!.winners).toEqual([])
  })

  it('Närmast vinner: lika nära ger båda en poäng och delad vinst', () => {
    const state = playRound(startGame(lobby('narmast', ['a', 'b', 'c']), ['a', 'b', 'c'], NOW), { a: 40, b: 60, c: 90 }, 50)
    expect(state.lastResult!.winners.sort()).toEqual(['a', 'b'])
    expect(state.scores).toMatchObject({ a: 1, b: 1 })
    expect(state.scores.c ?? 0).toBe(0)
  })

  it('delade placeringar hoppar över nästa plats (1, 1, 3)', () => {
    const state = lobby('narmast', ['a', 'b', 'c'], { scores: { a: 5, b: 5, c: 2 } })
    expect(rankPlayers(state).map((p) => [p.id, p.place])).toEqual([['a', 1], ['b', 1], ['c', 3]])
  })

  it('delad matchseger ger alla på förstaplatsen en vinst i topplistan', () => {
    let state = startGame(lobby('narmast', ['a', 'b', 'c'], { rounds: 1 }), ['a', 'b', 'c'], NOW)
    state = nextRound(playRound(state, { a: 40, b: 60, c: 90 }, 50), NOW)
    expect(state.phase).toBe('finished')
    expect(matchWinners(state).sort()).toEqual(['a', 'b'])
    expect(rankLeaderboard(state).map((e) => [e.id, e.wins, e.place])).toEqual([
      ['a', 1, 1],
      ['b', 1, 1],
      ['c', 0, 3],
    ])
  })
})

describe('värden avbryter matchen', () => {
  // En lobby som redan spelat en match (a vann), och en ny match som pågår.
  function midMatch() {
    let state = startGame(lobby('narmast', ['a', 'b', 'c'], { rounds: 1 }), ['a', 'b', 'c'], NOW)
    state = nextRound(playRound(state, { a: 10, b: 50, c: 90 }, 12), NOW)
    state = backToWaiting(state)
    state = startGame({ ...state, rounds: 3 }, ['a', 'b', 'c'], NOW)
    return playRound(state, { a: 90, b: 50, c: 10 }, 12)
  }

  it('alla går tillbaka till väntrummet och matchens poäng nollställs', () => {
    const aborted = abortMatch(midMatch())
    expect(aborted.phase).toBe('waiting')
    expect(aborted.round).toBe(0)
    expect(aborted.scores).toEqual({ a: 0, b: 0, c: 0 })
    expect(aborted.matchRounds).toEqual([])
    expect(aborted.lastResult).toBeNull()
    expect(aborted.cards).toBeNull()
    expect(aborted.notice).toContain('avbröt matchen')
  })

  it('räknas inte: topplistan och antalet matcher är som före matchen', () => {
    const before = midMatch()
    const aborted = abortMatch(before)
    expect(aborted.leaderboard).toEqual(before.leaderboard)
    expect(aborted.matchesPlayed).toBe(1)
    expect(aborted.gamesPlayed).toEqual({ narmast: 1 })
    expect(aborted.leaderboard.a.wins).toBe(1)
    // Inställningarna ligger kvar.
    expect(aborted.rounds).toBe(3)
    expect(aborted.game).toBe('narmast')
  })

  it('gör ingenting i väntrummet eller efter matchen', () => {
    const waiting = lobby('narmast', ['a', 'b'])
    expect(abortMatch(waiting)).toBe(waiting)
    const done = nextRound(playRound(startGame(lobby('narmast', ['a', 'b'], { rounds: 1 }), ['a', 'b'], NOW), { a: 1 }, 1), NOW)
    expect(abortMatch(done)).toBe(done)
  })

  it('fungerar mitt i en kortmatch', () => {
    const host = hostStart({ state: lobby('kortkaos', ['a', 'b', 'c']), secrets: null }, ['a', 'b', 'c'], NOW)
    expect(host.state.phase).toBe('playing')
    const aborted = abortMatch(host.state)
    expect(aborted.phase).toBe('waiting')
    expect(aborted.cards).toBeNull()
    expect(aborted.matchesPlayed).toBe(0)
  })
})
