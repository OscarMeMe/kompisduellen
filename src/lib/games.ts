// Alla spel som visas på startsidan, i den ordning de visas. Lägg till nya spel här.

export type GameInfo = {
  id: string
  name: string
  tagline: string
  // En kort regelmening som visas under nedräkningen innan första rundan.
  quickRule?: string
  emoji: string
  color: string // Tailwind-klass för kortets pastellfärg
  // Minsta antal spelare för en vanlig match. Det finns ingen övre gräns i lobbyn.
  minPlayers: number
  // Största antal spelare som är prövat. Saknas det finns ingen känd gräns, och då visas bara minsta antalet.
  maxPlayers?: number
  // Hur det känns att spela, i några ord.
  feel?: string
  playable: boolean
  // Förklaringen som visas när man klickar på spelet: en bild (emoji), en rolig mening och kort hur det går till.
  // Saknas den visas tagline och spelets howTo i stället.
  intro?: { emoji: string; pitch: string; steps: string[] }
}

export const GAMES: GameInfo[] = [
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Vad kostar det i dag? Och vad kostade det förr?',
    quickRule: 'Gissa priset i kronor. Närmast rätt pris ger flest poäng.',
    emoji: '🏷️',
    color: 'bg-sun-soft',
    minPlayers: 2,
    maxPlayers: 12,
    feel: 'Klurigt',
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
    tagline: 'Gissa ett tal mellan 1 och 100. Närmast vinner.',
    quickRule: 'Gissa ett tal mellan 1 och 100. Närmast det dolda talet vinner rundan.',
    emoji: '🎯',
    color: 'bg-coral-soft',
    minPlayers: 2,
    maxPlayers: 12,
    feel: 'Slumpigt',
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
    tagline: 'Fyll luckan med det fräckaste kortet på handen. Domaren väljer sin favorit.',
    quickRule: 'Lägg kortet som passar bäst i luckan. Domaren väljer sin favorit.',
    emoji: '🃏',
    color: 'bg-lilac/40',
    minPlayers: 3,
    maxPlayers: 9,
    feel: 'Pratigt',
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

// "2–12 spelare" när det finns ett prövat största antal, annars "2+ spelare". Lobbyn har ingen hård gräns.
export function playersLabel(game: GameInfo): string {
  return game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers} spelare` : `${game.minPlayers}+ spelare`
}
