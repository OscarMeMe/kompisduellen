// Kasta något på en annan spelare: ett kort störningsmoment under en match eller i väntrummet. Kasten skickas som
// vanliga meddelanden i lobbyns kanal (som reaktionerna) och sparas aldrig. Den som träffas ser saken splatta mot
// skärmen, alla andra ser en rad i reaktionsflödet. Spärrarna finns hos både avsändaren och mottagarna, så att en
// modifierad klient inte kan fylla skärmarna. Rena funktioner, så att de är lätta att testa.

import type { SplatPlace } from '@/lib/splatt'

export type ThrowItemId = 'tomat' | 'paj' | 'agg' | 'toapapper' | 'gurka'

export type ThrowItem = {
  id: ThrowItemId
  emoji: string
  // Knappens namn ("Tomat") och hur saken skrivs i en mening ("en tomat").
  label: string
  text: string
  // Hur saken räknas i kasträknaren: "1 tomat", "23 tomater".
  one: string
  many: string
  // Färgen på fläcken bakom saken när den splattar (Tailwind-klass med färgerna från index.css).
  splat: string
  // Ägget får en äggula mitt i den vita fläcken, så att det går att skilja från pajen.
  yolk?: boolean
}

export const THROW_ITEMS: readonly ThrowItem[] = [
  { id: 'tomat', emoji: '🍅', label: 'Tomat', text: 'en tomat', one: 'tomat', many: 'tomater', splat: 'bg-primary/70' },
  { id: 'paj', emoji: '🥧', label: 'Paj', text: 'en paj', one: 'paj', many: 'pajer', splat: 'bg-sun' },
  { id: 'agg', emoji: '🥚', label: 'Ägg', text: 'ett ägg', one: 'ägg', many: 'ägg', splat: 'bg-card', yolk: true },
  { id: 'toapapper', emoji: '🧻', label: 'Toapapper', text: 'toapapper', one: 'toapapper', many: 'toapapper', splat: 'bg-muted' },
  { id: 'gurka', emoji: '🥒', label: 'Gurka', text: 'en gurka', one: 'gurka', many: 'gurkor', splat: 'bg-mint' },
]

export function findThrowItem(id: unknown): ThrowItem | undefined {
  return THROW_ITEMS.find((item) => item.id === id)
}

// Man kan kasta en gång per 10 sekunder.
export const THROW_COOLDOWN_MS = 10_000
// Mottagarna släpper igenom ett kast per avsändare och så här lång tid. Lite kortare än avsändarens spärr, så att
// ett kast som kommer fram lite fortare än det förra inte slängs i onödan.
export const THROW_ACCEPT_MS = THROW_COOLDOWN_MS - 1000
// Så länge syns splatten (ms), och när saken slår i skärmen efter att ha flugit in (ms). Rörelserna i index.css
// (throw-in och de olika träffarna) är gjorda för de här tiderna.
export const SPLAT_VISIBLE_MS = 2000
export const IMPACT_MS = 450

// Får jag kasta nu? lastSent = när jag kastade senast (ms), eller null.
export function canThrow(lastSent: number | null, now: number): boolean {
  return lastSent === null || now - lastSent >= THROW_COOLDOWN_MS
}

// Hela sekunder tills jag får kasta igen (0 = nu). Aldrig mer än hela spärren, även om now är lite gammalt.
export function throwCooldownSeconds(lastSent: number | null, now: number): number {
  if (lastSent === null) return 0
  const left = Math.ceil((THROW_COOLDOWN_MS - Math.max(0, now - lastSent)) / 1000)
  return Math.max(0, left)
}

// Mottagarens spärr för en avsändare. lastAccepted = när ett kast från avsändaren släpptes igenom senast.
export function acceptThrow(lastAccepted: number | undefined, now: number): boolean {
  return lastAccepted === undefined || now - lastAccepted >= THROW_ACCEPT_MS
}

// Spelarna jag kan kasta på: alla andra i lobbyn som tar emot kast.
export function throwTargets<T extends { id: string; noThrows?: boolean }>(online: readonly T[], meId: string): T[] {
  return online.filter((player) => player.id !== meId && !player.noThrows)
}

// En splatt som visas för den som träffas, och var på skärmen (splatt.ts).
export type Splat = { key: string; from: string; item: ThrowItemId; place: SplatPlace }

// En spelare visar högst en splatt åt gången. Kommer ett kast medan en splatt syns blir det bara en rad i flödet.
export function nextSplat(current: Splat | null, incoming: Splat): { splat: Splat; shown: boolean } {
  return current ? { splat: current, shown: false } : { splat: incoming, shown: true }
}

// "Oscar kastade en tomat på dig!"
export function hitText(name: string, item: ThrowItem): string {
  return `${name} kastade ${item.text} på dig!`
}

// Det jag nyss kastade, som en bekräftelse för mig: "Du kastade en tomat på Lisa!"
export type Thrown = { key: string; item: ThrowItemId; to: string }

export function thrownText(item: ThrowItem, to: string): string {
  return `Du kastade ${item.text} på ${to}!`
}

// Kasträknaren: hur mycket som kastats i lobbyn och vem som fått flest. Bara värden räknar och den ligger i läget, så
// den är samma för alla, även för den som ansluter sent, efter en omladdning och efter ett värdbyte. Namnet sparas,
// så att den som lämnat lobbyn kan stå kvar som den som fått flest.
export type ThrowStats = {
  items: Record<string, number>
  received: Record<string, { name: string; count: number }>
}

export const EMPTY_THROW_STATS: ThrowStats = { items: {}, received: {} }

export function addThrow(stats: ThrowStats, item: ThrowItemId, to: { id: string; name: string }): ThrowStats {
  return {
    items: { ...stats.items, [item]: (stats.items[item] ?? 0) + 1 },
    received: { ...stats.received, [to.id]: { name: to.name, count: (stats.received[to.id]?.count ?? 0) + 1 } },
  }
}

export function totalThrows(stats: ThrowStats): number {
  return THROW_ITEMS.reduce((sum, item) => sum + (stats.items[item.id] ?? 0), 0)
}

// Fler än så här många på delad förstaplats skrivs inte ut, eftersom raden annars blir för lång.
const MAX_NAMED_LEADERS = 3

function joinNames(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} och ${names.at(-1)}`
}

// "Ni har kastat 23 tomater. Spelare 3 har fått flest." Är sakerna olika står det "23 saker", och "mest tomater" om
// någon sak ligger ensam i topp.
export function throwCounterText(stats: ThrowStats): string {
  const total = totalThrows(stats)
  if (total === 0) return 'Ingen har kastat något än.'
  const thrown = THROW_ITEMS.map((item) => ({ item, count: stats.items[item.id] ?? 0 })).filter(({ count }) => count > 0)
  const players = Object.values(stats.received)
  if (total === 1) {
    const name = players[0]?.name
    return `Ni har kastat 1 ${thrown[0].item.one}${name ? `, på ${name}` : ''}.`
  }

  const most = Math.max(...thrown.map(({ count }) => count))
  const top = thrown.filter(({ count }) => count === most)
  const what =
    thrown.length === 1
      ? `${total} ${thrown[0].item.many}`
      : top.length === 1
        ? `${total} saker, mest ${top[0].item.many}`
        : `${total} saker`

  const highest = Math.max(0, ...players.map(({ count }) => count))
  const leaders = players.filter(({ count }) => count === highest).map(({ name }) => name)
  const who =
    leaders.length === 0 ? '' : leaders.length > MAX_NAMED_LEADERS ? ' Flera ligger lika.' : ` ${joinNames(leaders)} har fått flest.`
  return `Ni har kastat ${what}.${who}`
}

// Så länge syns bekräftelsen för den som kastade (ms).
export const THROWN_VISIBLE_MS = 1600

// Valet att inte ta emot kast sparas i webbläsaren.
const KEY = 'kd-kast'

export function loadAcceptsThrows(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'av'
  } catch {
    return true
  }
}

export function saveAcceptsThrows(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'pa' : 'av')
  } catch {
    // Går det inte att spara gäller valet bara tills sidan laddas om.
  }
}
