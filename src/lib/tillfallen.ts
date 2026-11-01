// Tillfällena på startsidan: flikar ovanför spelen som sorterar dem efter vad som passar bäst. Inget spel göms eller
// tonas ned. Väljer man ett tillfälle följer förvalen med till lobbyn, och värden kan ändra dem där.

export type TillfalleId = 'alla' | 'forfest' | 'spelkvall' | 'discord'

export type Tillfalle = {
  id: TillfalleId
  name: string
  emoji?: string
  // Spelen i den ordning de visas, bäst först, och en kort rad om varför. Spel som saknas här kommer sist.
  games: { id: string; note: string }[]
  // Imposterjakten: sitter ni tillsammans och säger orden högt? Saknas det ändras inget.
  aloud?: boolean
}

export const TILLFALLEN: Tillfalle[] = [
  { id: 'alla', name: 'Alla', games: [] },
  {
    id: 'forfest',
    name: 'Förfesten',
    emoji: '🤡',
    aloud: true,
    games: [
      { id: 'imposterjakten', note: 'Ni säger orden högt' },
      { id: 'kortkaos', note: 'Bra när ni är många' },
      { id: 'narmast', note: 'Snabb uppvärmning' },
      { id: 'gissa-priset', note: 'Roligt att bråka om svaret' },
    ],
  },
  {
    id: 'spelkvall',
    name: 'Spelkvällen',
    emoji: '🃏',
    aloud: true,
    games: [
      { id: 'kortkaos', note: 'Flera rundor runt bordet' },
      { id: 'gissa-priset', note: 'Tävla om vem som vet mest' },
      { id: 'imposterjakten', note: 'Ni säger orden högt' },
      { id: 'narmast', note: 'Bra mellan de andra spelen' },
    ],
  },
  {
    id: 'discord',
    name: 'Discordgänget',
    emoji: '🤖',
    aloud: false,
    games: [
      { id: 'gissa-priset', note: 'Alla spelar på sin egen skärm' },
      { id: 'imposterjakten', note: 'Ni skriver orden i spelet' },
      { id: 'narmast', note: 'Snabb att dra igång' },
      { id: 'kortkaos', note: 'Domaren läser upp i samtalet' },
    ],
  },
]

export function findTillfalle(id: string | null | undefined): Tillfalle | undefined {
  return TILLFALLEN.find((tillfalle) => tillfalle.id === id)
}

// Spelen sorterade efter tillfället, med raden om varför. Alla spel är kvar.
export function gamesForTillfalle<G extends { id: string }>(id: TillfalleId, games: readonly G[]): { game: G; note?: string }[] {
  const order = findTillfalle(id)?.games ?? []
  const rank = (game: G) => {
    const i = order.findIndex((item) => item.id === game.id)
    return i === -1 ? order.length : i
  }
  return [...games]
    .map((game, i) => ({ game, i }))
    .sort((a, b) => rank(a.game) - rank(b.game) || a.i - b.i)
    .map(({ game }) => ({ game, note: order.find((item) => item.id === game.id)?.note }))
}

// Länken till att skapa en lobby, med tillfället om man valt ett.
export function createLobbyHref(gameId: string, id: TillfalleId): string {
  return id === 'alla' ? `/skapa?spel=${gameId}` : `/skapa?spel=${gameId}&tillfalle=${id}`
}

// Drickreglerna finns bara under Förfesten. Valfria, och de ska fungera lika bra utan alkohol.
export const DRINK_RULES: { game: string; rule: string }[] = [
  { game: 'Imposterjakten', rule: 'Kommer impostern undan tar alla andra en klunk. Fångas impostern tar den en klunk.' },
  { game: 'Kortkaos', rule: 'Den som vinner rundan väljer vem som tar en klunk.' },
  { game: 'Närmast vinner', rule: 'Den som är längst ifrån tar en klunk.' },
  { game: 'Gissa priset', rule: 'Den som är längst ifrån rätt pris tar en klunk.' },
]
