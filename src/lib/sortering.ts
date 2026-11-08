// Sorteringen av de spelbara spelen på startsidan: Populärast (förval, en ordning vi bestämmer själva i games.ts med
// popularOrder), Nyheter (nyaste först, efter addedAt i games.ts), A–Ö och Ö–A (svensk ordning, å, ä och ö sist). Ett
// eget val sparas i webbläsaren. Den som inte valt något ser alltid Populärast. Rena funktioner utom lagringen.

export type GameSort = 'populart' | 'nytt' | 'a-o' | 'o-a'

export const GAME_SORTS: readonly { id: GameSort; label: string }[] = [
  { id: 'populart', label: 'Populärast' },
  { id: 'nytt', label: 'Nyheter' },
  { id: 'a-o', label: 'A–Ö' },
  { id: 'o-a', label: 'Ö–A' },
]

export const DEFAULT_GAME_SORT: GameSort = 'populart'

type Sortable = { name: string; popularOrder?: number; addedAt?: string }

const swedish = new Intl.Collator('sv', { sensitivity: 'base' })

// Spelen i vald ordning. Lika (eller saknat värde) behåller ordningen de hade, och spel utan värde hamnar sist.
export function sortGames<G extends Sortable>(games: readonly G[], sort: GameSort): G[] {
  const indexed = games.map((game, i) => ({ game, i }))
  const compare = (a: { game: G; i: number }, b: { game: G; i: number }): number => {
    switch (sort) {
      case 'populart':
        return (a.game.popularOrder ?? Infinity) - (b.game.popularOrder ?? Infinity) || a.i - b.i
      case 'nytt':
        return (b.game.addedAt ?? '').localeCompare(a.game.addedAt ?? '') || a.i - b.i
      case 'a-o':
        return swedish.compare(a.game.name, b.game.name) || a.i - b.i
      case 'o-a':
        return swedish.compare(b.game.name, a.game.name) || a.i - b.i
    }
  }
  return indexed.sort(compare).map(({ game }) => game)
}

export function isGameSort(value: unknown): value is GameSort {
  return GAME_SORTS.some((sort) => sort.id === value)
}

const SORT_KEY = 'kd-spelsortering'

// Det egna valet, eller Populärast om inget är valt (eller lagringen inte går att läsa).
export function loadGameSort(): GameSort {
  try {
    const saved = localStorage.getItem(SORT_KEY)
    return isGameSort(saved) ? saved : DEFAULT_GAME_SORT
  } catch {
    return DEFAULT_GAME_SORT
  }
}

export function saveGameSort(sort: GameSort) {
  try {
    localStorage.setItem(SORT_KEY, sort)
  } catch {
    // Utan lagring gäller valet bara tills sidan laddas om.
  }
}
