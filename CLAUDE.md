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
- PWA via `vite-plugin-pwa` (manifestet ligger i `vite.config.ts`)
- Driftsätts på Vercel (`vercel.json` skickar alla sökvägar till `index.html`)

## Kommandon

- `npm run dev`: startar dev-servern på http://localhost:5173
- `npm run build`: typkontroll och produktionsbygge till `dist/`
- `npm run lint`: kör oxlint
- `npx shadcn@latest add <komponent>`: lägger till en shadcn-komponent i `src/components/ui/`

## Struktur

- `src/pages/`: en komponent per sida (routes finns i `src/App.tsx`)
- `src/components/`: delade komponenter (`Layout`, `PageHeader`, `PlayerSetup`, `Countdown`, `Podium`, `Leaderboard`)
- `src/hooks/useLobby.ts`: lobbyn och realtiden (Supabase Realtime: presence + broadcast, inga tabeller)
- `src/components/ui/`: genererade shadcn-komponenter. Ändra dem bara om det behövs
- `src/lib/`: hjälpfunktioner och Supabase-klienten
  - `games.ts`: listan över spel på startsidan
  - `player.ts`: gästspelare (namn + figur i localStorage), lobbykoder, värdflagga
  - `narmast.ts`: spellogiken för gissningsspelen Närmast vinner och Gissa priset, plus topplistan (rena funktioner)
  - `prisdata.ts`: sakerna i Gissa priset (pris, fakta, källa) och poängräkningen `pricePoints`
  - `belopp.ts`: omräkning av gissningar i Gissa priset (tal + enhet som öre eller miljarder till kronor)
- Importera med aliaset `@/` (pekar på `src/`)

## Så fungerar lobbyn

- Alla i en lobby ansluter till Realtime-kanalen `lobby:KOD`.
- Den som skapade lobbyn är värd och äger spelets tillstånd. Värden skickar ut hela tillståndet (`state`) till alla.
- Övriga skickar bara sina gissningar (`guess`) till värden. Nya spelare skickar `hello` för att få aktuellt läge.
- Lämnar värden försvinner lobbyn. Inget sparas i databasen ännu.

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
