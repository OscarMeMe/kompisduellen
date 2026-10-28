// Kollar om en lobbykod leder till en lobby som lever, innan man går med. Det finns ingen databas över lobbyer:
// en lobby finns så länge värden är med i Realtime-kanalen lobby:KOD. Kontrollen lyssnar bara på närvaron
// (utan att själv synas där) och släpper kanalen direkt efteråt.

import { supabase } from '@/lib/supabase'

export type LobbyKoll = 'finns' | 'saknas' | 'fel'

// Så länge väntar vi på att kanalen svarar innan vi ger upp (ms).
const TIMEOUT_MS = 4000
// Efter att vi anslutit väntar vi så här länge på att en värd ska dyka upp i närvarolistan. Den första signalen kommer
// innan listan är fylld, så en tom lista direkt betyder inte att lobbyn saknas.
const SETTLE_MS = 1500

// Är någon värd i närvarolistan? Närvaron är en lista per spelare med deras uppgifter.
export function hasHost(presence: Record<string, readonly { host?: boolean }[]>): boolean {
  return Object.values(presence).some((metas) => metas.some((meta) => meta?.host === true))
}

// Texten när koden inte går att använda.
export function felText(code: string, result: Exclude<LobbyKoll, 'finns'>): string {
  return result === 'saknas'
    ? `Ingen lobby med koden ${code}. Kolla koden eller be värden om en ny.`
    : 'Det gick inte att kontrollera koden. Försök igen.'
}

export function checkLobby(code: string): Promise<LobbyKoll> {
  return new Promise((resolve) => {
    const channel = supabase.channel(`lobby:${code}`, { config: { presence: { key: `koll-${crypto.randomUUID()}` } } })
    let done = false
    let settle: ReturnType<typeof setTimeout> | undefined
    const finish = (result: LobbyKoll) => {
      if (done) return
      done = true
      clearTimeout(timer)
      clearTimeout(settle)
      void supabase.removeChannel(channel)
      resolve(result)
    }
    const timer = setTimeout(() => finish('fel'), TIMEOUT_MS)

    channel.on('presence', { event: 'sync' }, () => {
      if (hasHost(channel.presenceState<{ host?: boolean }>())) {
        clearTimeout(settle)
        finish('finns')
      }
    })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer)
        // Dyker ingen värd upp inom stunden finns ingen lobby med koden.
        settle = setTimeout(() => finish('saknas'), SETTLE_MS)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(settle)
        finish('fel')
      }
    })
  })
}
