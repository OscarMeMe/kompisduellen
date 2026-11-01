// Spelsidorna (/spel/gissa-priset …): en sida per spel som berättar vad spelet är, så att den går att hitta i
// sökmotorer. Texterna står här och sidan ritas av GameInfoPage. Spelets namn, spelarantal och känsla kommer från
// games.ts. Sökvägarna krockar inte med /spel/:code (lobbykoder har fyra bokstäver), och en fast sökväg går alltid
// före :code i React Router.

export type Faq = { question: string; answer: string }

export type GamePageInfo = {
  slug: string
  // Spelets id i games.ts och i /skapa?spel=...
  gameId: string
  title: string
  description: string
  heading: string
  intro: string[]
  steps: string[]
  time: string
  faq: Faq[]
  // Egen bild när sidan delas (1200 × 630 i public/og). Saknas den visas loggan.
  image?: { path: string; alt: string }
}

// Gemensamma frågor, med spelets namn där det passar.
function commonFaq(name: string, minPlayers: number): Faq[] {
  const fewest = minPlayers === 2 ? 'två' : 'tre'
  return [
    {
      question: `Kostar ${name} något?`,
      answer: 'Nej, det är helt gratis. Det finns inga köp i spelet och ingen behöver skapa ett konto.',
    },
    {
      question: 'Behöver vi ladda ner en app?',
      answer:
        'Nej. Allt körs i webbläsaren, så det räcker att öppna kompisduellen.se och skriva in koden. Vill du ha spelet på hemskärmen kan du lägga till det där som en app.',
    },
    {
      question: 'Funkar det på distans, till exempel i Discord?',
      answer: `Ja. Alla spelar på sin egen skärm, så ni kan sitta i samma soffa eller prata i Discord, Teams eller ett videosamtal. Dela koden eller länken i chatten, så är ni igång. Ni behöver vara minst ${fewest}.`,
    },
    {
      question: 'Går det att spela på mobilen?',
      answer:
        'Ja, spelet är gjort för mobilen. Det går lika bra på surfplatta och dator, och alla behöver inte ha samma sorts enhet.',
    },
  ]
}

export const GAME_PAGES: GamePageInfo[] = [
  {
    slug: 'gissa-priset',
    gameId: 'gissa-priset',
    title: 'Gissa priset online med kompisar | Kompisduellen',
    description:
      'Gissa vad saker kostar i dag och vad de kostade förr. Ett gratis prisquiz för 2–12 spelare, på mobilen, på förfesten eller i Discord.',
    heading: 'Gissa priset med kompisarna',
    intro: [
      'Vad kostade en Piggelin 1972? Och vad fick man betala för en Game Boy när den kom? I Gissa priset ser alla samma sak och gissar priset i kronor. Den som hamnar närmast får flest poäng.',
      'Ett prisquiz för kompisar. Ni behöver inte kunna svaret, det räcker att gissa. Det finns över 140 saker att gissa på, från vardagsvaror och biljetter till udda auktionsfynd. Gamla priser gäller i dåtidens kronor, och diskussionen efteråt brukar ta längre tid än själva frågan.',
    ],
    steps: [
      'En av er skapar en lobby och delar koden på fyra bokstäver med resten av gänget.',
      'Alla går med från sin egen mobil eller dator.',
      'Ni ser samma sak och vilket år priset gällde. Skriv in er gissning i kronor innan tiden tar slut.',
      'Rätt pris visas direkt. Ju närmare ni var, desto fler poäng. Fullträff ger 100.',
      'Efter sista frågan vinner den med flest poäng. Sen är det dags för revansch.',
    ],
    time: '5–15 minuter',
    faq: [
      ...commonFaq('Gissa priset', 2),
      {
        question: 'Kan jag testa själv först?',
        answer: 'Ja. Tryck på Testa själv högst upp på den här sidan, så får du köra en kort provomgång på egen hand.',
      },
    ],
  },
  {
    slug: 'narmast-vinner',
    gameId: 'narmast',
    title: 'Närmast vinner: gissningslek för kompisgänget | Kompisduellen',
    description:
      'Gissa ett tal mellan 1 och 100. Den som hamnar närmast vinner rundan. En snabb och gratis gissningslek för 2–12 spelare på mobilen.',
    heading: 'Närmast vinner: gissa ett tal och hoppas på tur',
    intro: [
      'Alla gissar i hemlighet ett tal mellan 1 och 100. När tiden är ute slumpas rätt tal fram, och den som var närmast tar rundan.',
      'Inga ledtrådar och inga faktakunskaper behövs. Välj ett tal och se vem som kommer närmast. Perfekt som uppvärmning på förfesten, eller när ni vill avgöra vem som ska diska.',
    ],
    steps: [
      'En av er skapar en lobby och delar koden på fyra bokstäver.',
      'Alla går med från sin egen mobil eller dator.',
      'Gissa ett tal mellan 1 och 100 innan tiden tar slut.',
      'Rätt tal slumpas fram. Den som var närmast får en poäng.',
      'Flest poäng efter sista rundan vinner matchen.',
    ],
    time: '2–5 minuter',
    faq: commonFaq('Närmast vinner', 2),
  },
  {
    slug: 'kortkaos',
    gameId: 'kortkaos',
    title: 'Kortkaos: kortspel online för förfesten | Kompisduellen',
    description:
      'Fyll luckan i meningen med det roligaste kortet på handen. Domaren väljer sin favorit. Ett gratis kortspel online för 3–9 spelare.',
    heading: 'Kortkaos: kortspelet där det roligaste svaret vinner',
    intro: [
      'Varje runda visar domaren ett frågekort med en lucka. Alla andra lägger det svarskort från handen som passar bäst, eller sämst. Domaren väljer sin favorit utan att veta vem som spelade vad.',
      'Det är en förfestlek som kommer igång direkt och som blir roligare ju bättre ni känner varandra. Alla kort är skrivna på svenska, med allt från kräftskivor till lappar i tvättstugan. Har du inget bra kort kan du skriva ett eget på det blanka kortet, en gång per match.',
    ],
    steps: [
      'En av er skapar en lobby och delar koden på fyra bokstäver. Ni behöver vara minst tre.',
      'Alla går med från sin egen mobil eller dator och får sju svarskort på handen.',
      'Domaren visar ett frågekort med en lucka. Alla andra lägger det kort som passar bäst.',
      'Domaren läser upp svaren och väljer sin favorit. Den som spelade kortet får en poäng.',
      'Domaren byts varje runda. Flest poäng efter sista rundan vinner.',
    ],
    time: '10–20 minuter',
    faq: commonFaq('Kortkaos', 3),
  },
  {
    slug: 'imposterjakten',
    gameId: 'imposterjakten',
    title: 'Imposterjakten: imposter-spel online på svenska | Kompisduellen',
    description:
      'Alla utom en har samma hemliga ord. Ge ett ord var, diskutera och rösta ut impostern. Ett gratis imposter-spel online på svenska för 3–10 spelare.',
    heading: 'Imposterjakten: imposter-spelet på svenska',
    intro: [
      'Alla får samma hemliga ord, utom en. Impostern vet inte ordet och måste smälta in. Ni ger ett ord var som hör ihop med det hemliga ordet, och sedan gäller det att lista ut vem som bluffar.',
      'Det är ett imposter-spel online på svenska med över hundra ord, från Bokhylla och Systembolaget till Zlatan. Säg för lite och du blir misstänkt. Säg för mycket och impostern listar ut ordet. Alla spelar på sin egen mobil, så det funkar lika bra i soffan på förfesten som på Discord.',
    ],
    steps: [
      'En av er skapar en lobby och delar koden på fyra bokstäver. Ni behöver vara minst tre.',
      'Alla går med från sin egen mobil eller dator och läser sitt kort i hemlighet. En av er är impostern.',
      'Ge varsin ledtråd med ett ord. Kör tre varv. Skriv i spelet eller säg ledtrådarna högt.',
      'Efter andra varvet kan vem som helst trycka på en spelare och anklaga den. Då röstar de andra ja eller nej direkt.',
      'Annars diskuterar ni efter tredje varvet vem som bluffar och röstar. Omröstningen är hemlig och alla har en röst.',
      'Fångar ni impostern får ni poäng, och impostern kan ta en poäng genom att gissa ordet. Kommer impostern undan får den poäng. Värden väljer 1, 2 eller 3 omgångar, och flest poäng efter sista omgången vinner.',
    ],
    time: '5–15 minuter',
    image: { path: '/og/imposterjakten.png', alt: 'Imposterjakten: en rad figurer där en röd figur med glasögon står i spotlighten. Imposter-spel online på svenska för 3–10 spelare' },
    faq: [
      // Distansfrågan står med egna ord här, så den gemensamma hoppas över.
      ...commonFaq('Imposterjakten', 3).filter((item) => !item.question.includes('Discord')),
      {
        question: 'Kan man spela på distans eller på Discord?',
        answer:
          'Ja. Alla har sitt eget kort på sin egen skärm, så ni kan sitta i samma soffa eller prata i Discord, Teams eller ett videosamtal. Dela koden i chatten, så är ni igång.',
      },
      {
        question: 'Hur många kan spela?',
        answer:
          'Ni behöver vara minst tre, och spelet fungerar bäst för 3–10 spelare. Ju fler ni är, desto svårare blir det att hitta impostern.',
      },
      {
        question: 'Vad är ett imposter-spel?',
        answer:
          'Ett spel där en av er i hemlighet har en annan roll och försöker smälta in, medan resten försöker avslöja den. I Imposterjakten är impostern den enda som inte vet det hemliga ordet.',
      },
      {
        question: 'Vad händer om det blir lika röster?',
        answer:
          'Då diskuterar ni en gång till och röstar bara mellan dem som fick lika många röster. Blir det lika igen kommer impostern undan.',
      },
      {
        question: 'Kan impostern få hjälp?',
        answer:
          'Värden väljer svårighet. I Normal får impostern en vag ledtråd och i Svår ingenting. Värden kan också välja en kategori, som alla ser.',
      },
    ],
  },
]

export function findGamePage(slug: string | undefined): GamePageInfo | undefined {
  return GAME_PAGES.find((page) => page.slug === slug)
}

export function gamePageFor(gameId: string): GamePageInfo | undefined {
  return GAME_PAGES.find((page) => page.gameId === gameId)
}
