// Korten i Exploderande Tanter: namn, regeltext, färg och hur många av varje som finns. Allt som har med korten att göra och som
// kan behöva justeras ligger här, så att reglerna i tantpanik.ts inte behöver ändras när en kortlek balanseras om.
// Texterna är egna. Kortbilderna kommer senare, så korten visas som text med en symbol och en färg.

export type CardType =
  | 'tant'
  | 'fika'
  | 'dubbelpass'
  | 'dudar'
  | 'intemin'
  | 'tjuvkika'
  | 'mobblera'
  | 'blanda'
  | 'underifran'
  | 'tjanst'
  | 'nadu'
  | 'bingo'
  | 'kaffe'
  | 'stickning'
  | 'stavgang'
  | 'tradgard'
  | 'vild'
  | 'snara'

// Vad kortet gör när det spelas ensamt. Tantkorten och fällan gör inget ensamma, utan används i par och tretal.
export type CardKind = 'bomb' | 'defuse' | 'action' | 'nope' | 'collect' | 'joker' | 'trap'

export type CardDef = {
  type: CardType
  name: string
  // Kort symbol på kortet, tills det finns riktiga bilder.
  symbol: string
  text: string
  kind: CardKind
  // Färgen på kortet (klasser från index.css), så att korten går att känna igen innan man läst texten.
  color: string
}

export const CARDS: Record<CardType, CardDef> = {
  tant: {
    type: 'tant',
    name: 'Exploderande tant',
    symbol: '💥',
    text: 'Visas direkt när du drar det. Har du en Fikapaus gömmer du tanten i högen igen. Annars är du ute.',
    kind: 'bomb',
    color: 'bg-destructive text-primary-foreground',
  },
  fika: {
    type: 'fika',
    name: 'Fikapaus',
    symbol: '☕',
    text: 'Räddar dig när du drar en exploderande tant. Göm tanten var du vill i högen. Din tur är slut.',
    kind: 'defuse',
    color: 'bg-mint',
  },
  dubbelpass: {
    type: 'dubbelpass',
    name: 'Dubbelpass',
    symbol: '⏩',
    text: 'Avsluta din tur utan att dra. Nästa spelare får två turer. Var du själv attackerad får nästa dina turer plus två.',
    kind: 'action',
    color: 'bg-coral-soft',
  },
  dudar: {
    type: 'dudar',
    name: 'Du där!',
    symbol: '👉',
    text: 'Som Dubbelpass, men du väljer vem som får turerna.',
    kind: 'action',
    color: 'bg-coral-soft',
  },
  intemin: {
    type: 'intemin',
    name: 'Inte min tur',
    symbol: '🙅',
    text: 'Avsluta en tur utan att dra. Har du flera turer kvar försvinner bara en.',
    kind: 'action',
    color: 'bg-sky-soft',
  },
  tjuvkika: {
    type: 'tjuvkika',
    name: 'Tjuvkika',
    symbol: '👀',
    text: 'Titta i hemlighet på de tre översta korten i högen.',
    kind: 'action',
    color: 'bg-lilac',
  },
  mobblera: {
    type: 'mobblera',
    name: 'Möblera om',
    symbol: '🔀',
    text: 'Titta i hemlighet på de tre översta korten och lägg tillbaka dem i den ordning du vill.',
    kind: 'action',
    color: 'bg-lilac',
  },
  blanda: {
    type: 'blanda',
    name: 'Blanda om',
    symbol: '🌀',
    text: 'Blanda hela draghögen.',
    kind: 'action',
    color: 'bg-sky-soft',
  },
  underifran: {
    type: 'underifran',
    name: 'Dra underifrån',
    symbol: '⤵️',
    text: 'Avsluta din tur genom att dra det understa kortet i stället för det översta.',
    kind: 'action',
    color: 'bg-sky-soft',
  },
  tjanst: {
    type: 'tjanst',
    name: 'Gör mig en tjänst',
    symbol: '🎁',
    text: 'Välj en spelare. Den väljer själv ett kort att ge dig.',
    kind: 'action',
    color: 'bg-sun-soft',
  },
  nadu: {
    type: 'nadu',
    name: 'Nä du!',
    symbol: '✋',
    text: 'Stoppa ett kort som någon precis spelat, även när det inte är din tur. Går inte på en exploderande tant eller en Fikapaus.',
    kind: 'nope',
    color: 'bg-primary text-primary-foreground',
  },
  bingo: {
    type: 'bingo',
    name: 'Bingotanten',
    symbol: '🎱',
    text: 'Gör inget ensam. Två lika: ta ett slumpat kort. Tre lika: be om ett kort.',
    kind: 'collect',
    color: 'bg-sun',
  },
  kaffe: {
    type: 'kaffe',
    name: 'Kaffetanten',
    symbol: '🫖',
    text: 'Gör inget ensam. Två lika: ta ett slumpat kort. Tre lika: be om ett kort.',
    kind: 'collect',
    color: 'bg-sun',
  },
  stickning: {
    type: 'stickning',
    name: 'Sticktanten',
    symbol: '🧶',
    text: 'Gör inget ensam. Två lika: ta ett slumpat kort. Tre lika: be om ett kort.',
    kind: 'collect',
    color: 'bg-sun',
  },
  stavgang: {
    type: 'stavgang',
    name: 'Stavgångstanten',
    symbol: '🥢',
    text: 'Gör inget ensam. Två lika: ta ett slumpat kort. Tre lika: be om ett kort.',
    kind: 'collect',
    color: 'bg-sun',
  },
  tradgard: {
    type: 'tradgard',
    name: 'Trädgårdstanten',
    symbol: '🌷',
    text: 'Gör inget ensam. Två lika: ta ett slumpat kort. Tre lika: be om ett kort.',
    kind: 'collect',
    color: 'bg-sun',
  },
  vild: {
    type: 'vild',
    name: 'Vild tant',
    symbol: '🃏',
    text: 'Räknas som valfri tant i ett par eller tretal. Kräver minst en riktig tant, och gäller inte andra kort.',
    kind: 'joker',
    color: 'bg-sun',
  },
  snara: {
    type: 'snara',
    name: 'Tantsnara',
    symbol: '🪤',
    text: 'Stjäl någon det här kortet från dig slår fällan igen. Du får två slumpade kort från tjuven, och fällan slängs.',
    kind: 'trap',
    color: 'bg-mint-soft',
  },
}

export const CARD_TYPES = Object.keys(CARDS) as CardType[]

// Tantkorten: fem sorter som bara används i par och tretal. Den vilda tanten kan ersätta dem.
export const COLLECT_TYPES: readonly CardType[] = CARD_TYPES.filter((type) => CARDS[type].kind === 'collect')

export function cardName(type: CardType): string {
  return CARDS[type].name
}

// Två kortgrupper. Med 2–3 spelare används den lilla, med 4–7 den stora och med 8–10 båda. Exploderande tanter läggs
// till separat (en färre än antalet spelare), och Tantsnaran också (TRAP_COUNT), så de finns inte här.
export type DeckGroup = 'liten' | 'stor'

export const DECK: Record<DeckGroup, Partial<Record<CardType, number>>> = {
  liten: {
    fika: 3,
    dubbelpass: 2,
    dudar: 2,
    intemin: 4,
    tjuvkika: 3,
    mobblera: 2,
    blanda: 2,
    underifran: 3,
    tjanst: 2,
    nadu: 4,
    bingo: 3,
    kaffe: 3,
    stickning: 3,
    stavgang: 3,
    tradgard: 3,
    vild: 2,
  },
  stor: {
    fika: 7,
    dubbelpass: 3,
    dudar: 3,
    intemin: 6,
    tjuvkika: 3,
    mobblera: 4,
    blanda: 4,
    underifran: 4,
    tjanst: 4,
    nadu: 5,
    bingo: 4,
    kaffe: 4,
    stickning: 4,
    stavgang: 4,
    tradgard: 4,
    vild: 4,
  },
}

// Antal exploderande tanter som finns totalt. En färre än antalet spelare läggs i högen.
export const BOMBS_TOTAL = 9
// Tantsnaror som läggs i leken när fällan är påslagen, i alla spelarantal.
export const TRAP_COUNT = 2
// Korten man har på handen från början, utöver sin Fikapaus.
export const START_CARDS = 7
// Hur länge (s) ett kort kan stoppas med Nä du! innan det händer. Varje Nä du! börjar om tiden.
export const NOPE_SECONDS = 5

export function groupsFor(players: number): DeckGroup[] {
  if (players <= 3) return ['liten']
  if (players <= 7) return ['stor']
  return ['liten', 'stor']
}
