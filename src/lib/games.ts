// Alla spel som visas på startsidan. Lägg till nya spel här.

import { Target, PenLine, Tag, Vote, type LucideIcon } from 'lucide-react'

export type GameInfo = {
  id: string
  name: string
  tagline: string
  emoji: string
  icon: LucideIcon // ikon på startsidan
  color: string // Tailwind-klasser för kortets färg
  playable: boolean
}

export const GAMES: GameInfo[] = [
  {
    id: 'narmast',
    name: 'Närmast vinner',
    tagline: 'Gissa ett tal mellan 1 och 100. Den som hamnar närmast tar poängen.',
    emoji: '🎯',
    icon: Target,
    color: 'bg-violet-100 text-violet-950',
    playable: true,
  },
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Vad kostade det egentligen? Gissa priset på udda saker som faktiskt har sålts.',
    emoji: '🏷️',
    icon: Tag,
    color: 'bg-pink-100 text-pink-950',
    playable: true,
  },
  {
    id: 'vem-skrev',
    name: 'Vem skrev vad?',
    tagline: 'Alla svarar anonymt. Kan du lista ut vem som skrev vad?',
    emoji: '🕵️',
    icon: PenLine,
    color: 'bg-amber-100 text-amber-950',
    playable: false,
  },
  {
    id: 'mest-trolig',
    name: 'Mest trolig att…',
    tagline: 'Rösta fram vem i gänget som passar bäst in på påståendet.',
    emoji: '🗳️',
    icon: Vote,
    color: 'bg-teal-100 text-teal-950',
    playable: false,
  },
]

export function findGame(id: string | null | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.id === id)
}
