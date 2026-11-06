// Korten i Exploderande Tanter: namn, text, bild, färg och hur många av varje som finns. Allt som har med korten att
// göra och som kan behöva justeras ligger här, så att reglerna i tantpanik.ts inte behöver ändras när en kortlek
// balanseras om eller ett kort får en bild.
//
// Kortbilderna ligger i public/images/tantpanik/ (två storlekar per kort, se cardImage). Beskrivningen av bilderna och
// hur de ska visas ligger lokalt i docs/tantpanik-bilder-README.md. Kort utan bild visas som textkort med symbol och
// färg. Typerna (CardType) är spelets interna id:n och skickas i meddelandena. De ändras inte när ett kort byter namn.

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
  | 'regnbage'
  | 'kupong'
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
  // Symbol på textkortet, för kort som saknar bild.
  symbol: string
  // Texten på kortet. För kort med bild är det texten som står på bilden.
  text: string
  // Längre förklaring i regelvyn, när kortets text inte säger allt. Saknas den visas text.
  rule?: string
  kind: CardKind
  // Färgen på textkortet (klasser från index.css), så att korten går att känna igen innan man läst texten.
  color: string
  // Bildens namn i public/images/tantpanik/ (utan storlek och filändelse). Saknas den visas ett textkort.
  image?: string
}

// Tantkorten har samma text. Regnbågstanten och Kupongtanten har den på sina bilder.
const COLLECT_TEXT = 'Kan inte spelas ensamt. Spela två lika och stjäl ett slumpat kort från en annan spelare.'
const COLLECT_RULE =
  'Gör inget ensam. Två lika (eller en med en Vild tant): ta ett slumpat kort från någon. Tre lika: be om ett visst kort.'

export const CARDS: Record<CardType, CardDef> = {
  tant: {
    type: 'tant',
    name: 'Exploderande tant',
    symbol: '💥',
    text: 'Desarmera eller åk ut.',
    rule: 'Visas direkt när du drar det. Har du ett Desarmera-kort gömmer du tanten i högen igen, var du vill. Annars är du ute.',
    kind: 'bomb',
    // Svart kort, som kortbilden: en arg tant i röd kavaj som pekar på dig.
    color: 'bg-foreground text-card',
    image: 'exploderande-tant',
  },
  fika: {
    type: 'fika',
    name: 'Desarmera',
    symbol: '☕',
    text: 'Räddar dig. Lägg tillbaka den exploderande tanten på en hemlig plats i högen.',
    rule: 'Används av sig själv när du drar en exploderande tant. Göm tanten var du vill i högen. Din tur är slut.',
    kind: 'defuse',
    color: 'bg-mint',
    image: 'desarmera',
  },
  dubbelpass: {
    type: 'dubbelpass',
    name: 'Attack',
    symbol: '⏩',
    text: 'Avsluta din tur utan att dra. Nästa spelare tar två turer.',
    rule: 'Avsluta din tur utan att dra. Nästa spelare får två turer. Var du själv attackerad får nästa dina turer plus två.',
    kind: 'action',
    color: 'bg-coral-soft',
    image: 'attack',
  },
  dudar: {
    type: 'dudar',
    name: 'Riktad attack',
    symbol: '👉',
    text: 'Avsluta din tur utan att dra. Välj en annan spelare som tar två turer.',
    rule: 'Som Attack, men du väljer vem som får turerna. Var du själv attackerad får den du väljer dina turer plus två.',
    kind: 'action',
    color: 'bg-coral-soft',
    image: 'riktad-attack',
  },
  intemin: {
    type: 'intemin',
    name: 'Hoppa över',
    symbol: '🙅',
    text: 'Avsluta din tur utan att dra ett kort.',
    rule: 'Avsluta en tur utan att dra. Har du flera turer kvar försvinner bara en.',
    kind: 'action',
    color: 'bg-sky-soft',
    image: 'hoppa-over',
  },
  tjuvkika: {
    type: 'tjuvkika',
    name: 'Se framtiden',
    symbol: '👀',
    text: 'Titta i hemlighet på de tre översta korten. Lägg tillbaka dem i samma ordning.',
    kind: 'action',
    color: 'bg-lilac',
    image: 'se-framtiden',
  },
  mobblera: {
    type: 'mobblera',
    name: 'Ändra framtiden',
    symbol: '🔀',
    text: 'Titta i hemlighet på de tre översta korten. Lägg tillbaka dem i valfri ordning.',
    kind: 'action',
    color: 'bg-lilac',
    image: 'andra-framtiden',
  },
  blanda: {
    type: 'blanda',
    name: 'Blanda',
    symbol: '🌀',
    text: 'Blanda hela högen.',
    kind: 'action',
    color: 'bg-sky-soft',
    image: 'blanda',
  },
  underifran: {
    type: 'underifran',
    name: 'Dra underifrån',
    symbol: '⤵️',
    text: 'Avsluta din tur genom att dra det understa kortet i högen.',
    kind: 'action',
    color: 'bg-sky-soft',
    image: 'dra-underifran',
  },
  tjanst: {
    type: 'tjanst',
    name: 'Tjänst',
    symbol: '🎁',
    text: 'Välj en spelare som ger dig ett kort. Spelaren väljer vilket.',
    kind: 'action',
    color: 'bg-sun-soft',
    image: 'tjanst',
  },
  nadu: {
    type: 'nadu',
    name: 'Nope!',
    symbol: '✋',
    text: 'Stoppa en effekt, även på andras tur. Gäller inte Exploderande tant eller Desarmera.',
    rule: 'Stoppa ett kort som någon precis spelat, även när det inte är din tur. Ett Nope! på ett Nope! gör att kortet gäller igen. Gäller inte Exploderande tant eller Desarmera.',
    kind: 'nope',
    color: 'bg-primary text-primary-foreground',
    image: 'nope',
  },
  regnbage: {
    type: 'regnbage',
    name: 'Regnbågstanten',
    symbol: '🌈',
    text: COLLECT_TEXT,
    rule: COLLECT_RULE,
    kind: 'collect',
    color: 'bg-lilac',
    image: 'regnbagstanten',
  },
  kupong: {
    type: 'kupong',
    name: 'Kupongtanten',
    symbol: '🏷️',
    text: COLLECT_TEXT,
    rule: COLLECT_RULE,
    kind: 'collect',
    color: 'bg-sun',
    image: 'kupongtanten',
  },
  stickning: {
    type: 'stickning',
    name: 'Sticktanten',
    symbol: '🧶',
    text: COLLECT_TEXT,
    rule: COLLECT_RULE,
    kind: 'collect',
    color: 'bg-sun',
  },
  stavgang: {
    type: 'stavgang',
    name: 'Stavgångstanten',
    symbol: '🥢',
    text: COLLECT_TEXT,
    rule: COLLECT_RULE,
    kind: 'collect',
    color: 'bg-sun',
  },
  tradgard: {
    type: 'tradgard',
    name: 'Trädgårdstanten',
    symbol: '🌷',
    text: COLLECT_TEXT,
    rule: COLLECT_RULE,
    kind: 'collect',
    color: 'bg-sun',
  },
  vild: {
    type: 'vild',
    name: 'Vild tant',
    symbol: '🃏',
    text: 'Ersätter valfritt tantkort. Kan inte ersätta effektkort.',
    rule: 'Räknas som valfri tant i ett par eller tretal. Kräver minst en riktig tant, och gäller inte andra kort.',
    kind: 'joker',
    color: 'bg-sun',
    image: 'vild-tant',
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
    regnbage: 3,
    kupong: 3,
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
    regnbage: 4,
    kupong: 4,
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
// Korten man har på handen från början, utöver sitt Desarmera-kort.
export const START_CARDS = 7
// Hur länge (s) ett kort kan stoppas med Nä du! innan det händer. Varje Nä du! börjar om tiden.
export const NOPE_SECONDS = 5

export function groupsFor(players: number): DeckGroup[] {
  if (players <= 3) return ['liten']
  if (players <= 7) return ['stor']
  return ['liten', 'stor']
}

// Kortets bild i en viss bredd (360 eller 960 px), eller undefined för ett kort utan bild.
export const CARD_IMAGE_WIDTHS = [360, 960] as const
export function cardImage(type: CardType, width: (typeof CARD_IMAGE_WIDTHS)[number]): string | undefined {
  const image = CARDS[type].image
  return image ? `/images/tantpanik/${image}-${width}.webp` : undefined
}

// srcset för kortets bild, så att webbläsaren väljer storlek efter hur stort kortet visas.
export function cardSrcSet(type: CardType): string | undefined {
  if (!CARDS[type].image) return undefined
  return CARD_IMAGE_WIDTHS.map((width) => `${cardImage(type, width)} ${width}w`).join(', ')
}
