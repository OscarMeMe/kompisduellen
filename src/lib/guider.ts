// Texterna på guiderna (/forfestlekar …). Guiderna förrenderas som spelsidorna, så att sökmotorerna får all text direkt.
// Spelarantal och speltid hämtas från games.ts och spelsidor.ts i GuidePage, så att de inte kan bli fel här.

export type GuideFaq = { question: string; answer: string }

export type GuideGame = {
  gameId: string
  text: string
  // Vad man gissar på, en egen kolumn i jämförelsen (/gissningslekar).
  guessOn?: string
}

export type GuidePageInfo = {
  slug: string
  title: string
  description: string
  heading: string
  // Ett kort svar på sidans huvudfråga, först på sidan.
  answer: string
  // Spelen på sidan, med jämförelse och en startlänk per spel.
  games: GuideGame[]
  // Steg och avsnitt som inte hör till ett visst spel.
  howTo?: { heading: string; steps: string[] }
  sections?: { heading: string; text: string }[]
  faq: GuideFaq[]
}

const FREE: GuideFaq = {
  question: 'Kostar det något?',
  answer: 'Nej, alla spelen är helt gratis. Det finns inga köp i spelen.',
}

const NO_ACCOUNT: GuideFaq = {
  question: 'Behöver alla ett konto?',
  answer: 'Nej. Ingen behöver ett konto eller en app. Alla väljer ett namn och går med med koden.',
}

export const GUIDE_PAGES: GuidePageInfo[] = [
  {
    slug: 'forfestlekar',
    title: 'Förfestlekar på mobilen: 4 gratis spel | Kompisduellen',
    description:
      'Fyra gratis förfestlekar som ni spelar på varsin mobil: Gissa priset, Närmast vinner, Kortkaos och Imposterjakten. Ingen app och inget konto.',
    heading: 'Fyra förfestlekar som ni spelar på mobilen',
    answer:
      'Vill ni ha en lek till förfesten utan att plocka fram en kortlek och utan förberedelser? Här är fyra som är gratis och som ni spelar på varsin mobil. En skapar en lobby, resten går med med en kod på fyra bokstäver.',
    games: [
      {
        gameId: 'gissa-priset',
        text: 'Vad kostade en Game Boy 1990? Alla gissar, och den som är närmast får flest poäng. Ni behöver inte kunna svaret, det räcker att gissa.',
      },
      {
        gameId: 'narmast',
        text: 'Välj ett tal mellan 1 och 100. Sedan slumpas ett tal fram, och den som kom närmast tar rundan. Bra som uppvärmning, eller när ni behöver avgöra vem som ska diska.',
      },
      {
        gameId: 'kortkaos',
        text: 'Domaren visar ett kort med en lucka, och alla andra fyller den med sitt roligaste kort. Domaren väljer sin favorit. Här blir det snabbt högljutt.',
      },
      {
        gameId: 'imposterjakten',
        text: 'Alla utom en får samma hemliga ord. Ni säger ett ord var, två varv, och röstar sedan om vem som bluffar. Sitter ni tillsammans säger ni orden högt.',
      },
    ],
    faq: [
      FREE,
      NO_ACCOUNT,
      {
        question: 'Vilket spel ska vi börja med?',
        answer: 'Närmast vinner går snabbast och kräver ingen förklaring. Är ni minst tre passar Kortkaos eller Imposterjakten när stämningen är på väg upp.',
      },
    ],
  },
  {
    slug: 'spel-pa-discord',
    title: 'Spel att spela på Discord med kompisar | Kompisduellen',
    description:
      'Fyra gratis spel att köra medan ni pratar på Discord. Dela koden i chatten, och alla spelar på sin egen skärm i webbläsaren.',
    heading: 'Fyra spel att spela tillsammans på Discord',
    answer:
      'Ni kan spela Gissa priset, Närmast vinner, Kortkaos och Imposterjakten medan ni pratar på Discord. Spelen körs i webbläsaren, så ingen behöver installera något och alla spelar på sin egen skärm.',
    howTo: {
      heading: 'Så gör ni',
      steps: [
        'En av er öppnar kompisduellen.se, väljer ett spel och skapar en lobby.',
        'Dela koden på fyra bokstäver eller länken i chatten.',
        'Alla öppnar länken på sin egen mobil eller dator. Stanna kvar i röstsamtalet.',
        'Värden startar när alla är med.',
      ],
    },
    sections: [
      {
        heading: 'Så använder ni röstsamtalet',
        text: 'I Gissa priset och Närmast vinner är samtalet till för att skratta åt varandras gissningar. I Kortkaos kan domaren läsa upp korten. I Imposterjakten diskuterar ni vem som bluffar innan ni röstar, och väljer Nej, vi spelar på distans, så skriver ni orden i spelet.',
      },
      {
        heading: 'Dela inte skärmen när ni har hemliga kort',
        text: 'I Kortkaos ska handen och i Imposterjakten det hemliga ordet stanna på din egen skärm. Delar du skärmen ser alla vad du har.',
      },
    ],
    games: [
      { gameId: 'gissa-priset', text: 'Gissa vad saker kostar, nu och förr. Närmast får flest poäng.' },
      { gameId: 'narmast', text: 'Välj ett tal mellan 1 och 100 och se vem som kommer närmast det slumpade talet.' },
      { gameId: 'kortkaos', text: 'Fyll luckan med ditt roligaste kort. Domaren väljer sin favorit.' },
      { gameId: 'imposterjakten', text: 'Alla utom en får ett hemligt ord. Ge ledtrådar och avslöja den som bluffar.' },
    ],
    faq: [
      FREE,
      NO_ACCOUNT,
      {
        question: 'Behöver vi vara i ett röstsamtal?',
        answer: 'Nej, spelen fungerar utan. Men det blir roligare när ni hör varandra, särskilt när ni ska lista ut vem som bluffar i Imposterjakten.',
      },
    ],
  },
  {
    slug: 'gissningslekar',
    title: 'Gissningslekar online med kompisar | Kompisduellen',
    description:
      'Tre gratis gissningslekar online: gissa priser i Gissa priset, ett slumpat tal i Närmast vinner och vem som bluffar i Imposterjakten.',
    heading: 'Gissningslekar för er som gillar att chansa och klura',
    answer:
      'Tre gissningslekar, tre sätt att gissa. I Gissa priset gissar ni vad saker kostar, i Närmast vinner ett slumpat tal och i Imposterjakten vem som bluffar. Alla tre är gratis och spelas på varsin mobil eller dator.',
    games: [
      {
        gameId: 'gissa-priset',
        guessOn: 'Priser, nu och förr',
        text: 'Ni får en fråga som "Hur höga blev böterna i Sveriges första fortkörningsdom 1900?". Någon säger tusen kronor, någon annan en krona. Sedan visas svaret, och diskussionen är igång.',
      },
      {
        gameId: 'narmast',
        guessOn: 'Ett slumpat tal',
        text: 'Du väljer 50 för att vara säker, din kompis tar 7 för att det är ett lyckotal. Talet som slumpas fram blir 9. Inga faktakunskaper hjälper.',
      },
      {
        gameId: 'imposterjakten',
        guessOn: 'Ordledtrådar och vem som bluffar',
        text: 'Ordet är Paraply. En säger "regn", nästa säger "svart", och den tredje säger "väder", lite för försiktigt. Är det impostern? Ni röstar.',
      },
    ],
    faq: [
      FREE,
      NO_ACCOUNT,
      {
        question: 'Behöver man kunna något för att vara med?',
        answer: 'Nej. I Gissa priset räcker det att gissa, i Närmast vinner avgör turen och i Imposterjakten handlar det om att läsa av varandra.',
      },
    ],
  },
]
