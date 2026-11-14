import { Emoji } from '@/components/Emoji'
import type { GameInfo } from '@/lib/games'
import { cn } from '@/lib/utils'

// Spelets ikon i liten storlek (spelvalet och rubrikraden i väntrummet, listorna på spelsidorna och guiderna): spelets
// egen bild när det har en (icon i games.ts, 256 × 256 från scripts/spelikoner.py), annars emojin. Bilden är lika stor
// som en emoji och följer textstorleken på samma sätt. Den är dekoration: spelets namn står alltid bredvid.
export function SpelIkon({ game, className }: { game: Pick<GameInfo, 'emoji' | 'icon'>; className?: string }) {
  if (!game.icon) return <Emoji emoji={game.emoji} className={className} />
  return (
    <img
      src={game.icon}
      alt=""
      width={256}
      height={256}
      draggable={false}
      className={cn('inline-block size-[1.2em] shrink-0 object-contain align-[-0.25em] select-none', className)}
    />
  )
}
