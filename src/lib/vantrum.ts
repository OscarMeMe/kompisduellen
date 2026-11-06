// Väntrummet, gemensamt för alla spel: temat per spel (rubrik för spelarna, repliker och ikon), status i klartext,
// lediga platser och inställningarna på en rad för gästerna. Färgen kommer från data-spel i index.css. Rena funktioner.

import type { GameInfo } from '@/lib/games'
import { roundWords } from '@/lib/games'
import { imposterSettingsParts } from '@/lib/imposterjakten'
import { TANT_GAME } from '@/lib/tantpanik'
import { guessSecondsFor, hasTempoSettings, type GameState } from '@/lib/match'

export type LobbyTheme = {
  // Rubriken över spelarna, som får antalet efter sig: "Misstänkta (4)".
  playersTitle: string
  // Repliker som byter i rubrikraden. Tom lista = ingen replik.
  lines: readonly string[]
  // Ikonen som rör sig sakta i rubrikraden (en emoji, som Emoji visar).
  icon: string
}

export const LOBBY_THEMES: Record<string, LobbyTheme> = {
  'gissa-priset': {
    playersTitle: 'Prisexperter',
    lines: ['Vad kostade det egentligen?', 'Någon här har ingen aning om priser.', 'Gissa lågt eller gissa högt?', 'Plånböckerna är redo.'],
    icon: '🏷️',
  },
  narmast: {
    playersTitle: 'Gissare',
    lines: [
      'Ett tal mellan 1 och 100. Hur svårt kan det vara?',
      'Någon tar 50. Det gör alltid någon.',
      'Känner du dig lyckligt lottad?',
      'Det räcker att vara närmast.',
    ],
    icon: '🎯',
  },
  kortkaos: {
    playersTitle: 'Kaosmakare',
    lines: ['Här blir det inte finare.', 'Domaren är alltid rättvis. Nästan.', 'Håll era bästa kort hemliga.', 'Snart vet ni för mycket om varandra.'],
    icon: '🃏',
  },
  imposterjakten: {
    playersTitle: 'Misstänkta',
    lines: [
      'Någon bland er ljuger…',
      'Vem ser mest skyldig ut?',
      'Vem undviker din blick?',
      'Alla ser oskyldiga ut. Nästan alla.',
      'Lita inte på den som ler.',
    ],
    icon: '🔍',
  },
  tantpanik: {
    playersTitle: 'Tantvakter',
    lines: ['Någonstans i högen väntar en tant.', 'Har alla sitt Desarmera-kort?', 'Dra lugnt. Andas.', 'Det här slutar med panik.'],
    icon: '💥',
  },
}

// Så ofta repliken byts (ms).
export const LOBBY_LINE_MS = 3000

// Temat för ett spel. Spel utan eget tema får rubriken Spelare, spelets egen ikon och inga repliker.
export function lobbyThemeFor(game: GameInfo): LobbyTheme {
  return LOBBY_THEMES[game.id] ?? { playersTitle: 'Spelare', lines: [], icon: game.emoji }
}

// Väntrummets status i klartext. tooMany kommer från tooManyPlayers i match.ts (bara spel med en hård gräns).
// choosingGame = värden har tryckt Byt spel och väljer nästa spel.
export function lobbyStatus({
  count,
  game,
  tooMany,
  isHost,
  hostName,
  choosingGame = false,
}: {
  count: number
  game: GameInfo
  tooMany: boolean
  isHost: boolean
  hostName?: string
  choosingGame?: boolean
}): string {
  if (choosingGame && !isHost) return `${hostName ?? 'Värden'} väljer nästa spel…`
  if (tooMany) return `Ni är ${count}, och ${game.name} klarar högst ${game.maxPlayers}. Byt spel eller vänta tills någon lämnat.`
  if (count < game.minPlayers) return `Väntar på ${game.minPlayers - count} till.`
  return `Ni är tillräckligt många. ${isHost ? 'Du kan starta.' : `Väntar på ${hostName ?? 'värden'}.`}`
}

// Hur många streckade ringar för lediga platser som visas: en för varje som saknas, annars en så länge det finns
// plats. Spel utan övre gräns får alltid högst en extra ring.
export function emptySeats(count: number, game: Pick<GameInfo, 'minPlayers' | 'maxPlayers'>): number {
  if (game.maxPlayers !== undefined && count >= game.maxPlayers) return 0
  return Math.max(1, game.minPlayers - count)
}

// Inställningarna på en rad, för gästerna: "5 rundor · 30 s svarstid · Nästa fråga automatiskt".
export function settingsLine(state: Pick<GameState, 'game' | 'rounds' | 'guessSeconds' | 'autoAdvance' | 'imposterSettings' | 'tantSettings'>): string {
  // Exploderande Tanter har inga rundor, bara fällan att slå på eller av.
  if (state.game === TANT_GAME) return state.tantSettings.trap ? 'Med Tantsnaror' : 'Utan Tantsnaror'
  const words = roundWords(state.game)
  const parts = [`${state.rounds} ${state.rounds === 1 ? words.one : words.many}`]
  if (hasTempoSettings(state.game)) {
    parts.push(`${guessSecondsFor(state)} s svarstid`, state.autoAdvance ? 'Nästa fråga automatiskt' : 'Värden klickar fram nästa fråga')
  }
  if (state.game === 'imposterjakten') parts.push(...imposterSettingsParts(state.imposterSettings))
  return parts.join(' · ')
}
