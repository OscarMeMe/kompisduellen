// Kasta något på en annan spelare: ett kort störningsmoment under en match eller i väntrummet. Kasten skickas som
// vanliga meddelanden i lobbyns kanal (som reaktionerna) och sparas aldrig. Den som träffas ser saken splatta mot
// skärmen, alla andra ser en rad i reaktionsflödet. Spärrarna finns hos både avsändaren och mottagarna, så att en
// modifierad klient inte kan fylla skärmarna. Rena funktioner, så att de är lätta att testa.

import type { SplatPlace } from '@/lib/splatt'

export type ThrowItemId = 'tomat' | 'paj' | 'agg' | 'toapapper'

export type ThrowItem = {
  id: ThrowItemId
  emoji: string
  // Knappens namn ("Tomat") och hur saken skrivs i en mening ("en tomat").
  label: string
  text: string
  // Färgen på fläcken bakom saken när den splattar (Tailwind-klass med färgerna från index.css).
  splat: string
  // Ägget får en äggula mitt i den vita fläcken, så att det går att skilja från pajen.
  yolk?: boolean
}

export const THROW_ITEMS: readonly ThrowItem[] = [
  { id: 'tomat', emoji: '🍅', label: 'Tomat', text: 'en tomat', splat: 'bg-primary/70' },
  { id: 'paj', emoji: '🥧', label: 'Paj', text: 'en paj', splat: 'bg-sun' },
  { id: 'agg', emoji: '🥚', label: 'Ägg', text: 'ett ägg', splat: 'bg-card', yolk: true },
  { id: 'toapapper', emoji: '🧻', label: 'Toapapper', text: 'toapapper', splat: 'bg-muted' },
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

// Hela sekunder tills jag får kasta igen (0 = nu).
export function throwCooldownSeconds(lastSent: number | null, now: number): number {
  if (lastSent === null) return 0
  return Math.max(0, Math.ceil((THROW_COOLDOWN_MS - (now - lastSent)) / 1000))
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
