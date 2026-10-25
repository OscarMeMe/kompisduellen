import { useState } from 'react'
import { findEmoji } from '@/lib/emoji'
import { cn } from '@/lib/utils'

type EmojiProps = {
  // Emoji-tecknet, t.ex. "🧙". Det är också det som sparas och skickas för spelarfigurer.
  emoji: string
  // Storleken styrs av textstorleken, t.ex. "text-2xl", precis som för ett vanligt tecken.
  className?: string
}

// Visar en emoji som Fluent-bild. Saknas bilden visas tecknet i stället.
export function Emoji({ emoji, className }: EmojiProps) {
  const info = findEmoji(emoji)
  const [failed, setFailed] = useState(false)

  if (!info || failed) {
    return (
      <span role="img" aria-label={info?.label} className={cn('inline-block leading-none', className)}>
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={`/emoji/${info.file}.png`}
      alt={info.label}
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('inline-block size-[1.2em] shrink-0 object-contain align-[-0.25em] select-none', className)}
    />
  )
}
