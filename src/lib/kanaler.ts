// Öppna och stäng Realtime-kanaler utan att få en kanal som håller på att stängas (se ClosingChannels i anslutning.ts).
// Används av lobbyn (useLobby) och kodkontrollen (lobbykoll), som båda använder kanalen lobby:KOD.

import type { RealtimeChannel } from '@supabase/supabase-js'
import { ClosingChannels } from '@/lib/anslutning'
import { supabase } from '@/lib/supabase'

const closing = new ClosingChannels()

// Blir klar när ingen kanal med namnet (t.ex. lobby:ABCD) håller på att stängas.
export function waitForChannel(name: string): Promise<void> {
  return closing.wait(`realtime:${name}`)
}

// Stänger kanalen. En ny kanal med samma namn väntar tills den är helt stängd.
export function closeChannel(channel: RealtimeChannel) {
  closing.add(channel.topic, supabase.removeChannel(channel))
}
