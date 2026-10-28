// Ungefärlig tid för en match med förvalda inställningar, räknad från spelets egna regler: antal rundor gånger
// tiden för en runda (svarstid och facit). Det är en övre uppskattning, eftersom en runda tar slut så fort alla svarat.
// Visas som etikett på spelkorten på startsidan.

import { defaultRoundsFor } from '@/lib/match'
import { cardRulesFor, rulesFor } from '@/lib/spelregler'

// Sekunder för en hel runda: kortspelens fyra steg, eller svarstid och facit i gissningsspelen.
function secondsPerRound(game: string): number {
  const cards = cardRulesFor(game)
  if (cards) return cards.seconds.question + cards.seconds.choosing + cards.seconds.judging + cards.seconds.reveal
  const rules = rulesFor(game)
  return rules.guessSeconds + rules.revealSeconds
}

export function matchMinutes(game: string): number {
  return Math.max(1, Math.round((defaultRoundsFor(game) * secondsPerRound(game)) / 60))
}

export function durationLabel(game: string): string {
  return `ca ${matchMinutes(game)} min`
}
