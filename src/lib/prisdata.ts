// Saker till "Gissa priset". Allt är riktiga försäljningar.
//
// name: vad saken är (visas medan man gissar).
// clue: kort ledtråd med årtal och sammanhang (visas medan man gissar). Får inte avslöja priset.
// priceSek: ungefärligt pris omräknat till kronor med växelkursen vid försäljningen.
// fact: max en mening som visas när rätt svar avslöjas.
// source: var uppgiften kommer ifrån, så att den går att dubbelkolla.
//
// Lägg gärna till fler, men bara sådant som går att belägga med en källa.

export type PriceItem = {
  id: string
  emoji: string
  name: string
  clue: string
  priceSek: number
  fact: string
  source: string
}

export const PRICE_ITEMS: PriceItem[] = [
  {
    id: 'banan',
    emoji: '🍌',
    name: 'En banan fasttejpad på en vägg (konstverket "Comedian")',
    clue: 'Konstverk av Maurizio Cattelan, auktion i New York 2024',
    priceSek: 67_000_000,
    fact: "Såldes på Sotheby's i New York i november 2024 för 6,2 miljoner dollar, och köparen Justin Sun åt sedan upp bananen.",
    source: 'https://www.kpbs.org/news/national/2024/11/20/a-duct-taped-banana-sells-for-6-2-million-at-an-art-auction',
  },
  {
    id: 'rubinskor',
    emoji: '👠',
    name: 'Dorothys rubinröda skor från filmen Trollkarlen från Oz',
    clue: 'Filmrekvisita från 1939, auktion i USA 2024',
    priceSek: 357_000_000,
    fact: 'Klubbades på Heritage Auctions i december 2024 för 32,5 miljoner dollar inklusive avgifter, efter att en gång ha blivit stulna från ett museum.',
    source: 'https://artdependence.com/articles/dorothy-s-ruby-slippers-from-the-wizard-of-oz-sell-for-325-million/',
  },
  {
    id: 'bitcoinpizza',
    emoji: '🍕',
    name: 'Två pizzor som köptes med bitcoin år 2010',
    clue: 'Betalades med bitcoin i maj 2010. Gissa vad betalningen var värd då.',
    priceSek: 320,
    fact: 'Laszlo Hanyecz betalade 10 000 bitcoin den 22 maj 2010, värt runt 41 dollar då men hundratals miljoner i dag.',
    source: 'https://en.bitcoin.it/wiki/Pizza',
  },
  {
    id: 'tonfisk',
    emoji: '🐟',
    name: 'En blåfenad tonfisk på 278 kilo',
    clue: 'Årets första tonfiskauktion i Tokyo, januari 2019',
    priceSek: 27_700_000,
    fact: 'Sushikedjeägaren Kiyoshi Kimura köpte den på Toyosu-marknaden i Tokyo i januari 2019 för 333,6 miljoner yen.',
    source: 'https://www.timeout.com/tokyo/news/giant-tuna-sells-for-record-333-6-million-at-toyosu-markets-first-tuna-auction-of-2019',
  },
  {
    id: 'mario64',
    emoji: '🎮',
    name: 'Ett oöppnat exemplar av tv-spelet Super Mario 64',
    clue: 'Tv-spel från 1996, fortfarande inplastat, auktion i USA 2021',
    priceSek: 13_400_000,
    fact: 'Såldes på Heritage Auctions i juli 2021 för 1,56 miljoner dollar, då rekord för ett tv-spel.',
    source: 'https://www.rollingstone.com/culture/rs-gaming/super-mario-64-auction-record-1195538/',
  },
  {
    id: 'stegosaurus',
    emoji: '🦕',
    name: 'Ett Stegosaurus-skelett med smeknamnet "Apex"',
    clue: 'Omkring 150 miljoner år gammalt fossil, auktion i New York 2024',
    priceSek: 473_000_000,
    fact: "Såldes på Sotheby's i New York i juli 2024 för 44,6 miljoner dollar, rekord för ett fossil.",
    source: 'https://www.aljazeera.com/news/2024/7/18/stegosaurus-skeleton-nicknamed-apex-sells-for-record-44-6m',
  },
  {
    id: 'skylt-p7',
    emoji: '🚗',
    name: 'Registreringsskylten "P 7" i Dubai',
    clue: 'Välgörenhetsauktion i Dubai, 2023',
    priceSek: 156_000_000,
    fact: 'Klubbades för 55 miljoner dirham (cirka 15 miljoner dollar) på en välgörenhetsauktion i Dubai i april 2023.',
    source: 'https://www.smithsonianmag.com/smart-news/this-license-plate-just-became-the-most-expensive-in-the-world-180981987/',
  },
  {
    id: 'meloner',
    emoji: '🍈',
    name: 'Två japanska Yubari-meloner',
    clue: 'Lyxfrukt på auktion i Sapporo, Japan, 2019',
    priceSek: 440_000,
    fact: 'Ropades in på en auktion i Sapporo i maj 2019 för 5 miljoner yen.',
    source: 'https://www.dailysabah.com/life/2019/05/24/2-japanese-melons-sell-for-record-45500',
  },
  {
    id: 'pikachu',
    emoji: '⚡',
    name: 'Ett Pokémonkort, Pikachu Illustrator, i toppskick',
    clue: 'Samlarkort från 1990-talet, köpt av en Youtube-stjärna 2021',
    priceSek: 45_000_000,
    fact: 'Logan Paul köpte kortet i Dubai i juli 2021 för 5,275 miljoner dollar, delvis betalt med ett annat Pikachu-kort.',
    source: 'https://guinnessworldrecords.com/news/2022/4/logan-paul-owns-5-275-million-pokemon-card-after-record-breaking-trade-697189',
  },
  {
    id: 'birkin',
    emoji: '👜',
    name: 'Jane Birkins egen, allra första Birkin-väska',
    clue: 'Handväska från 1985, auktion i Paris 2025',
    priceSek: 96_000_000,
    fact: "Såldes på Sotheby's i Paris i juli 2025 för 8,6 miljoner euro inklusive avgifter.",
    source: 'https://www.nbcwashington.com/news/national-international/jane-birkins-original-hermes-bag-sells-10-1-million-paris-auction/3953999/',
  },
  {
    id: 'diana-trojan',
    emoji: '🐑',
    name: 'Prinsessan Dianas tröja med ett svart får bland vita',
    clue: 'Stickad tröja från 1980-talet, auktion i New York 2023',
    priceSek: 12_700_000,
    fact: "Såldes på Sotheby's i New York i september 2023 för drygt 1,1 miljoner dollar.",
    source: 'https://www.fox7austin.com/news/princess-dianas-black-sheep-sweater-sells-for-record-breaking-1-1m',
  },
  {
    id: 'buffett-lunch',
    emoji: '🥪',
    name: 'En lunch med miljardären Warren Buffett',
    clue: 'Välgörenhetsauktion på eBay, 2022',
    priceSek: 192_000_000,
    fact: 'Vinnaren av en välgörenhetsauktion på eBay i juni 2022 betalade 19 miljoner dollar, som gick till organisationen Glide i San Francisco.',
    source: 'https://theglobeandmail.com/world/article-warren-buffett-charity-lunch-fetches-record-winning-bid-of-19m/',
  },
  {
    id: 'macallan-1926',
    emoji: '🥃',
    name: 'En flaska whisky, Macallan från 1926',
    clue: 'Whisky som tappades på flaska 1986, auktion i London 2023',
    priceSek: 28_000_000,
    fact: "Såldes på Sotheby's i London i november 2023 för 2,1 miljoner pund, rekord för en flaska sprit.",
    source: 'https://news.artnet.com/art-world/record-macallan-adami-whisky-2398184',
  },
  {
    id: 'forsta-tweeten',
    emoji: '🐦',
    name: 'Twitters allra första tweet, såld som NFT',
    clue: 'Digital samlarbild (NFT), såld 2021',
    priceSek: 25_000_000,
    fact: 'Jack Dorseys tweet från 2006 såldes i mars 2021 för 2,9 miljoner dollar, men ett år senare var NFT:n nästan värdelös.',
    source: 'https://www.cnbc.com/2021/03/22/jack-dorsey-sells-his-first-tweet-ever-as-an-nft-for-over-2point9-million.html',
  },
  {
    id: 'einstein-brev',
    emoji: '✉️',
    name: 'Ett handskrivet brev där Albert Einstein skriver om Gud',
    clue: 'Handskrivet brev från 1954, auktion i New York 2018',
    priceSek: 26_000_000,
    fact: "Det så kallade Gudsbrevet från 1954 såldes på Christie's i New York i december 2018 för 2,9 miljoner dollar.",
    source: 'https://www.cnbc.com/2018/12/05/einsteins-god-letter-sold-at-auction-for-2point9-million--heres-why.html',
  },
  {
    id: 'double-eagle',
    emoji: '🪙',
    name: 'Ett amerikanskt guldmynt, Double Eagle från 1933',
    clue: 'Guldmynt som aldrig gavs ut officiellt, auktion i New York 2021',
    priceSek: 163_000_000,
    fact: "Såldes på Sotheby's i New York i juni 2021 för 18,9 miljoner dollar, rekord för ett mynt.",
    source: 'https://www.smithsonianmag.com/smart-news/1933-double-eagle-sells-189-million-sets-world-record-most-valuable-coin-180977965/',
  },
  {
    id: 'among-us-nugget',
    emoji: '🍗',
    name: 'En kycklingnugget formad som en figur från spelet Among Us',
    clue: 'Budgivning på eBay, 2021',
    priceSek: 860_000,
    fact: 'Såldes på eBay i juni 2021 för 99 997 dollar.',
    source: 'https://www.guinnessworldrecords.com/world-records/663245-most-expensive-chicken-nugget-sold-at-online-auction',
  },
  {
    id: 'ostmacka',
    emoji: '🧀',
    name: 'En tio år gammal grillad ostmacka som sades föreställa Jungfru Maria',
    clue: 'Budgivning på eBay, 2004',
    priceSek: 190_000,
    fact: 'Ett nätkasino köpte den på eBay i november 2004 för 28 000 dollar.',
    source: 'https://www.nbcnews.com/id/wbna6511148',
  },
  {
    id: 'jordan-skor',
    emoji: '👟',
    name: 'Michael Jordans skor från en match i NBA-finalen 1998',
    clue: 'Använda i en NBA-final, auktion i New York 2023',
    priceSek: 23_300_000,
    fact: "Såldes på Sotheby's i New York i april 2023 för 2,2 miljoner dollar, rekord för använda sneakers.",
    source: 'https://www.cnbc.com/2023/04/11/michael-jordans-last-dance-shoes-are-most-expensive-sneakers-ever-sold.html',
  },
  {
    id: 'tre-skilling',
    emoji: '📮',
    name: 'Ett svenskt frimärke, Gul tre skilling banco från 1855',
    clue: 'Svenskt frimärke tryckt i fel färg, sålt 1996',
    priceSek: 15_800_000,
    fact: 'Såldes 1996 för 2,88 miljoner schweizerfranc och är det enda kända exemplaret, tryckt i fel färg.',
    source: 'https://en.wikipedia.org/wiki/Treskilling_Yellow',
  },
]

// Max antal siffror man kan skriva in (1 000 000 000 000 kr = 13 siffror).
export const MAX_PRICE_DIGITS = 13

export function findPriceItem(id: string | null | undefined): PriceItem | undefined {
  return PRICE_ITEMS.find((item) => item.id === id)
}

// Poäng efter hur nära man är, räknat i procent och inte i kronor.
// Exakt rätt = 100. Hälften eller dubbla priset = 70. Tio gånger fel (eller mer) = 0.
export function pricePoints(guess: number, price: number): number {
  if (guess <= 0 || price <= 0) return 0
  const factor = Math.abs(Math.log10(guess / price))
  return Math.max(0, Math.round(100 * (1 - factor)))
}

// "67 000 000" -> "ca 67 miljoner kr"
export function formatSekShort(value: number): string {
  if (value >= 1_000_000_000) return `${formatDecimal(value / 1_000_000_000)} miljarder kr`
  if (value >= 1_000_000) return `${formatDecimal(value / 1_000_000)} miljoner kr`
  return `${formatSek(value)}`
}

export function formatSek(value: number): string {
  return `${Math.round(value).toLocaleString('sv-SE')} kr`
}

function formatDecimal(value: number): string {
  return value.toLocaleString('sv-SE', { maximumFractionDigits: value < 10 ? 1 : 0 })
}
