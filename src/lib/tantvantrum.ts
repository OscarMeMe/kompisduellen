// Exploderande Tanters väntrum: raderna under loggan och var stolarna står runt kafferepsbordet. Rena funktioner.

// Raderna under loggan, en i taget. Byts var TANT_LINE_MS.
export const TANT_LOBBY_LINES = [
  'Någonstans i högen väntar en tant…',
  'Har du kollat att du har Desarmera?',
  'Lita aldrig på en tant med handväska.',
  'Någon har redan börjat räkna korten.',
  'Kaffet är varmt. Tanten också.',
  'Den som ler mest har nog Nope!.',
  'Blanda aldrig med en tant som tittar.',
  'Ta en bulle. Det kan bli den sista.',
]
export const TANT_LINE_MS = 6000

// Hur många stolar som står runt bordet: alla som är med plus en ledig (minst fyra, högst tio).
export function chairCount(players: number, maxPlayers: number): number {
  return Math.min(maxPlayers, Math.max(4, players + 1))
}

// Var stolarna står runt ett runt bord, i procent av rutan (0–100). Den första står längst ned (där jag brukar sitta)
// och resten medurs, jämnt fördelade.
export function chairPlaces(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (i / count) * Math.PI * 2
    return { x: 50 + Math.cos(angle) * 40, y: 50 + Math.sin(angle) * 40 }
  })
}

// Raden när värden väntar på fler: hur många som är med och vad man kan göra.
export function waitingText(count: number, minPlayers: number): string | null {
  if (count >= minPlayers) return null
  return count === 1 ? 'Ni är 1. Bjud in en kompis eller lägg till en bot!' : `Ni är ${count}. Bjud in fler eller lägg till en bot!`
}
