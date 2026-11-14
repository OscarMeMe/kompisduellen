import { describe, expect, it } from 'vitest'
import { findGame, GAMES, type GameInfo } from '@/lib/games'
import { initialState } from '@/lib/match'
import { emptySeats, gameChoiceNote, LOBBY_THEMES, lobbyStatus, lobbyThemeFor, settingsLine } from '@/lib/vantrum'

const game = (id: string) => findGame(id)!
const imposter = game('imposterjakten')
const unlimited: GameInfo = { ...imposter, id: 'utan-grans', name: 'Utan gräns', maxPlayers: undefined }

describe('temat i väntrummet', () => {
  it('finns för alla spelbara spel, med rubrik, ikon och repliker utan tankstreck', () => {
    for (const playable of GAMES.filter((g) => g.playable)) {
      const theme = LOBBY_THEMES[playable.id]
      expect(theme, playable.id).toBeDefined()
      expect(theme.playersTitle).toBeTruthy()
      expect(theme.icon).toBeTruthy()
      expect(theme.lines.length).toBeGreaterThan(1)
      for (const text of [theme.playersTitle, ...theme.lines]) expect(text).not.toMatch(/[–—]/)
    }
  })

  it('ger spel utan eget tema rubriken Spelare och spelets egen ikon', () => {
    const coming = GAMES.find((g) => !g.playable)!
    expect(lobbyThemeFor(coming)).toEqual({ playersTitle: 'Spelare', lines: [], icon: coming.emoji })
    expect(lobbyThemeFor(imposter).playersTitle).toBe('Misstänkta')
  })
})

describe('status i väntrummet', () => {
  const base = { tooMany: false, isHost: false, hostName: 'Oscar1' }

  it('säger hur många som saknas', () => {
    expect(lobbyStatus({ ...base, game: imposter, count: 2 })).toBe('Väntar på 1 till.')
    expect(lobbyStatus({ ...base, game: imposter, count: 1 })).toBe('Väntar på 2 till.')
    expect(lobbyStatus({ ...base, game: game('narmast'), count: 1 })).toBe('Väntar på 1 till.')
  })

  it('säger vem gästerna väntar på när ni är tillräckligt många', () => {
    expect(lobbyStatus({ ...base, game: imposter, count: 3 })).toBe('Ni är tillräckligt många. Väntar på Oscar1.')
    expect(lobbyStatus({ ...base, game: imposter, count: 3, hostName: undefined })).toBe('Ni är tillräckligt många. Väntar på värden.')
  })

  it('säger till värden att den kan starta', () => {
    expect(lobbyStatus({ ...base, game: game('gissa-priset'), count: 2, isHost: true })).toBe('Ni är tillräckligt många. Du kan starta.')
  })

  it('säger hur många ni är och spelets gräns när ni är för många', () => {
    expect(lobbyStatus({ ...base, game: game('kortkaos'), count: 10, tooMany: true })).toBe(
      'Ni är 10, och Kortkaos klarar högst 9. Byt spel eller vänta tills någon lämnat.',
    )
  })

  it('säger till gästerna när värden väljer nästa spel', () => {
    expect(lobbyStatus({ ...base, game: imposter, count: 1, choosingGame: true })).toBe('Oscar1 väljer nästa spel…')
    expect(lobbyStatus({ ...base, game: imposter, count: 3, choosingGame: true, isHost: true })).toBe('Ni är tillräckligt många. Du kan starta.')
  })

  it('fungerar för spel utan övre gräns', () => {
    expect(lobbyStatus({ ...base, game: unlimited, count: 40 })).toBe('Ni är tillräckligt många. Väntar på Oscar1.')
  })
})

describe('lediga platser', () => {
  it('visar en ring för varje som saknas och en till så länge det finns plats', () => {
    expect(emptySeats(1, imposter)).toBe(2)
    expect(emptySeats(3, imposter)).toBe(1)
    expect(emptySeats(9, imposter)).toBe(1)
    expect(emptySeats(10, imposter)).toBe(0)
    expect(emptySeats(12, imposter)).toBe(0)
    expect(emptySeats(9, game('kortkaos'))).toBe(0)
  })

  it('visar aldrig mer än en extra ring för spel utan övre gräns', () => {
    expect(emptySeats(1, unlimited)).toBe(2)
    expect(emptySeats(3, unlimited)).toBe(1)
    expect(emptySeats(1000, unlimited)).toBe(1)
  })
})

describe('inställningarna på en rad', () => {
  it('visar rundor, och tempo för spel som har det', () => {
    expect(settingsLine({ ...initialState('narmast'), rounds: 5 })).toBe('5 rundor')
    expect(settingsLine({ ...initialState('kortkaos'), rounds: 1 })).toBe('1 runda')
    expect(settingsLine({ ...initialState('gissa-priset'), rounds: 5, guessSeconds: 45, autoAdvance: true })).toBe(
      '5 rundor · 45 s svarstid · Nästa fråga automatiskt',
    )
    expect(settingsLine({ ...initialState('gissa-priset'), rounds: 5, guessSeconds: 30, autoAdvance: false })).toBe(
      '5 rundor · 30 s svarstid · Värden klickar fram nästa fråga',
    )
  })

  it('visar Imposterjaktens omgångar och val', () => {
    const state = initialState('imposterjakten')
    expect(settingsLine({ ...state, rounds: 2, imposterSettings: { hard: false, category: null, aloud: false } })).toBe(
      '2 omgångar · 3 varv · Normal · Blandat · Vi skriver orden',
    )
    expect(settingsLine({ ...state, rounds: 1, imposterSettings: { hard: true, category: 'Mat', aloud: true } })).toBe(
      '1 omgång · 3 varv · Svår · Mat · Vi säger orden högt',
    )
    expect(settingsLine({ ...state, rounds: 10, imposterSettings: { hard: false, category: null, aloud: false, clueRounds: 2 } })).toBe(
      '10 omgångar · 2 varv · Normal · Blandat · Vi skriver orden',
    )
    expect(settingsLine({ ...state, rounds: 3, imposterSettings: { hard: false, tricky: true, category: null, aloud: false } })).toBe(
      '3 omgångar · 3 varv · Lurig · Blandat · Vi skriver orden',
    )
  })
})

describe('raden överst i spelvalet', () => {
  const games = [
    { name: 'Gissa priset', minPlayers: 2 },
    { name: 'Kortkaos', minPlayers: 3 },
    { name: 'Imposterjakten', minPlayers: 3 },
  ]
  it('säger en gång att man är själv', () => {
    expect(gameChoiceNote(1, games)).toBe('Du är själv här just nu. Bjud in fler för att starta.')
  })
  it('nämner bara spelen ni är för få eller för många för', () => {
    expect(gameChoiceNote(2, games)).toBe('Ni är 2. För få för Kortkaos och Imposterjakten.')
    expect(gameChoiceNote(3, games)).toBeNull()
    expect(gameChoiceNote(11, games, ['Kortkaos'])).toBe('Ni är 11. För många för Kortkaos.')
  })
})
