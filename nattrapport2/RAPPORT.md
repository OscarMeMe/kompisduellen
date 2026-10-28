# Nattrapport 2

Allt ligger på lokala brancher, ingenting är pushat eller mergat. Varje steg utgår från senaste main (efter PR #47 och #48).
Testspelare heter alltid `TEST-NATT-...`. Den här rapporten ligger på branchen `natt2/rapport`.

## Brancher

| Branch | Steg | Status |
|---|---|---|
| `natt2/1-mobil` | Punkt 5: Mobilens svarsyta | klar |

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
