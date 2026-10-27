# Nattrapport

Så här jobbade jag: ett steg i taget, varje steg på en egen gren (branch) som utgår från main. Inget har pushats, slagits ihop med main eller driftsatts. Allt ligger bara på den här datorn.

Testen gjorde jag i en riktig webbläsare (Playwright) med värd och deltagare i två helt separata sessioner, på mobilstorlek 390 x 844. Alla testspelare heter "TEST-NATT ...". De försvinner av sig själva när webbläsaren stängs, och inget sparas i någon databas.

## Översikt

| Steg | Gren | Status |
| --- | --- | --- |
| 1. Snabba textändringar | `natt/1-texter` | Klar, alla kontroller godkända |
| 2. Återanslutning utan dubbla spelare | `natt/2-ateranslutning` | Klar, alla kontroller godkända |
| 3. Kompakt väntrum | `natt/3-vantrum` | Klar, alla kontroller godkända |
| 4. Revansch och spelbyte | `natt/4-revansch` | Klar, alla kontroller godkända |

## Steg 1: Snabba textändringar (`natt/1-texter`)

**Vad jag ändrade**
- Knappen "Spela igen" på prispallen heter nu **"Till väntrummet"**. Efter ett solotest heter den **"Bjud in kompisar"**, och förklaringen ovanför knappen säger samma sak.
- Topplistan heter nu **"Kvällens ställning"**. Samma ord används nu i de andra texterna som nämnde topplistan (testläget i väntrummet och på sidan där man skapar ett solotest).
- Under huvudknapparna på startsidan står nu **"Alla spelar på sin egen mobil eller dator."**
- Under varje spelare i ställningen stod "1 match spelade". Nu står det **"1 match spelad"** (och "3 matcher spelade").

Inget annat är ändrat. Frågorna, ledtrådarna och bilderna i Gissa priset är orörda.

**Vad jag testade (mobil 390 x 844, värd och deltagare i varsin session)**
- Startsidan, både bred och mobil: den nya texten syns. OK
- En hel match med tre rundor i Gissa priset, spelad till prispallen. OK
- Prispallen: "Till väntrummet" finns och "Spela igen" är borta. OK
- Prispallen: "Kvällens ställning" finns och "Topplista" är borta. OK
- Prispallen: "1 match spelad" stämmer. OK
- Deltagaren ser "Värden väljer nästa spel". OK
- Dubbelklick på "Till väntrummet": man hamnar i väntrummet en gång, med ställningen kvar. OK
- Solotest spelat till slut: knappen heter "Bjud in kompisar". OK
- `npm run build`, `npm run lint` (bara en gammal varning om en knappfil) och `npm test` (91 tester): godkända.

Resultat: 11 av 11 kontroller godkända.

**Skärmdumpar:** `nattrapport/steg1-prispall-mobil-vard.png` och `nattrapport/steg1-prispall-mobil-gast.png`.

**Vad som inte fungerar:** inget känt.

**Titta på själv i morgon (på mobilen):**
- Öppna startsidan och kolla att raden "Alla spelar på sin egen mobil eller dator." syns under knapparna och inte ser trång ut.
- Spela en match och titta på prispallen: stämmer orden "Till väntrummet" och "Kvällens ställning"?

## Steg 2: Återanslutning utan dubbla spelare (`natt/2-ateranslutning`)

**Orsaken (undersökt först, och bekräftad i en riktig webbläsare)**
Sajten kommer ihåg *vem* du är på två ställen. Namn och figur sparas i webbläsaren och delas av alla flikar. Men det osynliga spelar-id:t, som är det som skiljer spelare åt, sparas bara i just den fliken. När man öppnar lobbyn i en ny flik får den därför ett helt nytt id men samma namn och figur. För värden ser det ut som en ny spelare med samma namn. Samma sak händer på en telefon som glömmer fliken: man kommer in som ny spelare utan poäng. Att ladda om samma flik gav aldrig dubbletter, eftersom id:t då finns kvar.

**Vad jag ändrade**
- Sajten sparar nu också vilket id du hade i varje lobby (i 12 timmar, sedan glöms det).
- Öppnar du lobbyn i en ny flik får du välja: **"Fortsätt som [ditt namn]"** (du blir samma spelare och poängen följer med) eller **"Gå med som en annan spelare"** (du skriver ett namn och blir en ny spelare).
- Namnet är aldrig identiteten. Två personer får heta exakt samma sak och är då två spelare.
- **En spelare i en flik åt gången:** är samma spelare redan med i en annan flik visas "Du är redan med i den här lobbyn", med knapparna "Försök igen" och "Gå med som en annan spelare". Den äldsta fliken behåller platsen. Det hindrar också att en kopierad värdflik (Duplicera flik) blir en andra värd.
- Varje flik minns sitt eget namn i lobbyn. Annars kunde en andra person i samma webbläsare råka döpa om den första vid omladdning.
- Om lobbyn är borta står det nu tydligare att det inte går att fortsätta som tidigare spelare när värden har stängt sidan.
- Nya filer: `src/hooks/useOneTab.ts` och `src/lib/player.test.ts`. Ändrade: `src/lib/player.ts`, `src/pages/LobbyPage.tsx` och CLAUDE.md.

**Vad jag testade (värd och deltagare i varsin session, mobil 390 x 844 för deltagarna)**
- Två i lobbyn från start. OK
- Omladdning av en flik: fortfarande två, ingen fråga om identitet. OK
- Ny flik i samma webbläsare: valet "Fortsätt som" / "Gå med som en annan spelare" visas. OK
- Dubbelklick på "Fortsätt som" medan första fliken är öppen: beskedet "redan med i en annan flik", och ingen extra spelare. OK
- "Gå med som en annan spelare": tre i lobbyn med rätt namn. OK
- Omladdning av första spelarens flik efteråt: hen döps inte om. OK
- Två enheter med exakt samma namn: båda är med som två spelare. OK
- Återanslutning mitt i en match (fliken stängs, ny flik, "Fortsätt som"): matchen visas, ingen extra spelare och poängen är kvar. OK
- Värden stänger lobbyn: ny flik får "Ingen lobby med koden ...", med förklaring. OK
- Kopierad värdflik: får beskedet, kan bli en vanlig spelare, och det finns fortfarande bara en värd. OK
- `npm run build`, `npm run lint` och `npm test` (94 tester, 3 nya): godkända.

Resultat: 17 av 17 kontroller godkända.

**Skärmdumpar:** `nattrapport/steg2-ny-flik-val.png` (valet) och `nattrapport/steg2-redan-med-i-annan-flik.png` (beskedet), båda i mobilstorlek.

**Vad som inte fungerar / bra att veta**
- Öppnar man lobbyn i en ny flik frågar sajten "Fortsätt som ..." även om värden redan har stängt sidan. Man får då beskedet "Ingen lobby med koden ..." först efter valet. Det är begripligt men en liten omväg.
- Två flikar som öppnas exakt samma sekund kan båda ansluta (kontrollen väntar 0,4 sekunder på svar). Det är sällsynt.
- Återanslutning fungerar i samma webbläsare. Byter man till en helt annan telefon eller webbläsare finns ingen sparad identitet, och man går med som ny spelare (det går inte utan konton).
- Rubriken i menyn uppe till höger visar ibland det gamla namnet direkt efter att man bytt namn tills man går vidare till en annan sida. Det var så förut också och jag lät det vara.

**Titta på själv i morgon (på mobilen):**
- Gå med i en lobby på mobilen, lås skärmen eller stäng fliken en stund, öppna länken igen: får du valet "Fortsätt som ..." och är poängen kvar?
- Låt en kompis med exakt samma namn som du gå med: syns ni som två spelare?
- Gå med i samma lobby i två flikar på datorn: får den nya fliken beskedet?

## Steg 3: Kompakt väntrum (`natt/3-vantrum`)

**Vad jag ändrade**
- **Överst:** ett kort med spelet, antal spelare och en rad som sammanfattar inställningarna ("5 rundor · 30 s svarstid · automatiskt vidare"). För värden ligger startknappen direkt under, och under den en knapp **"Ändra inställningar"**.
- **Inställningarna** (välj spel, antal rundor, svarstid, efter facit) ligger nu gömda bakom "Ändra inställningar" och visas bara för värden. Sammanfattningen uppdateras direkt när värden ändrar något.
- **Deltagare** ser bara sammanfattningen och **"Väntar på att [värdens namn] startar [spelet]..."**. De avaktiverade formulären är borta.
- **Inbjudan** är mer kompakt: QR-koden och den stora koden ligger bredvid varandra, med "Dela" och "Kopiera inbjudningslänk" under. Allt är kvar och lättåtkomligt.
- **Spelarna** visas som små märken, och din egen spelare har märket **"Du"**. Värden har kronan.
- **"Så spelas det"** är ett hopfällt fält där regler och poängförklaring ligger, för alla.
- Startvillkoren är oförändrade: Gissa priset kan startas ensam som provomgång ("Testa Gissa priset själv"), medan spel som kräver fler spelare får en avaktiverad startknapp och en förklaring ("Minst 2 spelare behövs").
- Ändrade filer: `src/components/lobby/WaitingRoom.tsx`, `src/components/lobby/InviteCard.tsx` och en rad i `src/pages/LobbyPage.tsx` (skickar med vem du är).

**Vad jag testade (värd och deltagare i varsin session, mobil 390 x 844)**
- Värd: spelets namn, antal spelare, sammanfattning, startknapp, kod, "Dela" och "Kopiera inbjudningslänk" syns alla utan att scrolla. OK
- Värd: inga stora formulär syns från början, "Du" syns och ingen sidledes scroll. OK
- "Ändra inställningar" visar spelval, rundor, svarstid och efter facit, och sammanfattningen följer ändringarna. OK
- Byte till Närmast vinner med bara en spelare: startknappen avaktiveras och förklaringen visas. OK
- Deltagare: "Väntar på att TEST-NATT Värd startar...", sammanfattning, inga formulär och inga avaktiverade knappar. OK
- Deltagare: "Du" och värdens krona syns, och koden syns utan att scrolla. OK
- Långt namn: ingen sidledes scroll. OK
- Dubbelklick på Starta: en match startar (runda 1 av 3) och spelas till slut. OK
- Tillbaka i väntrummet efter matchen: ställningen och startknappen finns. OK
- Solotest startar direkt. OK
- Bred skärm (1280 x 800): startknapp och kod syns utan att scrolla. OK
- `npm run build`, `npm run lint` och `npm test` (91 tester): godkända.

Resultat: 24 av 24 kontroller godkända.

**Skärmdumpar:** `nattrapport/steg3-vantrum-mobil-vard.png` och `nattrapport/steg3-vantrum-mobil-gast.png`.

**Vad som inte fungerar / bra att veta**
- Startknappen ligger överst i flödet och följer inte med när man scrollar ner (den är inte "klistrad" vid skärmens nederkant). Jag valde det för att den då aldrig täcker något. Det blir sällan ett problem eftersom kortet är kompakt, men har ni många spelare och öppnar inställningarna kan man behöva scrolla upp.
- Är värden ensam i ett spel som kräver flera spelare visas en avaktiverad startknapp. Det är avsikten.
- Jag provade inte 12 spelare på riktigt (bara värd, deltagare och en tredje med långt namn). Spelarna ligger som märken som radbryts, så det borde gå bra.
- Menyn uppe till höger visar "Gå med" hos en deltagare som just gått med, tills man byter sida. Det var så förut också, och jag lät det vara.
- Steg 1 ändrade en text i det här väntrummet ("topplistan" blev "kvällens ställning"). Eftersom varje steg utgår från main och jag skrev om den delen här, kan grenarna `natt/1-texter` och `natt/3-vantrum` ge en liten sammanslagningskonflikt i `WaitingRoom.tsx`. Här står redan den nya texten.

**Titta på själv i morgon (på mobilen):**
- Skapa en lobby: ser du spelet, antal spelare och startknappen direkt, utan att scrolla?
- Tryck "Ändra inställningar" och ändra rundor och svarstid: stämmer raden överst?
- Gå med från en annan telefon: ser den bara "Väntar på att ... startar", och syns "Du" på rätt person?
- Skanna QR-koden med en annan telefon (den är mindre än förut): fungerar det fortfarande?

## Steg 4: Revansch och spelbyte (`natt/4-revansch`)

**Vad jag ändrade**
- På prispallen har värden nu två val: **"Revansch"** och **"Byt spel"**. Knappen "Spela igen" är borta. Under dem finns "Tillbaka till alla spel" som förut.
- **Revansch** startar samma spel med samma inställningar. Alla ser en gemensam nedräkning, **"Revansch! 3, 2, 1"**, och matchen startar av sig själv. Matchens poäng nollas, men kvällens ställning och gruppen följer med, och ingen behöver skriva koden igen. Frågorna slumpas som vanligt, så man får nya frågor. Värden kan trycka **"Avbryt"** under nedräkningen.
- **Byt spel** tar värden tillbaka till väntrummet med spelvalet i bild. Grupp, kod och ställning finns kvar. Spelen visar hur många spelare de kräver, och står det för få spelare går det ändå att välja spelet men startknappen väntar och förklarar varför ("Minst 3 spelare behövs"). Jag provade Kortkaos med bara två spelare.
- **Deltagarna följer med automatiskt** och ser nedräkningen, eller att värden väljer spel. Deltagare har inga knappar på prispallen, bara "Värden väljer nästa steg".
- **Efter ett solotest** heter huvudvalet **"Bjud in kompisar"** (tillbaka till väntrummet med koden) och det andra **"Testa igen"** (ny provomgång efter nedräkningen).
- **Om för många lämnar:** blir det färre spelare än spelet kräver avaktiveras Revansch med en förklaring. Och om någon lämnar mitt under nedräkningen avbryts revanschen i stället för att starta en match som inte går att spela.
- **Skydd mot dubbla matcher:** revansch fungerar bara från en avslutad match, och en gammal eller avbruten nedräkning startar ingenting. Därför ger ett dubbelklick en match och räknas resultatet bara en gång.
- Statistiken ("spelade_igen") räknas nu bara vid revansch, inte vid varje återgång till väntrummet.
- Ändrade filer: `src/lib/match.ts` (reglerna), `src/hooks/useLobby.ts`, `src/components/lobby/FinishedView.tsx`, `src/components/lobby/WaitingRoom.tsx`, `src/pages/LobbyPage.tsx`, 7 nya enhetstester i `src/lib/match.test.ts` och en rad i CLAUDE.md.

**Vad jag testade (värd och deltagare i varsin session, mobil 390 x 844)**
- Match 1 spelades till slut: värden ser "Revansch" och "Byt spel", deltagaren ser bara "Värden väljer nästa steg". OK
- Dubbelklick på Revansch: deltagaren följer med och ser nedräkningen, värden ser den och "Avbryt". OK
- Matchen startar av sig själv för båda, runda 1 av 3, med samma svarstid som förut (60 s i stället för standard 30 s). OK
- Samma adress hela tiden, ingen behövde skriva koden igen. OK
- Revanschmatchen spelades till slut: ställningen visar exakt två matcher, alltså inte dubbelräknat. OK
- Avbryt revansch: väntrummet visas, ingen match startar, och deltagaren ser inte längre nedräkningen. OK
- Byt spel: väntrummet med "Välj spel" i bild, samma adress, ställningen kvar (3 matcher). Deltagaren väntar kvar. OK
- Kortkaos med två spelare: "3+ spelare · ni är 2 just nu" och avaktiverad startknapp. Deltagaren ser att värden valt Kortkaos. OK
- Närmast vinner spelades till slut, och när deltagaren lämnade avaktiverades Revansch med förklaring. OK
- Solotest: "Bjud in kompisar" och "Testa igen". "Testa igen" startar en ny omgång efter nedräkningen, och "Bjud in kompisar" visar väntrummet med koden. OK
- `npm run build`, `npm run lint` och `npm test` (98 tester, 7 nya): godkända.

Resultat: 29 av 29 kontroller godkända.

**Skärmdumpar:** `nattrapport/steg4-prispall-mobil-vard.png` (värdens prispall) och `nattrapport/steg4-revansch-nedrakning-mobil-gast.png` (deltagarens nedräkning).

**Vad som inte fungerar / bra att veta**
- Det här steget utgår från main, så det bygger på det gamla väntrummet. I det väntrummet är spelvalet redan synligt, så "Byt spel" scrollar bara dit. Efter steg 3 (kompakt väntrum) bör "Byt spel" i stället öppna "Ändra inställningar". Det är en liten följdändring när grenarna slås ihop (`scrollToGames` i `WaitingRoom.tsx`).
- Jag testade inte Kortkaos revansch med tre spelare. Samma logik används för kortspelen och är enhetstestad, men jag spelade bara Gissa priset och Närmast vinner på riktigt.
- Nedräkningen följer värdens klocka. Har en deltagares telefon en klocka som går fel justeras det automatiskt, men jag testade det inte med en avvikande klocka.
- Är värden den som tappar nätet under nedräkningen startar ingen match förrän värden är tillbaka (så fungerar hela lobbyn).
- Steg 1 döper om "Spela igen" till "Till väntrummet". Steg 4 tar bort den knappen helt, så den textändringen behövs bara för solotestet ("Bjud in kompisar") som båda stegen rör. Grenarna kan ge en sammanslagningskonflikt i `FinishedView.tsx`.

**Titta på själv i morgon (på mobilen):**
- Spela en match med en kompis och tryck "Revansch": ser kompisen nedräkningen och startar matchen utan att göra något?
- Tryck "Byt spel" på prispallen och välj ett annat spel: följer kompisen med utan att skriva koden igen?
- Testa solospelet och tryck "Testa igen" och "Bjud in kompisar".
- Tryck snabbt två gånger på "Revansch": startar det bara en match?
