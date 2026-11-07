// Rapporter om fel i Gissa prisets frågor. De skickas som händelsen rapporterade_fel i statistiken (PostHog) med frågans
// id och orsaken, aldrig namn eller figur, och följer samma regler som annan statistik (statistikAllowed).

import { track } from '@/lib/statistik'

export const REPORT_REASONS = [
  { id: 'pris', label: 'Fel pris' },
  { id: 'bild', label: 'Fel bild' },
  { id: 'text', label: 'Konstig text' },
  { id: 'annat', label: 'Något annat' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['id']

export function reportQuestion(itemId: string, reason: ReportReason) {
  track('rapporterade_fel', { fraga: itemId, orsak: reason })
}
