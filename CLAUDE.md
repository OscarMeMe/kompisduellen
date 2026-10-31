# Kompisduellen

Svensk sajt med roliga småspel och gissningslekar att köra med kompisar, på förfesten, i Discord eller var som helst. Man skapar en lobby, bjuder in vänner med en 4-bokstavskod och tävlar mot varandra.

## Regler

- All text i appen är på svenska. Sökvägar skrivs utan å/ä/ö (t.ex. `ga-med`).
- Byggs för datorn först, men ska fungera bra på mobil (responsiv design). Testa både bred och smal skärm, och håll knappar och tryckytor stora nog för fingrar.
- Nycklar ligger i `.env.local`, aldrig i koden. Nya miljövariabler läggs till i både `.env.example` och `src/vite-env.d.ts`.
- Små ändringar per commit, beskrivande commit-meddelanden på svenska.
- Jobba på en egen branch, aldrig direkt på main (undantag: första grundcommiten).
- Supabase: nya tabeller exponeras inte automatiskt och har RLS. Skapa alltid policies och grants när du skapar en tabell.
- Sajten har ingen inloggning och inga tabeller. Spelare är gäster som bara finns i webbläsaren (`player.ts`), och lobbyerna går via publika Realtime-kanaler (inställningen för publika kanaler i Supabase måste vara påslagen). Anonym inloggning och nya registreringar är avstängda i Supabase. Behövs inloggning eller tabeller senare: slå på det igen, och tänk på att anonyma gäster räknas som authenticated (använd is_anonymous i policies när något bara ska gälla riktiga konton).
- Använd shadcn/ui-komponenter och Tailwind-klasser, inte egen CSS.
- Kör `npm run build` innan du säger att något är klart.

## Texter och ton

- Använd aldrig tankstreck (– eller —) som paus i synliga texter. Skriv korta meningar på naturlig, vardaglig svenska.
- Bindestreck i ord (t.ex. "QR-kod") och intervall (t.ex. "1–12 spelare") är okej.

## Teknik

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`, ingen `tailwind.config`) och shadcn/ui (stil `radix-nova`, ikoner från `lucide-react`)
- React Router (paketet `react-router`, inte `react-router-dom`)
- Supabase (`src/lib/supabase.ts`) för databas, inloggning och realtid
- PWA via `vite-plugin-pwa` (manifestet ligger i `vite.config.ts`, ikonerna i `public/`: `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` och `icon-512-maskable.png`)
- Driftsätts på Vercel (`vercel.json` skickar alla sökvägar som inte är en fil till appskalet `app.html`)
- Förrendering i bygget (`vite-plugin-forrendera.ts`, se Synlighet i sökmotorer)

## Stil

- Varm, ljus och lekfull: varm sandfärgad bakgrund med prickmönster och krämvita kort som syns tydligt mot den (bländar inte under en lång kväll), korallröd huvudfärg (`primary`), pastellfärgade kort, mjuka skuggor och stora rundningar.
- Typsnitt: Syne för rubriker och knappar (`font-heading`, h1–h3 får det automatiskt), Plus Jakarta Sans för brödtext (`font-sans`). Båda via `@fontsource-variable`.
- Alla färger och skuggor ligger som variabler i `src/index.css`. Använd dem i stället för Tailwinds färdiga färger (som `violet-500`):
  - shadcn-färgerna: `primary`, `background`, `foreground`, `card`, `muted`, `accent`, `border` osv.
  - pasteller: `mint`, `sun`, `sky`, `lilac` och de ljusa `coral-soft`, `mint-soft`, `sun-soft`, `sky-soft`
  - `crown`: guld för kronan hos den som leder (`text-crown`)
  - `destructive`: rött, t.ex. tidsstapeln när tiden nästan är ute
  - `primary-button`: den mörkare korallen på korallknapparna (`Button`), så att den vita texten klarar WCAG AA. Loggan och övriga detaljer använder `primary`
  - skuggor: `shadow-soft` (kort), `shadow-soft-sm` (små ytor), `shadow-primary` (korallknappar, finns redan på `Button`). Hur mörka de mjuka skuggorna är styrs av `--shadow-strength`
- Rundning: knappar och fält `rounded-md` (1rem), kort `rounded-lg` (1.25rem), etiketter `rounded-full`.
- Kort: `rounded-lg border bg-card shadow-soft`. Vinnare markeras med `bg-mint-soft`, ledare i topplistan med `bg-sun-soft`.
- `Button` (`size="lg"` för stora knappar, 3.25rem hög) och `Input` har redan designens mått, så lägg inte till egna höjder eller rundningar på dem.
- `short:` gäller låga skärmar (högst 860 px, t.ex. en bärbar dator på 1366×768). Spelvyerna använder den för mindre bild, rubrik och mellanrum, så att svarsdelen (`AnswerDock`, fast i nederkant) och knappen Lås svaret alltid syns utan scrollning. Frågebildens storlek följer skärmhöjden, och bilden går att trycka på för att se den större.
- `animate-pop` för saker som dyker upp. Små lekfulla rörelser: `animate-wiggle` (vickar, skakar inte), `animate-slot` (rullar in som på en spelautomat), `animate-hop`, `animate-wave`, `animate-grow` (staplar som växer upp, med `origin-bottom`) och `animate-confetti` (`Konfetti`, med `delay` för att vänta). `animate-frame-pulse` är ramens puls när tiden nästan är ute (`TimeWarningFrame`). Fler korta rörelser:
  - `animate-flip`: ett kort vänds från baksidan (`FlipCard` i `components/kort/`, Kortkaos insända kort vänds upp ett i taget)
  - `animate-rise`: rundans poäng ("+85") flyger upp ovanför namnet i facit och tonas bort (`ResultRow`)
  - `animate-stamp`: en stämpel slås ned snett (`Stamp`, sparad till Bluffen). Det den träffar kan få `animate-stamp-shake`
  - `animate-burst`: stjärnor skjuts ut åt alla håll en gång (`Stjarnstank`, vid fullträff i Gissa priset tillsammans med `Konfetti`)
  - `animate-shake`: en kort skakning för fel (kodfältet när koden inte finns)
  - `animate-turn-pulse`: en ring pulserar en gång när det blir ens tur, och "Din tur!" poppar in (Kortkaos domarruta)
  - `animate-lock-snap`: låset stängs med ett knäpp när svaret låses
  - `animate-crown-drop`: kronan faller ned med en studs på den som tog ledningen i rundan (`newLeaderIds` i `roundStanding`)
  - Topplistan på slutskärmen börjar i ordningen före matchen och raderna glider till sina nya platser (`glideFrom` i `Leaderboard`, `leaderboardOrderBefore`)
  - `animate-fade`: en enkel toning i stället för en rörelse med "minska rörelse" (`motion-reduce:animate-fade`) Kastens rörelser (`animate-throw-smash`, `animate-splat-blob`, `animate-splash-drop`, `animate-drip`, `animate-slide-down`, `animate-crumb-fall`, `animate-paper-roll`, `animate-ribbon-draw`, `animate-splat-life` med flera) beskrivs i `src/index.css`. Kasten varar 2 s, så de är ett undantag från regeln om korta rörelser. Priser som räknas upp visas med `CountingPrice`. Kort som lyfter vid hover får `shadow-lift`. Alla animationer skrivs med `motion-safe:`, så att de stängs av med "minska rörelse". Håll dem korta (under 0,6 s) och låt inget pågå hela tiden. Nya keyframes läggs i `src/index.css`.
- Spelikoner och spelarfigurer visas med `<Emoji emoji="🧙" />` som Microsoft Fluent Emoji i 3D (MIT, licensen ligger i `public/emoji/LICENSE.txt`). Bilderna ligger i `public/emoji` och hämtas aldrig från en extern sida. Storleken följer textstorleken (t.ex. `className="text-2xl"`). Saknas en bild visas tecknet. Ny figur eller nytt spel: lägg PNG-filen i `public/emoji` och en rad i `src/lib/emoji.ts`. Emojierna i Gissa priset-frågorna är vanliga tecken.

## Kommandon

- `npm run dev`: startar dev-servern på http://localhost:5173
- `npm run build`: typkontroll, serverdelen till `dist-ssr/` (för förrenderingen) och produktionsbygget till `dist/`
- `npm run lint`: kör oxlint
- `npm test`: kör testerna (Vitest). Tester ligger bredvid koden, t.ex. `src/lib/match.test.ts`
- `npx shadcn@latest add <komponent>`: lägger till en shadcn-komponent i `src/components/ui/`

## Struktur

- `src/pages/`: en komponent per sida (routes finns i `src/App.tsx`). Startsidan och spelsidorna (`GameInfoPage`) laddas direkt, övriga sidor först när man går dit (`lazy`), så att startsidan laddar snabbt. Kodfältet hämtar `lobbykoll` (och Supabase) först när man trycker Gå med
- `src/components/`: delade komponenter (`Layout`, `PageHeader`, `PlayerSetup`, `Countdown`, `Podium`, `Leaderboard`, `Emoji`, `Konfetti`, `Stjarnstank`, `Stamp`, `GaMedKod`, `ExempelRunda` och `SpelKort` på startsidan)
  - `lobby/`: väntrum, prispall och delar som alla spel använder (`RoundTimer` med runda och tidsstapel, `TimeWarningFrame` med ramen runt spelvyn när tiden håller på att ta slut, `GuessStatusList` med statusraden "⏱ 12 s kvar · 3/4 har svarat", `RoundBadge`, `RevealFooter`, `ResultRow` med en spelares rad i facit (gissningen stort, hur långt ifrån, poäng och totalt), `RoundStanding` efter facit: ungefär var man ligger i ord ("Du flåsar ledaren i nacken"), aldrig exakt placering, plus "Du klättrar!" och matchledaren, aldrig efter sista rundan. "Nära ledaren" är högst en fjärdedel av en rundas poäng. `WaitingStanding` med ställningen i poäng medan man väntar på de andra efter att ha låst sitt svar, från `waitingStanding` i `match.ts`: "Du leder med 7 poäng. Håll ihop nu.", inför sista rundan med "Sista frågan." först, ingen rad i första rundan eller i en provomgång. Props-typerna för spelvyer)
  - `narmast/` och `gissa-priset/`: varje spels vy för att gissa och visa svaret. `LobbyPage` väljer vy via `GAME_VIEWS`
  - `kortkaos/`: Kortkaos vy för hela rundan (`KortkaosView` med ett steg per fil). Kortspel har en `Play`-vy i `GAME_VIEWS`
  - `kort/`: spelkort som fler kortspel kan använda (`PromptCard`, `AnswerCard`, `Sentence`, `Hand`, `FlipCard`)
- `src/hooks/useLobby.ts`: lobbyn och realtiden (Supabase Realtime: presence + broadcast, inga tabeller)
- `src/hooks/useMyGuess.ts`: min gissning i rundan (inlåst direkt när den skickas)
- `src/hooks/useReactions.ts`: context för reaktionerna och kasten på lobbysidan (`useReactions`, `useThrows`), med typerna `FloatingReaction` och `Throws`
- `src/hooks/useWakeLock.ts`: håller skärmen tänd (Screen Wake Lock), för värden under en match
- `src/hooks/useCountUp.ts`: räknar upp ett tal till sitt värde (rätt pris i exempelrundan)
- `src/hooks/useCountdown.ts`: sekunder och andel kvar till en deadline (används av `Countdown`, `RoundTimer` och statusraden)
- `src/hooks/useTimeWarning.ts`: tid kvar plus varningsnivån från `timeWarning`, för spelvyerna
- `src/hooks/usePageMeta.ts`: byter taggarna i `<head>` (titel, beskrivning, kanonisk adress, Open Graph, JSON-LD) när man byter sida. Anropas i `Layout`
- `src/hooks/useNoIndex.ts`: sätter `<meta name="robots" content="noindex">` medan sidan visas (lobbysidan) och tar bort den efteråt
- `src/hooks/useLayout.ts`: låter en sida säga till `Layout` att en match pågår (då döljs menyn)
- `src/components/ui/`: genererade shadcn-komponenter. Ändra dem bara om det behövs
- `src/lib/`: hjälpfunktioner och Supabase-klienten
  - `games.ts`: listan över spel på startsidan
  - `spelsidor.ts`: texterna på spelsidorna (`/spel/gissa-priset` …): titel, beskrivning, intro, Så spelar ni, tid och vanliga frågor
  - `sidinfo.ts`: taggarna i `<head>` per sida (`pageMeta`, `renderHeadTags`), vilka sidor som förrenderas (`PRERENDER_PATHS`) och vilka som bara får egna taggar (`HEAD_ONLY_PATHS`)
  - `player.ts`: gästspelare (namn + figur i localStorage, spelar-id i sessionStorage), lobbykoder, värdflagga (sessionStorage)
  - `match.ts`: matchflödet som är gemensamt för alla spel (rundor, gissningar, poäng, topplistan). Rena funktioner. Värdens funktioner (`hostStart`, `hostDeadline`, `hostMove` …) tar och ger `HostState`, alltså tillståndet plus kortspelens hemliga data
  - `kort.ts`: kortspel med domare (lek, händer, val, anonym visning, rundflödet och undantagen). Återanvändbart: ett nytt kortspel behöver bara egna `CardGameRules`
  - `spelregler.ts`: reglerna per spel (tider, giltiga gissningar, poäng). Kortspelens regler ligger i `CARD_RULES`. Nytt spel = nya regler här, vyer i `GAME_VIEWS` och en rad i `games.ts`
  - `narmast.ts` och `gissa-priset.ts`: reglerna för respektive spel (`pricePoints` ligger i `gissa-priset.ts`). I Gissa priset kommer lobbyn ihåg vilka frågor som visats (`usedItemIds` i tillståndet, även genom revansch, byt spel, avbruten match, värdbyte och när värden laddar om sidan), så ingen fråga kommer tillbaka förrän alla andra visats. När listan börjar om är de senaste 20 fortfarande spärrade (`RECENT_AFTER_RESET`)
  - `kortkaos.ts`: reglerna för Kortkaos (tider, handens storlek, blanka kortet, Matchens bästa kort). Korten ligger i `kortkaos.json` (`fragor` med luckan `___` och `svar`, skrivna med liten bokstav så att de passar mitt i en mening). Allt innehåll är eget, inget från andra spel. Namnet "Kortkaos" är ett arbetsnamn och står bara i `games.ts`
  - `prisdata.ts`: typen `PriceItem` och `findPriceItem`. Själva sakerna i Gissa priset (pris, fakta, källa och ibland en bild) ligger i `prisdata.json`. Startsidans exempelrunda visar de tre frågorna med `exempel: 1`, `2` och `3` i den ordningen (`EXAMPLE_ITEMS`), med totalen i en resultatruta efter den sista, och de frågorna slumpas aldrig fram i spelet (`GAME_ITEMS`). Bilderna ligger som webp (max 800 px bred) i `public/prisbilder` och kommer bara från Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA), Unsplash eller Pexels. Fotograf och licens står i `imageCredit` när licensen kräver det
  - `belopp.ts`: belopp i Gissa priset: tolkning av det man skriver (kronor, komma eller punkt för ören), min/max och visning i kronor
  - `emoji.ts`: vilka emoji som visas som Fluent-bilder (bildfil och svensk alt-text per tecken)
  - `hojdpunkter.ts`: utmärkelserna efter en match (t.ex. Pris-oraklet, Snåljåpen, Moralisk segrare) med två eller tre texter var som slumpas med matchens frö, och `winnerSummary` med texten under prispallen. Alla kräver minst två spelare utom fullträffen, och lika resultat ger ingen eller en delad utmärkelse. Korten visas med `AwardCard`
  - `inbjudan.ts`: inbjudningslänken och vad Dela och Kopiera gör i alla utfall
  - `statistik.ts`: PostHog-statistik (`track`). Utan `VITE_POSTHOG_KEY` skickas inget. Bara spel och antal, aldrig namn eller figurer. Matchhändelserna skickas av värden i `useLobby`
  - `anslutning.ts`: anslutningen till en lobby. Lobbysidans status (`lobbyStatus`, med `stuck` när en gäst inte kommit in efter 12 sekunder), när gästen skickar `hello` igen eller ansluter på nytt (`helloRetryAction`) och vad som händer när fliken syns igen eller nätet kommer tillbaka (`wakeAction`). Rena funktioner
  - `meddelanden.ts`: kontroll av allt som kommer in i lobbyns kanal (läget, gissningar, kortdrag, händer, värdbyten). Trasiga meddelanden slängs. Gästerna tar bara emot läget, händer och värdbyten från den som är värd enligt närvarolistan (`from`, och `sendsFrom` i närvaron). Det stoppar trasiga meddelanden och enkla fuskförsök, men utan inloggning går det inte att bevisa vem som skickat något
  - `kanaler.ts`: öppna och stäng Realtime-kanaler (`waitForChannel`, `closeChannel`). `supabase.channel()` ger tillbaka en befintlig kanal med samma namn, även en som håller på att stängas, så en ny kanal väntar tills den gamla är helt stängd. Används av `useLobby` och `lobbykoll`
  - `lobbykoll.ts`: kollar om en kod leder till en lobby som lever (lyssnar på närvaron i kanalen `lobby:KOD` utan att synas där). Används av kodfältet på startsidan. Utan värd inom 1,5 sekunder är lobbyn avslutad
  - `tidvarning.ts`: `timeWarning`, hur tydligt det varnar när tiden håller på att ta slut: `normal`, `varning` (10 s kvar) eller `kritisk` (5 s kvar). Alltid `normal` när svaret är låst
  - `kast.ts`: att kasta något på en annan spelare (tomat, paj, ägg, toapapper och gurka i `THROW_ITEMS`), spärren på 10 sekunder (`canThrow` hos avsändaren, `acceptThrow` hos mottagarna), vilka som går att kasta på (`throwTargets`), en splatt åt gången (`nextSplat`) och valet att ta emot kast (`kd-kast` i localStorage)
  - `splatt.ts`: var splatten får synas (`placeSplat`, `measureSplatPlace`). `SPLAT_SHIELD` markerar det som aldrig får täckas och `SPLAT_CEILING` tidsstapeln
  - `skillnad.ts`: hur långt ifrån rätt pris en gissning var, i ord (`differenceText`). Används i facit och i startsidans exempelrunda
  - `vardbyte.ts`: vem som tar över som värd, vem som viker sig vid två värdar och tillståndet vid övertagande. Rena funktioner
  - `granskning.ts`: reglerna för granskningssidan (omdömen, flytt från inkorgen, export). Rena funktioner
  - `device.ts`: `hasFinePointer()` (mus eller styrplatta). Används för att inte öppna mobilens tangentbord av sig självt
- Importera med aliaset `@/` (pekar på `src/`)

## Så fungerar lobbyn

- Alla i en lobby ansluter till Realtime-kanalen `lobby:KOD`.
- Den som skapade lobbyn är värd och äger spelets tillstånd. Värden skickar ut hela tillståndet (`state`) till alla.
- Övriga skickar bara sina gissningar (`guess`), kortdrag (`move`) eller önskemål om revansch (`wish`) till värden. Nya spelare skickar `hello` (med sitt id) för att få aktuellt läge, och skickar det igen var tredje sekund tills läget kommer. När fliken syns igen eller nätet kommer tillbaka ansluter gästen på nytt om kanalen stängts, annars skickas ett nytt `hello`. Kommer gästen inte in visas "Det tar lite längre tid än vanligt" med Försök igen.
- Värden i bakgrunden: anslutningens hjärtslag går i en egen tråd (`realtime: { worker: true }` i `supabase.ts`), så att webbläsaren inte stänger anslutningen när fliken ligger i bakgrunden. När värdens flik syns igen körs rundor och nedräkningar som borde ha slutat direkt (`wakeTick` i `useLobby`). Under en match hålls värdens skärm tänd (`useWakeLock`). Telefoner som inte klarar det får tipset "Håll skärmen tänd under matchen" i väntrummet (`canKeepScreenOn` i `device.ts`).
- Allt som kommer in i kanalen kontrolleras i `meddelanden.ts` innan det används. Värden skickar med sitt id (`from`) i läget, händerna och värdbytet.
- Gäster som fastnar: får två `hello` inget svar ansluter gästen på nytt av sig själv, en gång (`helloRetryAction`), eftersom en kanal kan se öppen ut men vara död. En gäst som inte kommit in än ansluter också på nytt när fliken syns igen eller nätet kommer tillbaka, även om kanalen ser öppen ut (`wakeAction`). Tiden till "Försök igen" räknas från första försöket.
- Kortspelen har hemlig data (leken, allas händer, vem som spelade vad) som bara värden har och som aldrig skickas med `state`. Varje spelare får sin hand i ett eget meddelande (`hand`) som andra flikar slänger. Vem som spelade vilket kort syns först när rundan avslöjas. Den som läser nätverkstrafiken kan se andras händer, och det räcker för ett kompisspel.
- I kortspelen räknas en spelare som tappat nätet som kvar i 10 sekunder, så att domaren inte byts och matchen inte slutar i onödan.
- Spelar-id och värdflaggan sparas per flik (sessionStorage), så varje flik är en egen spelare. Det går att testa med flera spelare i flera flikar.
- Identitet per lobby: spelar-id:t ligger bara i fliken, så `player.ts` sparar också vem man var i varje lobby i localStorage (`kd-lobby-id:KOD`, glöms efter 12 timmar). Öppnar man lobbyn i en ny flik får man välja "Fortsätt som [namn]" (samma id, poängen följer med) eller "Gå med som en annan spelare". Namnet är aldrig identiteten, så två personer får heta samma sak.
- En identitet i en flik åt gången (`useOneTab`, BroadcastChannel): den äldsta fliken vinner, och en ny flik med samma spelare visar ett besked med "Försök igen" eller "Gå med som en annan spelare". Det hindrar bland annat att en kopierad värdflik blir en andra värd.
- Värden väljer spel i väntrummet (fältet `game` i tillståndet). Spelet från startsidan är bara förvalt.
- Efter en match väljer värden: **Revansch** (samma spel och inställningar efter en gemensam nedräkning på 3 sekunder som alla ser, `hostRematch` och `hostRematchStart` i `match.ts`, fältet `rematchAt` i tillståndet) eller **Byt spel** (`changeGame`: till väntrummet i samma lobby med spelvalet i bild, med grupp, kod och ställning kvar. Fältet `choosingGame` gör att de andra ser "[värden] väljer nästa spel…" tills värden väljer eller startar. Spelval de första 0,7 sekunderna ignoreras, så att ett dubbeltryck inte också väljer ett spel. Spelvalet visar tydligt om för få är med, t.ex. Kortkaos med två). Efter ett solotest heter valen **Bjud in kompisar** och **Testa igen**. Dubbelklick startar inte två matcher, eftersom revansch bara går från slutad match och en gammal nedräkning inte startar något. Revansch avaktiveras om för få spelare är kvar. Gästerna kan trycka **Jag vill ha revansch** på slutskärmen (går att ångra). Det startar inget: gästen skickar `wish`, värden lägger id:t i `rematchWishes` (`setRematchWish` i `match.ts`), alla ser "3 av 5 vill ha revansch" och värden ser "3 vill försöka igen. Kör vi?" vid Revansch (`rematchWishCount`, räknar spelarna i matchen som är online, utom värden). Önskemålen nollställs när värden går till väntrummet (Revansch, Byt spel) och när en match startar. Kvällens ställning räknar matcher från alla spel i lobbyn ("Gissa priset 2 · Närmast vinner 1"). "Tillbaka till alla spel", loggan och profilen frågar "Vill du lämna lobbyn?" så fort andra är med (`LeaveLobbyDialog`, vakten går via `setLeaveGuard` i `Layout`). Värden får veta vem som tar över, en deltagare att den kan komma tillbaka med koden. Deltagare lämnar bara sig själva. Under en match går loggan inte att klicka på, utom i en provomgång (Testa själv), där den frågar "Vill du avsluta provrundan?" (`setLeaveInMatch` i `Layout`).
- Under en match har värden knappen **Tillbaka till väntrummet** under spelytan. Efter frågan "Avbryta matchen?" (`AbortMatchDialog`) går alla tillbaka till väntrummet (`abortMatch` i `match.ts`) med meddelandet att matchen inte räknas. Topplistan, antalet matcher och kvällens ställning är som före matchen. Deltagarna har ingen sådan knapp.
- Topplistan gäller hela lobbyn oavsett spel och räknar vunna matcher. Delad seger ger alla på förstaplatsen en vinst.
- När tiden håller på att ta slut (`timeWarning`, `useTimeWarning`): vid 10 sekunder kvar blir tidsstapeln solgul (`sun`) och en tunn korallröd ram (`TimeWarningFrame`) tonas in runt spelvyn. Vid 5 sekunder blir stapeln röd (`destructive`), ramen pulserar en gång per sekund, sekundsiffran hoppar vid varje tick och Lås svaret vickar en gång. Bara medan man gissar och inte har låst. I Kortkaos varnar det när man ska lägga sitt kort eller välja som domare. Ramen går inte att klicka på och flyttar inget. Med "minska rörelse" står den still.
- Kasta (`kast.ts`, `Kast.tsx`, `useLobby`): kastraden (`ThrowBar`) ligger i väntrummet, under spelarchipsen medan man gissar (`GuessStatusList`, Kortkaos `PlayerStatus`) och efter facit (`RevealFooter`). Tryck på tomat, paj, ägg, toapapper eller gurka och välj vem (shadcn `Popover`). Är det bara en annan i lobbyn går kastet direkt. Den som kastade ser "Du kastade en tomat på Lisa!" (`ThrownConfirm`). Meddelandet `throw` (`{ id, to, item }`) kontrolleras med `parseThrow` i `meddelanden.ts`. Den som träffas ser saken flyga in i en båge och träffa på sitt eget sätt, med en kort stöt och "Oscar kastade en tomat på dig!" ovanför (`SplatOverlay`, borta efter 2 s, `pointer-events-none`): tomaten sprutar ut, pajen trycks platt och skalet faller medan fyllningen glider neråt, ägget knäcks och rinner, toapappret rullas ut och gurkan delar sig i skivor som flyger. Alla andra ser "Oscar 🍅 → Lisa" i reaktionsflödet. I lobbyn (väntrummet, facit, slutskärmen) blir splatten stor och får täcka det som är där. I spelet (medan man gissar och i kortspelen) täcker den aldrig svarsdelen, Lås svaret eller kort man ska välja (`SPLAT_SHIELD`), och får den inte plats blir det en rad även för den som träffas. En gång per 10 sekunder, och en splatt åt gången. Värden kan stänga av kast i väntrummet (`throwsAllowed` i tillståndet). Var och en kan välja att inte ta emot kast i väntrummet eller på profilsidan (`noThrows` i närvaron), och syns då inte som mål. Ljudet (`playThrow`) är ett svisch medan saken flyger och en egen träff för varje sak, och följer ljudknappen.
- Gissa priset har tempo i lobbyn: svarstid (30, 45 eller 60 s) och om facit går vidare automatiskt eller när värden klickar. Värdens timer gäller bara sin egen deadline (`handleDeadline`), och "nästa runda" tar med sig rundan som visades (`advanceFromReveal`), så inget hoppas över.
- En match med en spelare är en provomgång (`practice`) och räknas inte i topplistan. "Testa själv" (`/skapa?spel=gissa-priset&testa=1`) startar en direkt. Närmast vinner kräver två spelare och Kortkaos tre.
- Värdbyte (`vardbyte.ts`, `useLobby`): lämnar värden tar en annan spelare över, så att lobbyn finns kvar. Alla har redan det senaste tillståndet (värden skickar ut hela tillståndet vid varje ändring). Den som varit med längst av de kvarvarande (`pickSuccessor`) tar över. Väljer värden Lämna skickas `handover` till den spelaren och bytet sker direkt. Försvinner värden hastigt (stängd flik, tappat nät) tar efterträdaren över efter 4 sekunder (`TAKEOVER_MS`), så att en omladdning hinner komma tillbaka. Den nya värden ansluter till kanalen som värd, sparar rollen i fliken (`markAsHost`) och skickar ut tillståndet med klockorna omräknade till sin egen klocka (`takeOverState`). Spelvyn ligger kvar under bytet (en gissning som skickades medan ingen var värd skickas om till den nya värden, `useMyGuess`). Kortspelens hemliga data (leken och händerna) fanns bara hos förra värden, så en pågående kortmatch avbryts och gruppen kommer tillbaka till väntrummet med ett meddelande (`notice`). Kommer den gamla värden tillbaka medan en annan är värd viker den som anslöt senast sig (`shouldYieldHost`, med 6 sekunders betänketid för en ny värd). Är ingen kvar försvinner lobbyn. Värden sparar tillståndet och kortspelens hemliga data i fliken (sessionStorage, `saveHostLobby`), så laddar värden om sidan fortsätter matchen med topplista och inställningar, och gästerna återansluter. Inget sparas i databasen ännu.

## Synlighet i sökmotorer

- Förrendering: `npm run build` bygger först serverdelen (`src/entry-server.ts` till `dist-ssr/`), sedan sajten. `vite-plugin-forrendera.ts` renderar startsidan och spelsidorna (`PRERENDER_PATHS`) till färdig HTML (`dist/index.html`, `dist/spel/x/index.html`) som en förstagångsbesökare ser dem. `/skapa` och `/ga-med` (`HEAD_ONLY_PATHS`) får appskalet med egna taggar. Allt annat får `dist/app.html`, det tomma appskalet, som Vercel och service workern (`navigateFallback`) pekar på.
- Appen startar alltid med `createRoot` och ritar om sidan, även när den är förrenderad. Därför behöver sidorna inte se exakt likadana ut i bygget och i webbläsaren (sparat namn och figur), och lobbyn fungerar som förut. Sidor som förrenderas får inte vara `lazy`, annars syns en snurra när appen tar över.
- Taggarna i `<head>` ligger mellan `<!-- sidinfo -->` och `<!-- /sidinfo -->` i `index.html` och kommer från `sidinfo.ts`, både i bygget och i appen (`usePageMeta`). Startsidan och spelsidorna har kanonisk adress, Open Graph och JSON-LD (startsidan `WebSite` och `WebApplication`, spelsidorna `VideoGame` och `FAQPage`). Lobbyn och andra sidor har ingen kanonisk adress. Ändras startsidans beskrivning: uppdatera även manifestet i `vite.config.ts`.
- Spelsidorna (`/spel/gissa-priset`, `/spel/narmast-vinner`, `/spel/kortkaos`) har texterna i `spelsidor.ts`. De fasta sökvägarna går före `/spel/:code` i React Router, och lobbykoder har bara fyra bokstäver. Spelets namn på startsidans kort leder dit. Nytt spel med egen sida: en rad i `GAME_PAGES`, och sökvägen i `public/sitemap.xml` och som `Allow:` i `public/robots.txt` (testerna i `sidinfo.test.ts` kollar det).
- `public/robots.txt` stänger ute `/lobby/`, `/spel/` (utom spelsidorna), `/resultat/` och `/granska`. `public/sitemap.xml` listar startsidan, spelsidorna, `/skapa` och `/ga-med`.
- Service workern släpper igenom `robots.txt` och `sitemap.xml` (`navigateFallbackDenylist` i `vite.config.ts`).

## Routes

| Sökväg | Sida |
| --- | --- |
| `/` | Startsida |
| `/skapa` | Skapa lobby |
| `/ga-med` | Gå med (skriv in kod, kontrolleras mot lobbyn) |
| `/skapa?spel=narmast` | Skapa lobby för ett visst spel (`narmast`, `gissa-priset`, `kortkaos`) |
| `/lobby/:code` | Väntrum, spel och prispall (allt i samma sida) |
| `/spel/gissa-priset`, `/spel/narmast-vinner`, `/spel/kortkaos` | Spelsidor (vad spelet är, så spelar ni, vanliga frågor) |
| `/spel/:code` | Skickar vidare till `/lobby/:code` |
| `/resultat/:code` | Skickar vidare till `/lobby/:code` |
| `/profil` | Profil (ändra namn och figur, sparas i webbläsaren) |
| `/granska` | Granskning av frågorna i Gissa priset. Bara i utvecklingsläge (`npm run dev`), byggs aldrig in i sajten |

## Granskning av Gissa priset

- `/granska` finns bara med `npm run dev`. Den visar frågorna med spelets egna kort (`PriceQuestionCard`, `PriceAnswerCard`) och sparar omdömen via `vite-plugin-granska.ts`, som bara körs av dev-servern.
- Nya frågor läggs i `inkorg.json` i projektroten (en lista med samma fält som `PriceItem`). "Godkänd" flyttar en inkorgsfråga till slutet av `src/lib/prisdata.json`, och "Ta bort" tar bort frågan ur filen där den ligger.
- Bilder till inkorgsfrågor ligger i `public/prisbilder-inkorg/` (sökvägen `/prisbilder-inkorg/x.webp`). Vid "Godkänd" flyttas bilden till `public/prisbilder/` och sökvägen skrivs om, och "Ta bort" tar bort bilden.
- Omdömen och kommentarer sparas i `granskning.json`. `inkorg.json`, `granskning.json` och `public/prisbilder-inkorg/` står i `.gitignore` och får aldrig committas.
