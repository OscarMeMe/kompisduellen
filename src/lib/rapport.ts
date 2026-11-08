// Rapporter om fel i Gissa prisets frågor och önskemål om nya spel. Båda skickas som händelsen rapporterade_fel i
// statistiken (PostHog), märkta med typ ("fel" eller "önskemål"), och följer samma regler som annan statistik
// (statistikAllowed). Felrapporter innehåller frågans id och orsaken. Önskemål innehåller texten som skrevs och ett namn
// om man valt att skriva ett, men aldrig e-post eller figur.

import { track } from '@/lib/statistik'

export const REPORT_REASONS = [
  { id: 'pris', label: 'Fel pris' },
  { id: 'bild', label: 'Fel bild' },
  { id: 'text', label: 'Konstig text' },
  { id: 'annat', label: 'Något annat' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['id']

export function reportQuestion(itemId: string, reason: ReportReason) {
  track('rapporterade_fel', { typ: 'fel', fraga: itemId, orsak: reason })
}

// Önskemål om ett nytt spel ("Saknar du något spel?" på startsidan).
export const WISH_MAX_LENGTH = 300
export const WISH_NAME_MAX_LENGTH = 40
// Skydd mot spam, som för felrapporterna: ett önskemål per flik, och ett nytt tidigast efter så här lång tid (ms).
export const WISH_PAUSE_MS = 10 * 60 * 1000
const WISH_KEY = 'kd-onskemal'

type Store = Pick<Storage, 'getItem' | 'setItem'>
const session = (): Store | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export function canSendWish(now: number, store: Store | null = session()): boolean {
  const last = Number(store?.getItem(WISH_KEY) ?? 0)
  return !(last > 0 && now - last < WISH_PAUSE_MS)
}

// Skickar önskemålet (kortat till högst WISH_MAX_LENGTH tecken) och kommer ihåg att fliken skickat ett.
export function sendWish(text: string, name: string, now: number, store: Store | null = session()): boolean {
  const wish = text.trim().slice(0, WISH_MAX_LENGTH)
  if (wish.length < 3 || !canSendWish(now, store)) return false
  const namn = name.trim().slice(0, WISH_NAME_MAX_LENGTH)
  track('rapporterade_fel', namn ? { typ: 'önskemål', text: wish, namn } : { typ: 'önskemål', text: wish })
  try {
    store?.setItem(WISH_KEY, String(now))
  } catch {
    // Utan lagring går det att skicka igen efter en omladdning, och det gör inget.
  }
  return true
}
