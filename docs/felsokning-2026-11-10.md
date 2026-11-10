# Felsökning 2026-11-10

Branch: `felsokning-2026-11-10` (från main). Inget mergas till main.

Varje fynd har: allvar (hög, medel, låg), var i koden, vad som händer, hur det uppstår, och om det rättades (med commit) eller bara antecknades.

## 1. Lobbyn och realtiden

Genomgånget: `useLobby.ts` (hela), `meddelanden.ts`, `vardbyte.ts`, `leverans.ts`, `anslutning.ts`, `kanaler.ts`, `lobbykoll.ts`, `useMyGuess.ts`, `player.ts` och värdens funktioner i `match.ts`.

### Rättat

**1. Närvaron kontrollerades inte (medel, säkerhet och krasch).** `src/hooks/useLobby.ts` (presence sync) och `src/lib/meddelanden.ts`.
- Vad som händer: allt annat i kanalen kontrolleras i `meddelanden.ts`, men närvaron (id, namn, figur, värdflagga) användes som den kom. Ett namn som inte är en text gav ett fel hos värden i `addPlayers` (`wanted.trim` finns inte) varje gång närvaron ändrades, så att inga nya spelare kunde läggas till. Hos gästerna kunde ett objekt som namn krascha skärmen (React kan inte rita ett objekt), och ett namn på tusentals tecken togs emot.
- Hur det uppstår: någon som kan lobbykoden skickar en egen närvaro, eller en trasig klient.
- Rättat: `parsePresence` kontrollerar typerna, slänger trasiga poster och kortar namnet till 20 tecken (samma gräns som i `PlayerSetup`). Fem tester i `meddelanden.test.ts`. Commit `586afce`.

**2. Värdbyte mitt i Imposterjakten gav fel antal omgångar (medel).** `src/lib/vardbyte.ts` (`takeOverState`).
- Vad som händer: när värden tryckt "Avsluta efter den här omgången" sparas det valda antalet i `savedRounds` och `rounds` blir den pågående omgången. Lämnar värden då avbryts matchen, men `takeOverState` lämnade kvar det avkortade antalet. Väntrummet visade t.ex. 2 omgångar i stället för 5, och om den nya värden valde ett nytt antal användes ändå det gamla sparade värdet i nästa match (`matchPlayers` läser `savedRounds` först).
- Rättat: `takeOverState` återställer `rounds` och nollar `savedRounds` och revanschönskemålen, som `resetMatch` gör. Test i `vardbyte.test.ts`. Commit `1b85995`.

### Antecknat (inte rättat)

- **Låg. Värdens lista över redan räknade drag finns bara i minnet** (`seenMovesRef` i `useLobby`). Laddar värden om sidan mitt i Imposterjakten eller Kortkaos och en spelare skickar samma drag igen, känns det inte igen som en dubblett. I praktiken stoppas det av spelreglerna (fel tur, redan röstat), och Exploderande Tanter sparar sina hanterade drag i den hemliga datan som följer med omladdningen. Inte rättat: ingen känd väg till fel resultat.
- **Låg. Risk för två värdar en kort stund om närvarolistan är ofullständig.** `watchHost` tar över efter 4 s utan värd i närvaron. Skulle en gästs närvarolista sakna värden i mer än 4 s fast värden är kvar (t.ex. efter en lång stund i bakgrunden), tar gästen över, skickar ut ett avbrutet läge i ett kortspel och viker sig först efter 6 s. Jag kunde inte framkalla det (Supabase skickar hela närvaron vid anslutning), så det är bara antecknat. En tänkbar åtgärd är att kräva att gästen fått ett läge från värden efter den senaste anslutningen innan den får ta över.
- **Låg. Värdens sparade lobby kan misslyckas tyst** (`saveHostLobby`, sessionStorage). Blir lagringen full eller blockerad sparas inget, och då är matchen borta om värden laddar om. Ingen åtgärd.
- **Känd begränsning (står i CLAUDE.md):** vem som helst i närvaron kan säga sig vara värd, och gissningar och drag kan skickas i en annans namn. Det går inte att lösa utan inloggning.

### Kontrollerat utan fynd

- Tappade meddelanden: läget skickas igen (`shouldResendState`), drag och gissningar skickas igen med eget nummer, och den som saknar sin hand ber om den (`handIsMissing`). Inget fel hittat.
- Omladdning hos värden: tillståndet och den hemliga datan sparas och återställs (`restoreHostState`), och alla räknas som nyss sedda så att de hinner tillbaka.
- Gäster som fastnar: `hello` igen var tredje sekund, en egen omanslutning efter två försök och Försök igen efter 12 s. Inget fel hittat.
- Kanaler som håller på att stängas (`ClosingChannels`): en ny kanal väntar på den gamla. Inget fel hittat.
- Kodkontrollen (`lobbykoll.ts`): stängs via samma kö, och ger "fel" efter 4 s utan svar.

## 2. Exploderande Tanter

Genomgånget hittills: `tantpanik.ts` (hela spelmotorn: utdelning, drag, Nope!-kedjan, par, tretal, Tantsnaran, Tjänst, attacker, Göm tanten, slutet) och värdens steg i `match.ts`.

### Rättat

**3. Bordet kunde falla ihop i äldre Safari (medel, mobil).** `src/components/tantpanik/TantpanikView.tsx`.
- Vad som händer: mobilrättningen i går satte bordets höjd med bara `h-dvh` (`top-0` utan `bottom`). En webbläsare som inte förstår `dvh` (iPhone före iOS 15.4) struntar i höjden, och då blir bordet bara så högt som innehållet och högarna trycks ihop.
- Rättat: `inset-0` tillsammans med `h-dvh`. Förstår webbläsaren `dvh` gäller höjden, annars fyller `top` och `bottom` skärmen. Inget test (ren CSS). Commit `cf0ee0c`.

### Kontrollerat utan fynd

- Tantsnaran vid par och vid tretal (även när man ber om just Tantsnaran): fällan slår igen, motstölden utlöser ingen ny fälla, och turen går tillbaka till rätt spelare.
- Nope!: kedjans längd (`level`) och numret på det spelade kortet (`play`) gör att ett drag som skickas igen aldrig träffar fel kort.
- Attack på en attackerad spelare, Hoppa över och Desarmera räknar turerna rätt, och den som åker ut lämnar över en vanlig tur.
- Antalet kort stämmer i alla grenar jag läste (`countAllCards`), och testerna spelar hela matcher med slumpade drag.

### Antecknat (inte rättat)

- **Låg. Ett ogiltigt drag ger ett nytt läge till alla.** `tantMove` sparar numret och beskedet "Det gick inte just nu." i den hemliga datan, och `finish` ger då ett nytt bordsobjekt med samma innehåll, som skickas ut. Gästerna gör inget med det (`isSameContent`), men botarna tänker om. Ingen synlig effekt.
- **Låg. Loggen säger "tog ett kort" även när kortet var en Tantsnara.** `tPick` loggar före flytten. Raden efter säger "Tantsnara! … gick i fällan", så det går att förstå. Text, inte rättat.

- **Inte läst på djupet: `tantbot.ts`.** Jag läste minnet (`observe`, `remember`) och hur värden kör botarna i `useLobby`, men inte hela strategin. Ett fel där ger sämre botar, inte en krasch, och skyddet `botFallbackMove` plus testet "botarna fastnar aldrig" täcker det värsta.

(Pausad 00:20–00:42 enligt önskemål.)

## 3. Imposterjakten

Genomgånget: `imposterjakten.ts` från utdelningen till facit (ord och imposter, ledtrådar, Anklaga!, redo och nedräkning, omröstning, lika röster, sista gissningen, poäng, spelare som lämnar, Nytt ord, Avsluta tidigare).

### Kontrollerat utan fynd

- Anklagelse under en pågående nedräkning: tiden som var kvar sparas (`resumeMs`) och fortsätter efteråt. Lämnar den anklagade faller anklagelsen utan att den som anklagade förlorar sin chans.
- Lika röster: bara de lika placerade går att välja, och lämnar en av dem blir det en vanlig omröstning igen (`keepTied`).
- Spelare som lämnar: turen hoppas över, rösten stryks, den som röstat på spelaren får rösta om, och lämnar impostern avbryts omgången utan poäng.
- Poängen går bara till dem som är kvar i omgången (`scorers`), och en avbruten omgång räknas inte i imposterns antal.
- Det hemliga ordet syns aldrig i läget före facit (`usedWordIds` fylls först i `finishRound`).
- Enda felet jag hittade som rör Imposterjakten är nummer 2 ovan (värdbytet), som är rättat.

## Till Kortkaos

Läst: `kort.ts` och `kortkaos.ts`. Inget är ändrat, bara antecknat.

- **Låg (säkerhet). Domarens val slås upp utan kontroll av nyckeln.** `cardMove` i `src/lib/kort.ts`: `secrets.submitted[move.key]` är sant även för nycklar som `constructor` och `__proto__`, eftersom de finns på alla objekt. En domare som skickar ett eget meddelande med en sådan nyckel kommer igenom till `reveal`, där vinnaren blir `undefined`. Det ger en poäng till spelaren "undefined" och en rad i `wins` utan spelare. Gästernas kontroll av läget (`isCardTable` kräver en text i `wins[].player`) underkänner sedan varje nytt läge resten av matchen, så gästerna fastnar. Förslag: `Object.hasOwn(secrets.submitted, move.key)` i stället för `!secrets.submitted[move.key]`. Kräver att någon medvetet fuskar, därför låg.
- **Låg. En match som tar slut för att för få är kvar räknas i kvällens ställning.** `cardPresence` anropar `finish` när färre än tre är kvar, och `withCards` lägger då matchen i topplistan som en vanlig match. I Imposterjakten räknas en sådan match inte. Kan vara avsiktligt, men värt att bestämma.
- **Låg. Fler än nio spelare kan komma in under en match.** `tooManyPlayers` stoppar starten, men `dealNewcomers` delar ut händer till alla som går med senare. Tar svarshögen slut får de färre kort (`draw` klarar det), så inget kraschar, men gränsen på nio gäller bara vid start.
- **Förslag, inte fel:** ett kort som valts men inte bekräftats med Spela kortet räknas ändå när tiden går ut (`toJudging` läser alla `picks`). Det verkar avsiktligt.

## 4. Gissa priset och Närmast vinner

Genomgånget: `gissa-priset.ts`, `narmast.ts`, `belopp.ts`, `botgissning.ts`, `spelregler.ts` och rundflödet i `match.ts` (start, gissning, facit, paus, nästa runda, slut).

### Kontrollerat utan fynd

- Poängkurvan i Gissa priset: går aldrig utanför 0–100, och en gissning på 0 eller ett pris på 0 ger 0 poäng.
- Belopp med ören: jag provade fyra miljoner slumpade belopp upp till 100 miljoner kronor mot `isValidPrice`, och inget giltigt belopp underkändes av avrundningsfel.
- Frågor som inte upprepas (`pickItem`): listan börjar om först när alla visats, med de senaste 20 spärrade.
- Dubbelklick och gamla timers: `handleDeadline` och `advanceFromReveal` gör bara något för rätt klocka och rätt runda.
- Botarna gissar genom samma kontroll som spelarna, och rundan slutar inte innan de har gissat.
- Närmast vinner utan gissningar: inga poäng och inget fel.

## 5. Startsidan, förrenderingen, taggarna i head och sajtkartan

Genomgånget: `sidinfo.ts`, `vite-plugin-forrendera.ts`, `usePageMeta.ts`, `public/robots.txt`, `public/sitemap.xml`, `vercel.json` och de byggda sidorna i `dist/` (titel, beskrivning, kanonisk adress, robots och JSON-LD för alla elva sidor).

### Rättat

**4. Adresser som /constructor kraschade sidan (medel, krasch).** `src/lib/sidinfo.ts` (`pageMeta`).
- Vad som händer: sidans taggar slogs upp med `PAGES[path]`. För en adress som `/constructor`, `/toString` eller `/hasOwnProperty` ger det en inbyggd funktion i stället för taggar, och `usePageMeta` kraschade när titeln skulle skrivas. Besökaren fick felrutan "Något gick fel" i stället för sidan som säger att adressen inte finns.
- Hur det uppstår: någon skriver eller länkar en sådan adress, eller en robot provar den.
- Rättat: bara listans egna nycklar räknas. Test i `sidinfo.test.ts`. Commit `dd9ec2b`.

**5. Ett figurvärde som "constructor" kraschade lobbyn (medel, säkerhet och krasch).** `src/lib/figurer.ts` (`upgradeAvatar`) och `src/lib/emoji.ts` (`findEmoji`).
- Vad som händer: samma sorts uppslag. `upgradeAvatar('constructor')` hittade en inbyggd funktion i listan över gamla figurer och kraschade på raden efter. Funktionen körs på varje närvaro och varje läge, hos alla i lobbyn, så en enda spelare med ett sådant figurvärde stoppade närvarolistan för alla.
- Hur det uppstår: någon skickar en egen närvaro med det värdet. Fynd 1 släpper igenom figuren som text, så det här behövdes också.
- Rättat: bara listornas egna nycklar räknas, i båda funktionerna. Test i `figurer.test.ts`. Commit `6a58f1d`.

### Kontrollerat utan fynd

- Alla åtta förrenderade sidor har titel, beskrivning, kanonisk adress och JSON-LD som går att tolka. `/skapa` och `/ga-med` har `noindex, follow` och ingen kanonisk adress, och appskalet har inga sidspecifika taggar.
- Sajtkartan och `robots.txt` stämmer med sidorna (testerna i `sidinfo.test.ts` kollar det också).
- Strecken i titlar och beskrivningar är bara intervall ("3–9 spelare"), inga tankstreck.

### Antecknat (inte rättat, förslag)

- **Text. Guiden säger fyra spel, men det finns fem.** `src/lib/guider.ts`: titeln "Förfestlekar på mobilen: 4 gratis spel" och "Här är fyra som är gratis". Exploderande Tanter är spelbart men nämns inte i guiderna. Texter ändrar jag inte.
- **Förslag. Exploderande Tanter har ingen egen spelsida** (`/spel/...`), och finns därför inte i sajtkartan. De andra fyra spelen har det.
- **Låg. Spelets id slås upp på samma sätt** (`RULES[game]` i `spelregler.ts`, `GAME_VIEWS[state.game]` i `LobbyPage.tsx`). Id:t kommer bara från värdens läge, och värden kan bara välja spel som finns (`findGame`), så det går bara att nå genom att låtsas vara värd. Inte rättat.

## 6. Nya versioner och PWA

Genomgånget: `pwa.ts`, `uppdatering.ts`, `useAppUpdate.ts`, `version.ts` och service workerns inställningar i `vite.config.ts`.

### Kontrollerat utan fynd

- Ingen omladdning i en lobby: en ny version ger bara raden om ny version där, och omladdningen sker när man lämnat.
- Ingen slinga: sidan laddas om högst en gång per version och flik (`shouldReloadFor`), och efter ett laddningsfel högst var tionde minut och aldrig i en lobby.
- Sidorna hämtas alltid från nätet (`NetworkOnly` med appskalet som reserv), så en gammal sparad sida kan inte fastna.
- Kollen efter ny version jämför huvudskriptet med det i `app.html`, och går det inte att avgöra händer inget.

### Antecknat (inte rättat)

- **Låg. En gäst kan påstå sig ha en nyare version.** Värden litar på versionsnumret i `hello` (`guestVersions` i `useLobby`). Skickar någon ett påhittat högt nummer får värden beskedet "Det finns en ny version av spelet" tills den spelaren lämnar. Ingen skada på matchen, bara ett falskt besked.
- **Låg. Fliken kan bli kvar på en äldre version.** Visar sajten fortfarande den gamla sidan efter omladdningen (en mellanlagring som inte hunnit med) laddas den inte om igen för samma version, med flit, för att undvika en slinga. Den fliken får då den nya versionen först vid nästa manuella omladdning eller nästa publicering.

## 7. Mobil och prestanda

Genomgånget: `LobbyPlayers.tsx`, `useGazeFollow.ts`, `Prickar.tsx`, `useKeyboardInset.ts`, `AnswerDock.tsx`, gissningsvyerna, `arbetstimer.ts`, `useCountdown.ts`, `useWakeLock.ts` och `useOneTab.ts`.

### Kontrollerat utan fynd

- Många figurer i väntrummet: figurbilderna är små (265 kB för alla tolv i båda storlekarna), rörelserna ligger på hela bilden med bara transform och opacity, och blicken räknas ut högst en gång per bildruta.
- Svarsdelen på mobil lyfts ovanför tangentbordet (`useKeyboardInset`) och lämnar lika mycket plats under, så att frågan går att skrolla fram.
- Värdens timers går i en egen tråd och faller tillbaka på vanliga timers om tråden inte går att skapa.

### Antecknat (inte rättat)

- **Låg (prestanda). Prickarna på startsidan ritas om varje bildruta så länge hero syns**, även de två sekunder av tio då inga ringar syns och muspekaren står still (`Prickar.tsx`, `moving` är alltid sant med `origin`). Det är cirka 500 prickar på en telefon, så det märks knappast, men canvasen kunde vila mellan ringarna. Inte rättat: liten vinst, och risk att ändra känslan.
- **Låg. Två skärmlås kan begäras samtidigt** (`useWakeLock`): den första begäran och en `visibilitychange` kan överlappa, och då tappas referensen till det ena låset tills fliken döljs. Ingen synlig effekt.
- **Låg. En fryst flik svarar inte på "är du redan med?"** (`useOneTab`, 400 ms). Har telefonen fryst den gamla fliken blir den nya fliken ägare, och när den gamla vaknar finns samma spelare i två flikar. Sällsynt, och värden räknar ändå varje drag en gång.

## Prov i webbläsaren (värd och gäst i två flikar)

Efter rättningen av närvaron (fynd 1) provspelade jag Gissa priset med två flikar mot den riktiga Realtime-kanalen, eftersom `useLobby` inte täcks av enhetstester.

- Gästen gick med ("Gå med som en annan spelare"), syntes hos båda, och matchen startade och gick igenom som vanligt.
- Värden lämnade (fliken gick till en annan sida): gästen tog över efter cirka 4 sekunder och rundan fortsatte.
- Den gamla värden kom tillbaka: den vek sig och blev gäst, och den nya värden stod kvar.
- Värden laddade om mitt i rundan: se fynd 6 nedan, som jag hittade här.

### Rättat

**6. Rundan tog slut direkt när värden laddade om sidan (hög).** `src/hooks/useLobby.ts` (`resolveIfEveryoneGuessed`) och `src/lib/match.ts`.
- Vad som händer: i Gissa priset och Närmast vinner avslutas rundan i förtid när alla som är online har gissat. Precis efter att värden laddat om sidan innehåller värdens närvarolista en kort stund bara de andra spelarna. Hade de redan gissat såg det ut som att alla var klara, och rundan tog slut med mer än 20 sekunder kvar. Värden fick "Du hann inte gissa den här gången" och noll poäng.
- Hur det uppstår: värden laddar om sidan (eller ansluter på nytt efter ett nätavbrott) medan de andra har gissat men inte värden. Jag såg det i provspelet: rundan slutade med 26 sekunder kvar.
- Rättat: rundan avslutas bara i förtid när värden själv syns i närvarolistan (`everyonePresentHasGuessed`). Två tester i `match.test.ts`, och provat igen i webbläsaren: efter omladdningen fortsatte rundan med 24 sekunder kvar för båda. Commit `5e64b18`.

### Antecknat (inte rättat)

- **Oklart, en gång. Räknaren visade "0/2 har svarat" efter en omladdning hos värden, fast gästen hade gissat.** Det hände en gång, direkt efter att utvecklingsservern bytt ut kod i båda flikarna mitt i matchen. I två rena försök efteråt behölls gissningen genom både omladdning och värdbyte, och den sparade lobbyn hos värden innehöll gissningen. Jag tror att det berodde på kodbytet under körning och inte på sajten, men det är värt att hålla ögonen på i förhandsvisningen.

### Fler prov i webbläsaren

- **Exploderande Tanter, värd och gäst:** gästen laddade om mitt i matchen och fick tillbaka sin hand och sin tur. Värden laddade om och matchen fortsatte med samma händer och hög. Gästen drog ett kort efteråt, och turen gick vidare hos båda. Värden lämnade: gästen såg "Frånkopplad", tog över efter cirka 4 sekunder, och båda kom till väntrummet med "Matchen avbröts när värden lämnade". Den gamla värden kom tillbaka som gäst.
- **Imposterjakten, tre flikar:** två spelare med samma namn blev "Gustav" och "Gustav 2". En gäst laddade om medan korten lästes och fick tillbaka sitt kort. Värden laddade om mitt i ledtrådsvarvet, och impostern kunde sedan skicka sitt ord, som kom fram till alla. Impostern lämnade: efter tio sekunder avbröts omgången utan poäng, med rätt förklaring hos båda som var kvar.
- Inget nytt fel i de här proven.

### Antecknat efter proven (inte rättat)

- **Låg. En gammal värd som kommer tillbaka skickar sina gamla händer innan den viker sig.** När kanalen ansluter skickar en värd alltid allas händer igen (`sendHands` i `SUBSCRIBED`), och det sker innan närvarolistan visat att en annan redan är värd. Gästerna sparar då en gammal hand, men den visas aldrig (händer visas bara under en match, och nästa match ger en ny hand med ett nytt nummer). I ett sällsynt fall kan den gamla värden också hinna skicka ut sitt gamla läge: om dess första närvarolista saknar den själv och en ny spelare har gått med under tiden. Jag kunde inte framkalla det. En tänkbar åtgärd är att värden inte skickar något förrän den sett sig själv i närvarolistan och konstaterat att ingen annan är värd.

## 8. Övrigt

Genomgånget: `hojdpunkter.ts` (utmärkelserna), `Podium.tsx`, `supabase.ts` och en sökning efter osäkra ställen.

### Kontrollerat utan fynd

- Utmärkelserna klarar matcher utan gissningar och med en enda spelare (alla ställen med `Math.max(...)` på en lista har en vakt före).
- Inga nycklar i repot (bara `.env.example`), ingen `dangerouslySetInnerHTML`, `innerHTML` eller `eval`, och allt som kommer från andra spelare ritas som vanlig text.

Klar 01:10.

## Sammanfattning

Branch: `felsokning-2026-11-10` (från main, inte mergad). Hela genomgången, även det som kontrollerades utan fynd, står i `docs/felsokning-2026-11-10.md`. Efter varje rättning gick `npm test` (888 tester, 9 nya), `npm run lint` och `npm run build` igenom.

### Rättat (sex fel, en commit var)

1. **Hög. Rundan tog slut direkt när värden laddade om sidan** i Gissa priset och Närmast vinner. Värdens närvarolista innehöll en kort stund bara de andra, och hade de redan gissat såg det ut som att alla var klara. Värden fick noll poäng med över 20 sekunder kvar. Hittat i provspel, rättat och provat igen. Commit `5e64b18`.
2. **Medel. Närvaron kontrollerades inte.** Ett trasigt namn i närvaron gav ett fel hos värden varje gång någon gick med eller lämnade, och kunde krascha skärmen hos gästerna. Nu kontrolleras närvaron som allt annat i kanalen, och namnet kortas till 20 tecken. Commit `586afce`.
3. **Medel. Ett figurvärde som "constructor" kraschade lobbyn för alla.** Uppslaget av gamla figurer träffade en inbyggd egenskap. Commit `6a58f1d`.
4. **Medel. Adresser som kompisduellen.se/constructor kraschade sidan** i stället för att visa att sidan inte finns. Samma sorts uppslag, i taggarna i head. Commit `dd9ec2b`.
5. **Medel. Värdbyte mitt i Imposterjakten gav fel antal omgångar.** Hade värden tryckt "Avsluta efter den här omgången" och sedan lämnat, visade väntrummet det avkortade antalet, och den nya värdens val av omgångar gällde inte i nästa match. Commit `1b85995`.
6. **Medel. Bordet i Exploderande Tanter kunde falla ihop på äldre iPhones** (före iOS 15.4), efter mobilrättningen i går som satte höjden med bara `dvh`. Commit `cf0ee0c`.

### De fem viktigaste sakerna som är kvar

1. **Till Kortkaos: domarens val slås upp utan kontroll av nyckeln** (`cardMove` i `kort.ts`). En domare som skickar nyckeln `constructor` får igenom ett val utan vinnare, och gästerna underkänner sedan varje nytt läge resten av matchen. Samma sorts fel som nummer 3 och 4 ovan. Inte rättat, eftersom det är din kompis spel. Förslag: `Object.prototype.hasOwnProperty.call(secrets.submitted, move.key)`.
2. **En gammal värd som kommer tillbaka kan i ett sällsynt fall skicka ut sitt gamla läge** innan den viker sig för den nya värden (om dess första närvarolista saknar den själv och någon ny har gått med under tiden). Jag kunde inte framkalla det, men åtgärden är liten: värden skickar inget förrän den sett sig själv i närvarolistan.
3. **Risk för två värdar en kort stund** om en gästs närvarolista saknar värden i mer än fyra sekunder fast värden är kvar. Inte heller framkallat. Åtgärd: kräv ett läge från värden efter den senaste anslutningen innan gästen får ta över.
4. **Guiden säger fyra spel, men det finns fem.** "Förfestlekar på mobilen: 4 gratis spel" och "Här är fyra som är gratis" i `guider.ts`. Exploderande Tanter nämns inte i guiderna och har ingen egen spelsida eller rad i sajtkartan. Texter och nya sidor har jag inte rört.
5. **En gång visade räknaren "0/2 har svarat" efter en omladdning hos värden, fast gästen hade gissat.** Det hände direkt efter att utvecklingsservern bytt ut kod i flikarna mitt i matchen, och gick inte att upprepa i två rena försök. Troligen kodbytet och inte sajten, men håll ögonen på det.

Mindre saker (låg) står i felsökningsfilen: värdens lista över räknade drag finns bara i minnet, en gäst kan påstå sig ha en nyare version, prickarna på startsidan ritas om även när inget rör sig, och i Kortkaos räknas en match som tar slut för att för få är kvar.

### Testa i förhandsvisningen

1. **Värden laddar om mitt i en runda (viktigast).** Två telefoner eller flikar, Gissa priset. Gästen gissar, värden laddar om sidan innan den själv gissat. Rundan ska fortsätta med samma tid kvar, och värden ska kunna gissa. Gör samma sak i Närmast vinner.
2. **Vanlig match från början till slut** i Gissa priset med två spelare, så att närvaron fungerar som förut: gästen syns i väntrummet, namnen stämmer, två med samma namn blir "Namn" och "Namn 2", och kast och reaktioner fungerar.
3. **Värdbyte.** Värden stänger fliken mitt i en match i Gissa priset: gästen ska ta över efter cirka fyra sekunder och rundan fortsätta. Värden lämnar mitt i Exploderande Tanter: alla ska komma till väntrummet med "Matchen avbröts när värden lämnade".
4. **Imposterjakten, tre spelare:** tryck "Avsluta efter den här omgången" som värd och stäng sedan värdens flik. Väntrummet hos den nya värden ska visa det antal omgångar som var valt från början, och ett nytt val ska gälla i nästa match.
5. **Exploderande Tanter på iPhone:** bordet ska gå ända ned som i går, även när Safaris verktygsfält döljs och visas.
6. **Adressen /constructor** i förhandsvisningen ska visa sidan för adresser som inte finns, inte felrutan.
