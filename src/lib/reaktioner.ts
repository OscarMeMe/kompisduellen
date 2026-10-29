// Små reaktioner i väntrummet och efter facit. De skickas som vanliga meddelanden i lobbyns kanal och
// sparas aldrig. Begränsningen finns på två ställen: knapparna väntar en stund efter varje tryck (avsändaren),
// och mottagaren släpper igenom högst några reaktioner per spelare och tidsfönster, så att en modifierad
// klient inte kan fylla skärmarna. Rena funktioner, så att de är lätta att testa.

export type Reaction = { id: string; emoji: string; label: string }

export const REACTIONS: readonly Reaction[] = [
  { id: 'skratt', emoji: '😂', label: 'Skratt' },
  { id: 'eld', emoji: '🔥', label: 'Eld' },
  { id: 'applader', emoji: '👏', label: 'Applåd' },
  { id: 'chock', emoji: '😱', label: 'Chock' },
  { id: 'arg', emoji: '😡', label: 'Arg' },
]

export function findReaction(id: unknown): Reaction | undefined {
  return REACTIONS.find((reaction) => reaction.id === id)
}

// Så länge väntar knapparna efter att man tryckt (ms).
export const REACTION_COOLDOWN_MS = 1000
// Mottagaren släpper igenom högst så här många reaktioner per spelare under fönstret (ms).
export const REACTION_LIMIT = 3
export const REACTION_WINDOW_MS = 3000
// Så länge syns en reaktion på skärmen (ms).
export const REACTION_VISIBLE_MS = 2600

// Får jag skicka en ny reaktion? lastSent = när jag skickade senast (ms), eller null.
export function canSendReaction(lastSent: number | null, now: number): boolean {
  return lastSent === null || now - lastSent >= REACTION_COOLDOWN_MS
}

// Mottagarens spärr för en avsändare. history = tidpunkterna för reaktionerna som släppts igenom. Ger den nya
// historiken om reaktionen får visas, annars null.
export function acceptReaction(history: readonly number[], now: number): number[] | null {
  const recent = history.filter((at) => now - at < REACTION_WINDOW_MS)
  if (recent.length >= REACTION_LIMIT) return null
  return [...recent, now]
}
