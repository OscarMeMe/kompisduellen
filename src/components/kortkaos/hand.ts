import type { FanCard } from '@/components/kort/Solfjader'
import { capitalize, type MyHand } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'

// Nyckeln för det blanka kortet i solfjädern. Korten på handen har id som s12, så den krockar aldrig.
export const BLANK_KEY = 'blankt'

// Korten på handen som de visas i solfjädern. Det blanka kortet ligger sist, med det egna svaret om man har skrivit
// ett.
export function handCards(hand: MyHand, blankText?: string): FanCard[] {
  const cards: FanCard[] = hand.cards.map((card) => ({ key: card, text: capitalize(kortkaosRules.answerText(card)) }))
  if (hand.blank) {
    cards.push({
      key: BLANK_KEY,
      text: blankText ? capitalize(blankText) : 'Blankt kort',
      blank: true,
      footer: blankText ? 'Tryck för att ändra' : 'Skriv ett eget svar',
    })
  }
  return cards
}
