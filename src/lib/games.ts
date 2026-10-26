// Alla spel som visas på startsidan, i den ordning de visas. Lägg till nya spel här.

export type GameInfo = {
  id: string
  name: string
  tagline: string
  emoji: string
  color: string // Tailwind-klass för kortets pastellfärg
  // Minsta antal spelare för en vanlig match. Det finns ingen övre gräns i lobbyn.
  minPlayers: number
  playable: boolean
}

export const GAMES: GameInfo[] = [
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Vad kostar det – eller vad kostade det förr?',
    emoji: '🏷️',
    color: 'bg-sun-soft',
    minPlayers: 2,
    playable: true,
  },
  {
    id: 'narmast',
    name: 'Närmast vinner',
    tagline: 'Ett snabbt turspel: gissa ett tal mellan 1 och 100. Talet slumpas, så det handlar om tur.',
    emoji: '🎯',
    color: 'bg-coral-soft',
    minPlayers: 2,
    playable: true,
  },
  {
    id: 'vem-skrev',
    name: 'Vem skrev vad?',
    tagline: 'Alla svarar anonymt. Kan du lista ut vem som skrev vad?',
    emoji: '🕵️',
    color: 'bg-mint-soft',
    minPlayers: 3,
    playable: false,
  },
  {
    id: 'mest-trolig',
    name: 'Mest trolig att…',
    tagline: 'Rösta fram vem i gänget som passar bäst in på påståendet.',
    emoji: '🗳️',
    color: 'bg-sky-soft',
    minPlayers: 3,
    playable: false,
  },
]

export function findGame(id: string | null | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.id === id)
}

// "2+ spelare". Lobbyn har ingen övre gräns, så bara det minsta antalet visas.
export function playersLabel(game: GameInfo): string {
  return `${game.minPlayers}+ spelare`
}
