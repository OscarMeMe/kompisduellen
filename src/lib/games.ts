// Alla spel som visas på startsidan, i den ordning de visas. Lägg till nya spel här.

export type GameInfo = {
  id: string
  name: string
  tagline: string
  emoji: string
  color: string // Tailwind-klass för kortets pastellfärg
  // Minsta antal spelare för en vanlig match. Det finns ingen övre gräns i lobbyn.
  minPlayers: number
  playable: boolean
  // Förklaringen som visas när man klickar på spelet: en bild (emoji), en rolig mening och kort hur det går till.
  // Saknas den visas tagline och spelets howTo i stället.
  intro?: { emoji: string; pitch: string; steps: string[] }
}

export const GAMES: GameInfo[] = [
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Vad kostar det – eller vad kostade det förr?',
    emoji: '🏷️',
    color: 'bg-sun-soft',
    minPlayers: 2,
    playable: true,
    intro: {
      emoji: '💸',
      pitch:
        'Spelet där det snabbt avslöjas vilka kompisar som är helt verklighetsfrånvända och vilka som faktiskt har fötterna på jorden.',
      steps: [
        'Alla ser samma sak: en pryl, en biljett eller något från förr, och vilket år priset gällde.',
        'Gissa priset i kronor innan tiden tar slut. Gamla priser gäller i dåtidens kronor.',
        'Ju närmare rätt pris, desto fler poäng. Fullträff ger 100, och flest poäng efter sista rundan vinner.',
      ],
    },
  },
  {
    id: 'narmast',
    name: 'Närmast vinner',
    tagline: 'Ett snabbt turspel: gissa ett tal mellan 1 och 100. Talet slumpas, så det handlar om tur.',
    emoji: '🎯',
    color: 'bg-coral-soft',
    minPlayers: 2,
    playable: true,
    intro: {
      emoji: '🍀',
      pitch: 'Ren tur förklädd till strategi. Alla har exakt lika stor chans, så ingen har något att skylla på.',
      steps: [
        'Alla gissar i hemlighet ett tal mellan 1 och 100.',
        'När tiden är ute slumpas rätt tal fram.',
        'Den som var närmast får en poäng. Flest poäng efter sista rundan vinner.',
      ],
    },
  },
  {
    // Arbetsnamn. Namnet visas bara härifrån, så det räcker att byta det här.
    id: 'kortkaos',
    name: 'Kortkaos',
    tagline: 'Fyll luckan med det fräckaste kortet på handen. Domaren väljer vinnaren, och ingen vet vem som spelade vad.',
    emoji: '🃏',
    color: 'bg-lilac/40',
    minPlayers: 3,
    playable: true,
  },
  {
    id: 'vem-skrev',
    name: 'Vem skrev vad?',
    tagline: 'Alla svarar anonymt. Kan du lista ut vem som skrev vad?',
    emoji: '🕵️',
    color: 'bg-mint-soft',
    minPlayers: 3,
    playable: false,
  },
  {
    id: 'mest-trolig',
    name: 'Mest trolig att…',
    tagline: 'Rösta fram vem i gänget som passar bäst in på påståendet.',
    emoji: '🗳️',
    color: 'bg-sky-soft',
    minPlayers: 3,
    playable: false,
  },
]

export function findGame(id: string | null | undefined): GameInfo | undefined {
  return GAMES.find((game) => game.id === id)
}

// "2+ spelare". Lobbyn har ingen övre gräns, så bara det minsta antalet visas.
export function playersLabel(game: GameInfo): string {
  return `${game.minPlayers}+ spelare`
}
