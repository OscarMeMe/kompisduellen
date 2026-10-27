# Kompisduellen

Svensk sajt med roliga småspel och gissningslekar att köra med kompisar, på förfesten, i Discord eller var som helst. Man skapar en lobby, bjuder in vänner med en 4-bokstavskod och tävlar mot varandra.

## Regler

- All text i appen är på svenska. Sökvägar skrivs utan å/ä/ö (t.ex. `ga-med`).
- Byggs för datorn först, men ska fungera bra på mobil (responsiv design). Testa både bred och smal skärm, och håll knappar och tryckytor stora nog för fingrar.
- Nycklar ligger i `.env.local`, aldrig i koden. Nya miljövariabler läggs till i både `.env.example` och `src/vite-env.d.ts`.
- Små ändringar per commit, beskrivande commit-meddelanden på svenska.
- Jobba på en egen branch, aldrig direkt på main (undantag: första grundcommiten).
- Supabase: nya tabeller exponeras inte automatiskt och har RLS. Skapa alltid policies och grants när du skapar en tabell.
- Gäster (anonymous sign-in) räknas som authenticated. Använd is_anonymous i policies när något bara ska gälla riktiga konton.
- Använd shadcn/ui-komponenter och Tailwind-klasser, inte egen CSS.
- Kör `npm run build` innan du säger att något är klart.

## Teknik

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`, ingen `tailwind.config`) och shadcn/ui (stil `radix-nova`, ikoner från `lucide-react`)
- React Router (paketet `react-router`, inte `react-router-dom`)
- Supabase (`src/lib/supabase.ts`) för databas, inloggning och realtid
- PWA via `vite-plugin-pwa` (manifestet ligger i `vite.config.ts`, ikonerna i `public/`: `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` och `icon-512-maskable.png`)
- Driftsätts på Vercel (`vercel.json` skickar alla sökvägar till `index.html`)

## Stil

- Varm, ljus och lekfull: krämvit bakgrund med prickmönster, korallröd huvudfärg (`primary`), pastellfärgade kort, mjuka skuggor och stora rundningar.
- Typsnitt: Syne för rubriker och knappar (`font-heading`, h1–h3 får det automatiskt), Plus Jakarta Sans för brödtext (`font-sans`). Båda via `@fontsource-variable`.
- Alla färger och skuggor ligger som variabler i `src/index.css`. Använd dem i stället för Tailwinds färdiga färger (som `violet-500`):
  - shadcn-färgerna: `primary`, `background`, `foreground`, `card`, `muted`, `accent`, `border` osv.
  - pasteller: `mint`, `sun`, `sky`, `lilac` och de ljusa `coral-soft`, `mint-soft`, `sun-soft`, `sky-soft`
  - skuggor: `shadow-soft` (kort), `shadow-soft-sm` (små ytor), `shadow-primary` (korallknappar, finns redan på `Button`)
- Rundning: knappar och fält `rounded-md` (1rem), kort `rounded-lg` (1.25rem), etiketter `rounded-full`.
- Kort: `rounded-lg border bg-card shadow-soft`. Vinnare markeras med `bg-mint-soft`, ledare i topplistan med `bg-sun-soft`.
- `Button` (`size="lg"` för stora knappar, 3.25rem hög) och `Input` har redan designens mått, så lägg inte till egna höjder eller rundningar på dem.
- `animate-pop` för saker som dyker upp.
- Spelikoner och spelarfigurer visas med `<Emoji emoji="🧙" />` som Microsoft Fluent Emoji i 3D (MIT, licensen ligger i `public/emoji/LICENSE.txt`). Bilderna ligger i `public/emoji` och hämtas aldrig från en extern sida. Storleken följer textstorleken (t.ex. `className="text-2xl"`). Saknas en bild visas tecknet. Ny figur eller nytt spel: lägg PNG-filen i `public/emoji` och en rad i `src/lib/emoji.ts`. Emojierna i Gissa priset-frågorna är vanliga tecken.

## Kommandon

- `npm run dev`: startar dev-servern på http://localhost:5173
- `npm run build`: typkontroll och produktionsbygge till `dist/`
- `npm run lint`: kör oxlint
- `npm test`: kör testerna (Vitest). Tester ligger bredvid koden, t.ex. `src/lib/match.test.ts`
- `npx shadcn@latest add <komponent>`: lägger till en shadcn-komponent i `src/components/ui/`

## Struktur

- `src/pages/`: en komponent per sida (routes finns i `src/App.tsx`)
- `src/components/`: delade komponenter (`Layout`, `PageHeader`, `PlayerSetup`, `Countdown`, `Podium`, `Leaderboard`, `Emoji`)
  - `lobby/`: väntrum, prispall och delar som alla spel använder (`RoundTimer` med runda och tidsstapel, `GuessStatusList` med statusraden "⏱ 12 s kvar · 3/4 har svarat", `RoundBadge`, `RevealFooter`, props-typerna för spelvyer)
  - `narmast/` och `gissa-priset/`: varje spels vy för att gissa och visa svaret. `LobbyPage` väljer vy via `GAME_VIEWS`
- `src/hooks/useLobby.ts`: lobbyn och realtiden (Supabase Realtime: presence + broadcast, inga tabeller)
- `src/hooks/useMyGuess.ts`: min gissning i rundan (inlåst direkt när den skickas)
- `src/hooks/useCountdown.ts`: sekunder och andel kvar till en deadline (används av `Countdown`, `RoundTimer` och statusraden)
- `src/hooks/useLayout.ts`: låter en sida säga till `Layout` att en match pågår (då döljs menyn)
- `src/components/ui/`: genererade shadcn-komponenter. Ändra dem bara om det behövs
- `src/lib/`: hjälpfunktioner och Supabase-klienten
  - `games.ts`: listan över spel på startsidan
  - `player.ts`: gästspelare (namn + figur i localStorage, spelar-id i sessionStorage), lobbykoder, värdflagga (sessionStorage)
  - `match.ts`: matchflödet som är gemensamt för alla spel (rundor, gissningar, poäng, topplistan). Rena funktioner
  - `spelregler.ts`: reglerna per spel (tider, giltiga gissningar, poäng). Nytt spel = nya regler här, vyer i `GAME_VIEWS` och en rad i `games.ts`
  - `narmast.ts` och `gissa-priset.ts`: reglerna för respektive spel (`pricePoints` ligger i `gissa-priset.ts`)
  - `prisdata.ts`: sakerna i Gissa priset (pris, fakta, källa och ibland en bild). Bilderna ligger som webp (max 800 px bred) i `public/prisbilder` och kommer bara från Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA), Unsplash eller Pexels. Fotograf och licens står i `imageCredit` när licensen kräver det
  - `belopp.ts`: belopp i Gissa priset: tolkning av det man skriver (kronor, komma eller punkt för ören), min/max och visning i kronor
  - `emoji.ts`: vilka emoji som visas som Fluent-bilder (bildfil och svensk alt-text per tecken)
  - `hojdpunkter.ts`: höjdpunkterna efter en match (fullträff, längst ifrån, avgjorde i sista rundan)
  - `inbjudan.ts`: inbjudningslänken och vad Dela och Kopiera gör i alla utfall
  - `device.ts`: `hasFinePointer()` (mus eller styrplatta). Används för att inte öppna mobilens tangentbord av sig självt
- Importera med aliaset `@/` (pekar på `src/`)

## Så fungerar lobbyn

- Alla i en lobby ansluter till Realtime-kanalen `lobby:KOD`.
- Den som skapade lobbyn är värd och äger spelets tillstånd. Värden skickar ut hela tillståndet (`state`) till alla.
- Övriga skickar bara sina gissningar (`guess`) till värden. Nya spelare skickar `hello` för att få aktuellt läge.
- Spelar-id och värdflaggan sparas per flik (sessionStorage), så varje flik är en egen spelare. Det går att testa med flera spelare i flera flikar.
- Värden väljer spel i väntrummet (fältet `game` i tillståndet). Spelet från startsidan är bara förvalt.
- Topplistan gäller hela lobbyn oavsett spel och räknar vunna matcher. Delad seger ger alla på förstaplatsen en vinst.
- Gissa priset har tempo i lobbyn: svarstid (20, 30 eller 60 s) och om facit går vidare automatiskt eller när värden klickar. Värdens timer gäller bara sin egen deadline (`handleDeadline`), och "nästa runda" tar med sig rundan som visades (`advanceFromReveal`), så inget hoppas över.
- En match med en spelare är en provomgång (`practice`) och räknas inte i topplistan. "Testa själv" (`/skapa?spel=gissa-priset&testa=1`) startar en direkt. Närmast vinner kräver två spelare.
- Lämnar värden försvinner lobbyn. Laddar värden om sidan finns lobbykoden kvar och gästerna återansluter, men match, topplista och inställningar börjar om. Inget sparas i databasen ännu.

## Routes

| Sökväg | Sida |
| --- | --- |
| `/` | Startsida |
| `/skapa` | Skapa lobby |
| `/ga-med` | Gå med (skriv in kod) |
| `/skapa?spel=narmast` | Skapa lobby för ett visst spel (`narmast`, `gissa-priset`) |
| `/lobby/:code` | Väntrum, spel och prispall (allt i samma sida) |
| `/spel/:code` | Skickar vidare till `/lobby/:code` |
| `/resultat/:code` | Skickar vidare till `/lobby/:code` |
| `/profil` | Profil |
