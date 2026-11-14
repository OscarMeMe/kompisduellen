// Exploderande Tanters väntrum: raderna under loggan, var stolarna står runt kafferepsbordet och texterna i
// inställningsrutan (TantInstallningar). Rena funktioner.

import { bombCount, KAOS_MIN_PLAYERS, LEVEL_NAMES, levelFor, type TantLevel } from '@/lib/tantpanik'

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

// Raden under svårigheten: "Normal: 3 tanter med 4 spelare." players = alla vid bordet, botarna inräknade (minst två
// räknas, eftersom spelet inte går att starta med färre). Är Kaos valt med för få blir det Svår, och det står då.
export function tantBombsLine(chosen: TantLevel, players: number): string {
  const count = Math.max(2, players)
  const bombs = bombCount(count, chosen)
  const tanter = `${bombs} ${bombs === 1 ? 'tant' : 'tanter'}`
  if (chosen === 'kaos' && levelFor(chosen, players) !== 'kaos') return `Kaos kräver minst ${KAOS_MIN_PLAYERS} spelare. Med ${count} blir det Svår: ${tanter}.`
  // Ensam i väntrummet: så blir det när ni är två.
  if (players < 2) return `${LEVEL_NAMES[levelFor(chosen, players)]}: ${tanter} när ni är 2.`
  return `${LEVEL_NAMES[levelFor(chosen, players)]}: ${tanter} med ${count} spelare.`
}

// Sammanfattningen längst ned: "Normal · 4 spelare · 2 botar". Botarna räknas bland spelarna och står för sig om de finns.
export function tantSummary(level: TantLevel, players: number, bots: number): string {
  const parts = [LEVEL_NAMES[level], `${players} spelare`]
  if (bots > 0) parts.push(`${bots} ${bots === 1 ? 'bot' : 'botar'}`)
  return parts.join(' · ')
}

// Raden under sammanfattningen: "Tantsnaran på · Kasta saker av".
export function tantExtrasLine(trap: boolean, throws: boolean): string {
  return `Tantsnaran ${trap ? 'på' : 'av'} · Kasta saker ${throws ? 'på' : 'av'}`
}

// Den korta förklaringen vid en avstängd Starta matchen. null = det går att starta.
export function tantStartBlocked(players: number, minPlayers: number, tooMany: boolean, isHostWithBots = true): string | null {
  if (tooMany) return 'Ni är för många. Byt spel eller vänta tills någon lämnat.'
  if (players >= minPlayers) return null
  return isHostWithBots ? 'Bjud in en kompis eller lägg till en bot för att starta.' : 'Bjud in en kompis för att starta.'
}
