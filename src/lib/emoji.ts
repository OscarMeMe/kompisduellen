// Emoji som visas som bilder (Microsoft Fluent Emoji i 3D, MIT-licens) i stället för tecken,
// så att de ser likadana ut på alla enheter. Bilderna ligger i public/emoji.
// Saknas ett tecken här visas det som vanligt emoji-tecken.

type EmojiInfo = { file: string; label: string }

const EMOJI: Record<string, EmojiInfo> = {
  // Spelen
  '🎯': { file: 'bullseye', label: 'Måltavla' },
  '🏷': { file: 'label', label: 'Prislapp' },
  '🕵': { file: 'detective', label: 'Detektiv' },
  '🗳': { file: 'ballot-box', label: 'Valurna' },
  '🃏': { file: 'joker', label: 'Jokerkort' },
  // Bilderna i spelförklaringarna (intro i games.ts)
  '💸': { file: 'money-with-wings', label: 'Sedlar med vingar' },
  '🍀': { file: 'four-leaf-clover', label: 'Fyrklöver' },
  // Spelarfigurerna (AVATARS i player.ts)
  '👻': { file: 'ghost', label: 'Spöke' },
  '👽': { file: 'alien', label: 'Utomjording' },
  '🤖': { file: 'robot', label: 'Robot' },
  '👾': { file: 'alien-monster', label: 'Rymdmonster' },
  '🧙': { file: 'mage', label: 'Trollkarl' },
  '🧛': { file: 'vampire', label: 'Vampyr' },
  '🧜': { file: 'merperson', label: 'Sjöjungfru' },
  '🦸': { file: 'superhero', label: 'Superhjälte' },
  '🥷': { file: 'ninja', label: 'Ninja' },
  '🤡': { file: 'clown', label: 'Clown' },
  '💀': { file: 'skull', label: 'Dödskalle' },
  '🎃': { file: 'jack-o-lantern', label: 'Pumpalykta' },
}

// Tecknet utan variantväljare (U+FE0F), så att t.ex. "🏷️" och "🏷" ger samma bild.
export function findEmoji(emoji: string): EmojiInfo | undefined {
  return EMOJI[emoji.replace(/️/g, '')]
}
