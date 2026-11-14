// Slutskärmen i Exploderande Tanter: de utslagna i ordning, utmärkelserna och matchens siffror. Rena funktioner som
// läser bordet (TantTable) när matchen är slut.

import { EMPTY_TANT_STATS, type TantStats, type TantTable } from '@/lib/tantpanik'

export type TantAwardId = 'nope' | 'tjuv' | 'overlevare'

export type TantAward = {
  id: TantAwardId
  title: string
  // De som fick den. Lika många ger en delad utmärkelse.
  ids: string[]
  // Vad de gjorde, t.ex. "4 Nope!" eller "5 stulna kort".
  what: string
}

// Ordningstal på svenska: 1:a, 2:a, 3:e … 21:a, 22:a.
export function ordinal(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  return `${n}:${(last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'}`
}

// De utslagna, den som åkte ut sist först: "Exploderade 3:a", "Exploderade 2:a", "Exploderade först".
export function tantOutRows(table: Pick<TantTable, 'out'>): { id: string; label: string }[] {
  return table.out
    .map((id, index) => ({ id, label: index === 0 ? 'Exploderade först' : `Exploderade ${ordinal(index + 1)}` }))
    .reverse()
}

// Överlevaren och Tjuven kräver minst så här många, så att ingen får en tunn utmärkelse ("Desarmerade 1").
export const MIN_FOR_TANT_AWARD = 2

// De med flest (minst min), men bara om någon har fler än de andra: delar alla på samma siffra får ingen utmärkelsen.
function leaders(counts: Record<string, number>, players: readonly string[], min = 1): { ids: string[]; count: number } | null {
  const best = Math.max(0, ...players.map((id) => counts[id] ?? 0))
  if (best < min) return null
  const ids = players.filter((id) => (counts[id] ?? 0) === best)
  if (players.length > 1 && ids.length === players.length) return null
  return { ids, count: best }
}

// Utmärkelserna, bara de som någon faktiskt fått: Nope-drottningen (flest Nope!), Tjuven (flest stulna kort, minst 2) och
// Överlevaren (flest Desarmera, minst 2). Flera kan dela en utmärkelse, men inte alla.
export function tantAwards(table: Pick<TantTable, 'order' | 'stats'>): TantAward[] {
  const stats = table.stats ?? EMPTY_TANT_STATS
  const awards: TantAward[] = []
  const nope = leaders(stats.nopes, table.order)
  if (nope) awards.push({ id: 'nope', title: 'Nope-drottningen', ids: nope.ids, what: `${nope.count} Nope!` })
  const thief = leaders(stats.steals, table.order, MIN_FOR_TANT_AWARD)
  if (thief) awards.push({ id: 'tjuv', title: 'Tjuven', ids: thief.ids, what: `${thief.count} stulna kort` })
  const survivor = leaders(stats.defuses, table.order, MIN_FOR_TANT_AWARD)
  if (survivor) awards.push({ id: 'overlevare', title: 'Överlevaren', ids: survivor.ids, what: `Desarmerade ${survivor.count}` })
  return awards
}

// Matchens siffror på en rad: "38 drag · 12 kort stulna · 3 tanter gömda". value = siffrorna medan de räknas upp.
export function tantStatsLine(stats: Pick<TantStats, 'moves' | 'stolen' | 'hidden'>): string {
  const { moves, stolen, hidden } = stats
  return [
    `${moves} drag`,
    `${stolen} ${stolen === 1 ? 'kort stulet' : 'kort stulna'}`,
    `${hidden} ${hidden === 1 ? 'tant gömd' : 'tanter gömda'}`,
  ].join(' · ')
}
