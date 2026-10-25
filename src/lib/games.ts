// Alla spel som visas på startsidan. Lägg till nya spel här.

export type GameInfo = {
  id: string
  name: string
  tagline: string
  emoji: string
  color: string // Tailwind-klass för kortets pastellfärg
  players: string // antal spelare på startsidan
  playable: boolean
}

export const GAMES: GameInfo[] = [
  {
    id: 'narmast',
    name: 'Närmast vinner',
    tagline: 'Gissa ett tal mellan 1 och 100. Den som hamnar närmast tar poängen.',
    emoji: '🎯',
    color: 'bg-coral-soft',
    players: '2+ spelare',
    playable: true,
  },
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Vad kostade det egentligen? Gissa priset på udda saker som faktiskt har sålts.',
    emoji: '🏷️',
    color: 'bg-sun-soft',
    players: '2+ spelare',
    playable: true,
  },
  {
    id: 'vem-skrev',
    name: 'Vem skrev vad?',
    tagline: 'Alla svarar anonymt. Kan du lista ut vem som skrev vad?',
    emoji: '🕵️',
    color: 'bg-mint-soft',
    players: '3+ spelare',
    playable: false,
  },
  {
    id: 'mest-trolig',
    name: 'Mest trolig att…',
    tagline: 'Rösta fram vem i gänget som passar bäst in på påståendet.',
    emoji: '🗳️',
    color: 'bg-sky-soft',
    players: '3+ spelare',
    playable: false,
  },
]

export function findGame(id: string | null | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.id === id)
}
