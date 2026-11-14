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
  '🔍': { file: 'magnifying-glass', label: 'Förstoringsglas' },
  // Kommande spel: Ordflykt, Agentduellen och ritspelet Klotterkampen
  '💬': { file: 'speech-balloon', label: 'Pratbubbla' },
  '🕶': { file: 'sunglasses', label: 'Solglasögon' },
  '🎨': { file: 'artist-palette', label: 'Målarpalett' },
  // Bilderna i spelförklaringarna (intro i games.ts)
  '💸': { file: 'money-with-wings', label: 'Sedlar med vingar' },
  '🍀': { file: 'four-leaf-clover', label: 'Fyrklöver' },
  // Flikarna ovanför spelen på startsidan (tillfallen.ts). Spelarfigurerna är blobbar och ritas i kod (figurer.ts).
  '🤖': { file: 'robot', label: 'Robot' },
  '🤡': { file: 'clown', label: 'Clown' },
  // Det man kan kasta på varandra (THROW_ITEMS i kast.ts)
  '🍅': { file: 'tomato', label: 'Tomat' },
  '🥧': { file: 'pie', label: 'Paj' },
  '🥚': { file: 'egg', label: 'Ägg' },
  '🧻': { file: 'roll-of-paper', label: 'Toapapper' },
  '🥒': { file: 'cucumber', label: 'Gurka' },
}

// Tecknet utan variantväljare (U+FE0F), så att t.ex. "🏷️" och "🏷" ger samma bild.
export function findEmoji(emoji: string): EmojiInfo | undefined {
  // Bara listans egna nycklar, så att ett värde som "constructor" inte ger något som alla objekt har inbyggt.
  const key = emoji.replace(/️/g, '')
  return Object.prototype.hasOwnProperty.call(EMOJI, key) ? EMOJI[key] : undefined
}
