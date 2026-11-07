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
  // Kan botar spela? I andra spel står botarna över matchen och tittar på (se gameHasBots i match.ts).
  bots?: boolean
  // Förklaringen som visas när man klickar på spelet: en bild (emoji), en rolig mening och kort hur det går till.
  // Saknas den visas tagline och spelets howTo i stället.
  intro?: { emoji: string; pitch: string; steps: string[] }
}

export const GAMES: GameInfo[] = [
  {
    id: 'gissa-priset',
    name: 'Gissa priset',
    tagline: 'Gissa vad saker kostar, nu och förr. Närmast får flest poäng.',
    quickRule: 'Gissa priset i kronor. Närmast rätt pris ger flest poäng.',
    emoji: '🏷️',
    color: 'bg-sun-soft',
    minPlayers: 2,
    maxPlayers: 12,
    feel: 'Klurigt',
    playable: true,
    bots: true,
    intro: {
      emoji: '💸',
      pitch:
        'Vem har bäst koll på vad saker kostar? Gissa och se hur långt ifrån ni är.',
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
    tagline: 'Välj ett tal mellan 1 och 100. Sedan slumpas ett tal fram. Vem kom närmast?',
    quickRule: 'Gissa ett tal mellan 1 och 100. Ju närmare, desto fler poäng, och sista rundan ger dubbelt.',
    emoji: '🎯',
    color: 'bg-peach',
    minPlayers: 2,
    maxPlayers: 12,
    feel: 'Slumpigt',
    playable: true,
    bots: true,
    intro: {
      emoji: '🍀',
      pitch: 'Välj ditt lyckotal och hoppas att det räcker. Närmast det slumpade talet vinner rundan.',
      steps: [
        'Alla gissar i hemlighet ett tal mellan 1 och 100, eller trycker Slumpa åt mig.',
        'När tiden är ute rullar en markör längs tallinjen och stannar på rätt tal.',
        'Ju närmare, desto fler poäng. Exakt rätt ger 10, och den som var närmast får 1 bonuspoäng.',
        'Sista rundan ger dubbla poäng. Flest poäng efter sista rundan vinner.',
      ],
    },
  },
  {
    // Arbetsnamn. Namnet visas bara härifrån, så det räcker att byta det här.
    id: 'kortkaos',
    name: 'Kortkaos',
    tagline: 'Fyll luckan med ditt roligaste kort. Domaren väljer sin favorit.',
    quickRule: 'Lägg kortet som passar bäst i luckan. Domaren väljer sin favorit.',
    emoji: '🃏',
    color: 'bg-lilac/40',
    minPlayers: 3,
    maxPlayers: 9,
    feel: 'Pratigt',
    playable: true,
  },
  {
    id: 'imposterjakten',
    name: 'Imposterjakten',
    tagline: 'Alla utom en får ett hemligt ord. Ge ledtrådar och avslöja den som bluffar.',
    quickRule: 'Alla utom en har samma ord. Ge ett ord var och lista ut vem som bluffar.',
    emoji: '🔍',
    color: 'bg-mint-soft',
    minPlayers: 3,
    maxPlayers: 10,
    feel: 'Bluffigt',
    playable: true,
    intro: {
      emoji: '🔍',
      pitch: 'Alla vet ordet. Utom en. Lista ut vem som bluffar innan bluffaren listar ut ordet.',
      steps: [
        'Alla utom en får samma hemliga ord. Impostern får inte ordet och måste smälta in.',
        'Ni ger ett ord var som hör ihop med det hemliga ordet, och det går två eller tre varv runt bordet.',
        'Efter näst sista varvet kan vem som helst anklaga någon, och då röstar de andra ja eller nej direkt.',
        'Annars diskuterar ni efter sista varvet och röstar fram vem ni tror är impostern.',
        'Fångar ni impostern får ni poäng, och impostern kan ta en poäng genom att gissa ordet. Kommer den undan får den poäng.',
        'Allt det är en omgång. Värden väljer 1 till 10 omgångar. Varje omgång får ett nytt ord och impostern lottas om, så det kan bli samma person igen. Flest poäng efter sista omgången vinner.',
      ],
    },
  },
  {
    id: 'tantpanik',
    // Arbetsnamn. Namnet står bara här (och i kortens texter i tantpanik-kort.ts).
    name: 'Exploderande Tanter',
    tagline: 'Dra kort och håll tummarna. Den som drar en exploderande tant utan Desarmera-kort åker ut.',
    quickRule: 'Spela kort och dra ur högen. Drar du en exploderande tant utan Desarmera-kort är du ute.',
    emoji: '💥',
    color: 'bg-sky-soft',
    minPlayers: 2,
    maxPlayers: 10,
    feel: 'Nervigt',
    playable: true,
    bots: true,
    intro: {
      emoji: '💥',
      pitch: 'Någonstans i högen väntar tanterna. Skicka turen vidare, kika i högen och stjäl av kompisarna. Sist kvar vinner.',
      steps: [
        'Alla får ett Desarmera-kort och sju kort. På din tur spelar du så många kort du vill, och sedan drar du ett kort ur högen.',
        'Drar du en exploderande tant är du ute, om du inte har ett Desarmera-kort. Då gömmer du tanten i högen igen, var du vill.',
        'Attack och Hoppa över låter dig slippa dra. Se framtiden och Ändra framtiden visar vad som ligger överst.',
        'Två lika kort tar ett slumpat kort från någon. Tre lika låter dig be om ett visst kort.',
        'Nope! stoppar ett kort som någon precis spelat, även när det inte är din tur. Sist kvar vinner.',
      ],
    },
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

// Vad en runda heter i spelet: omgång i Imposterjakten, runda i de andra.
export function roundWords(gameId: string): { one: string; many: string } {
  return gameId === 'imposterjakten' ? { one: 'omgång', many: 'omgångar' } : { one: 'runda', many: 'rundor' }
}

// "2–12 spelare" när det finns ett prövat största antal, annars "2+ spelare". Lobbyn har ingen hård gräns.
export function playersLabel(game: GameInfo): string {
  return game.maxPlayers ? `${game.minPlayers}–${game.maxPlayers} spelare` : `${game.minPlayers}+ spelare`
}
