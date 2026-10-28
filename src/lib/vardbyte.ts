// Värdbyte: lämnar värden tar en annan spelare över, så att lobbyn finns kvar. Alla har redan det senaste
// tillståndet (värden skickar ut hela tillståndet vid varje ändring), så den nya värden fortsätter där den förra slutade.
// Rena funktioner utan React eller Supabase, så att de är lätta att testa.

import type { GameState } from '@/lib/match'

// Så länge måste värden ha varit borta innan efterträdaren tar över av sig själv (en omladdning hinner komma tillbaka).
// Väljer värden Lämna skickas ett överlämnande, och då byts värd direkt.
export const TAKEOVER_MS = 4000

// Efter att en ny värd tagit över syns den förra värden en kort stund till. Så länge väntar vi innan två värdar
// leder till att någon viker sig.
export const TAKEOVER_SETTLE_MS = 6000

type Present = { id: string; host: boolean; joinedAt: number }

// Den som tar över: den som varit med längst av dem som är kvar (och inte värd). Alla räknar ut samma spelare,
// så bara en tar över. players ska vara sorterade med den som anslöt först först, som i lobbyn.
export function pickSuccessor<T extends Present>(players: readonly T[], excludeId?: string): T | undefined {
  return players.find((player) => !player.host && player.id !== excludeId)
}

// Två värdar samtidigt (den gamla värden kom tillbaka efter att en annan tagit över): den som anslöt senast viker sig.
export function shouldYieldHost(me: Present, others: readonly Present[]): boolean {
  return others.some(
    (other) => other.host && other.id !== me.id && (me.joinedAt > other.joinedAt || (me.joinedAt === other.joinedAt && me.id > other.id)),
  )
}

// Tillståndet när en ny värd tar över. Klockan som deadline och nedräkning räknas mot är värdens egen, så den
// räknas om till den nya värdens klocka (offset = min klocka minus förra värdens klocka). Kortspelens hemliga
// data (leken och händerna) fanns bara hos förra värden, så en pågående kortmatch avbryts och gruppen
// kommer tillbaka till väntrummet med en förklaring.
export function takeOverState(state: GameState, offset: number): GameState {
  const moved = (time: number | null) => (time === null ? null : time + offset)
  if (state.phase === 'playing') {
    const scores: Record<string, number> = {}
    for (const id of Object.keys(state.players)) scores[id] = 0
    return {
      ...state,
      phase: 'waiting',
      round: 0,
      deadline: null,
      pause: null,
      guesses: {},
      guessTimes: {},
      scores,
      lastResult: null,
      matchRounds: [],
      itemId: null,
      practice: false,
      rematchAt: null,
      choosingGame: false,
      cards: null,
      notice: 'Matchen avbröts när värden lämnade. Starta om den när ni vill.',
    }
  }
  return { ...state, deadline: moved(state.deadline), rematchAt: moved(state.rematchAt) }
}
