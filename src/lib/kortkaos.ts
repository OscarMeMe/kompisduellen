// Spelregler för Kortkaos: varje runda har en domare som visar ett frågekort med en lucka. Alla andra
// lägger sitt roligaste svarskort, och domaren väljer favoriten utan att veta vem som spelade vad.
// Rundflödet finns i kort.ts. Korten ligger i kortkaos.json, och namnet på spelet i games.ts.

import { fillPrompt, type CardGameRules, type CardTable, type CardWin } from '@/lib/kort'
import kort from '@/lib/kortkaos.json'

const HAND_SIZE = 7
const BLANK_MAX_LENGTH = 60

// Korten har id efter sin plats i listan: f0, f1 … för frågor och s0, s1 … för svar.
function byId(list: string[], id: string): string {
  return list[Number(id.slice(1))] ?? ''
}

export const kortkaosRules: CardGameRules = {
  roundOptions: [5, 8, 10],
  defaultRounds: 8,
  handSize: HAND_SIZE,
  blankMaxLength: BLANK_MAX_LENGTH,
  seconds: { question: 8, choosing: 40, judging: 45, reveal: 12 },
  prompts: kort.fragor.map((_, i) => `f${i}`),
  answers: kort.svar.map((_, i) => `s${i}`),
  promptText: (id) => byId(kort.fragor, id),
  answerText: (id) => byId(kort.svar, id),
  howTo: `Alla har ${HAND_SIZE} svarskort på handen. Varje runda har en domare som visar ett frågekort med en lucka, och alla andra lägger det kort som passar bäst (eller sämst). Domaren väljer sin favorit utan att veta vem som spelade vad.`,
  scoringDetails: [
    'Den som spelade kortet domaren väljer får 1 poäng.',
    'Domaren byts varje runda, så alla får döma.',
    `Du har ett blankt kort per match där du skriver ett eget svar (högst ${BLANK_MAX_LENGTH} tecken). Ingen ser att det var blankt.`,
    'Väljer domaren inte i tid lottas vinnaren.',
    'Flest poäng efter sista rundan vinner matchen. Lika poäng ger delad seger.',
  ],
}

// Frågan med svaret i luckan, t.ex. "Hemligheten bakom farmors kanelbullar är en ensam inlagd sill."
export function sentence(win: Pick<CardWin, 'prompt' | 'text'>): string {
  return fillPrompt(kortkaosRules.promptText(win.prompt), win.text)
}

// Matchens bästa kort: en vinnande mening som en domare valde (inte lottade), helst spelad av
// matchens vinnare. Finns flera tas den första.
export function bestCard(table: CardTable, winners: string[]): CardWin | null {
  const chosen = table.wins.filter((win) => !win.asleep)
  return chosen.find((win) => winners.includes(win.player)) ?? chosen[0] ?? null
}
