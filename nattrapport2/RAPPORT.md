# Nattrapport 2

Allt ligger på lokala brancher, ingenting är pushat eller mergat. Varje steg utgår från senaste main (efter PR #47 och #48).
Testspelare heter alltid `TEST-NATT-...`. Den här rapporten ligger på branchen `natt2/rapport`.

## Brancher

| Branch | Steg | Status |
|---|---|---|
| `natt2/1-mobil` | Punkt 5: Mobilens svarsyta | klar |
| `natt2/2-forsta-start` | Punkt 8: Gemensam första start | klar |

## Hoppade över

- **Punkt 6 (Pausa efter facit):** finns redan. Värden har Pausa, Fortsätt och Nästa nu efter facit (PR #42, `RevealFooter.tsx`, `pauseReveal` i `match.ts`).
- **Punkt 9 (Tydligare ställning):** finns delvis (etikett "Vann senaste"/"Oavgjort", krona på ledaren, PR #45). "Egen placering och förändring" finns inte. Punkten stod inte i din ordning, så jag gjorde den inte.

## Steg 1: Mobilens svarsyta (`natt2/1-mobil`)

**Ändrat**
- Ny panel `AnswerDock`: statusraden ("⏱ 30 s kvar · 0/2 har svarat"), inmatningen och "Lås in gissning" ligger tillsammans. På mobil ligger panelen fast i nederkant och lyfts ovanför tangentbordet (`useKeyboardInset`, mäter hur mycket tangentbordet täcker). På bred skärm är det ett vanligt kort som förut.
- Spelarchipsen (vem som svarat) ligger kvar ovanför panelen.
- Den låsta gissningen är kompaktare i panelen.
- Fotot i frågan döljs när skärmen är riktigt låg (under 520 px, alltså öppet tangentbord), så att frågan får plats.
- Gäller Gissa priset. Närmast vinner har en mycket högre svarsyta (tal, knappar, reglage) och blev oförändrad.

**Testat (Playwright, värd + deltagare i separata sessioner)**
- Mobil 390x844: låsknappen syns direkt utan scroll. OK.
- Simulerat öppet tangentbord (sidan gjord låg, 390x460): inmatning, status/timer och låsknapp syns utan scroll. OK.
- Dubbelklick på "Lås in": en gissning, matchen går vidare. OK.
- Ingen horisontell scroll på mobil eller bred skärm. OK.
- Bred skärm 1280x900: låsknappen syns inte utan scroll (fotot och frågan är stora). Det var likadant före ändringen, jag lät det vara.
- Build och alla 121 tester: gröna.

**Kan inte testas här:** ett riktigt mobiltangentbord (iOS och Android beter sig olika). Jag simulerade bara att sidan blir låg.

**Testa själv på mobilen:** tryck i gissningsrutan i Gissa priset och kolla att "Lås in gissning" och tiden ligger direkt ovanför tangentbordet, på både iPhone och Android. Skrolla frågan upp och ner medan tangentbordet är öppet.

Skärmdumpar: `n1-mobil.png`, `n1-tangentbord.png`.

## Steg 2: Gemensam första start (`natt2/2-forsta-start`)

**Ändrat**
- När värden trycker "Starta" med flera spelare i lobbyn kommer nu samma gemensamma nedräkning som vid revansch: "Nu kör vi!", en kort regelmening (en per spel, fältet `quickRule` i `games.ts`) och stora siffror 3, 2, 1. Svarstiden för runda 1 börjar först efter nedräkningen.
- Återanvänder revanschens nedräkning (`rematchAt`, samma timer och avbryt-knapp). Nytt fält `countdownKind` ('first' eller 'rematch') styr rubriken och texten. Ny funktion `hostCountdownStart` i `match.ts`.
- Dubbelklick på Starta ger en nedräkning. Går någon ur så att för få är kvar avbryts starten (som vid revansch). Värden kan avbryta.
- Solotestet ("Testa själv") startar fortfarande direkt utan nedräkning, eftersom ingen annan väntar.
- Regelmeningar: Gissa priset "Gissa priset i kronor. Närmast rätt pris ger flest poäng." Närmast vinner "Gissa ett tal mellan 1 och 100. Närmast det dolda talet vinner rundan." Kortkaos "Lägg kortet som passar bäst i luckan. Domaren väljer sin favorit."

**Testat**
- Värd + deltagare i separata sessioner, mobil 390x844 och bred skärm: båda ser nedräkningen och regeln, rundan startar efter ca 3,5 s, 30 s kvar vid start, dubbelklick ger en match, solotestet startar på under 1 s. Alla OK.
- 4 nya enhetstester (125 totalt) och build: gröna.
- Kortkaos testades inte i webbläsaren (kräver 3 spelare). Det använder samma startväg, men nedräkningen är inte sedd där.

**Testa själv på mobilen:** starta en match med en kompis och kolla att båda ser "Nu kör vi!" och regeln innan första frågan, och att tiden inte börjar rulla för tidigt.

Skärmdump: `n2-nedrakning.png`.
