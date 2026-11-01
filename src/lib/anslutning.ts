import type { GameState } from '@/lib/match'

// Anslutningen till en lobby: hur kanaler öppnas och stängs, när en gäst frågar värden efter läget igen (hello),
// vad som händer när fliken syns igen eller nätet kommer tillbaka, och vilken status sidan visar.
// Rena funktioner och en liten kö för kanaler som håller på att stängas, så att det mesta går att testa.

// Gästen frågar efter läget igen så här ofta tills tillståndet kommer (ms).
export const HELLO_RETRY_MS = 3000
// Har gästen inte kommit in efter så här lång tid visas ett meddelande med Försök igen (ms).
export const STUCK_AFTER_MS = 12_000
// Har så många hello gått utan svar ansluter gästen på nytt av sig själv, en gång, innan Försök igen visas.
// En kanal kan se öppen ut men vara död (t.ex. efter en stund i bakgrunden), och då kommer inga hello fram.
export const RECONNECT_AFTER_HELLOS = 2
// Värden skickar läget igen högst så här ofta (ms). Ett meddelande i kanalen kan försvinna utan att anslutningen bryts,
// och då står gästen kvar i ett gammalt läge. Har den som har tur missat det hänger hela matchen, eftersom inget nytt
// läge kommer förrän den spelaren gjort något.
export const STATE_RESEND_MS = 10_000

// Väntar spelet på att någon ska svara? Då får inte ett förlorat läge stå kvar, för då kan matchen hänga sig. Steg som
// värdens klocka eller värdens knapp för vidare (frågekortet, facit, väntrummet) väntar inte på någon annan.
export function awaitsAnswer(state: GameState): boolean {
  if (state.phase === 'guessing') return true
  if (state.phase !== 'playing') return false
  if (state.imposter) return state.imposter.step !== 'facit'
  return state.cards?.step === 'choosing' || state.cards?.step === 'judging'
}

// Ska värden skicka läget igen nu? Bara till andra, inte oftare än STATE_RESEND_MS, och bara om spelet väntar på ett svar
// eller om läget ändrats och inte skickats igen än. En kvittens från varje gäst skulle kosta fler meddelanden än det
// sparar, så en gäst säger bara till när den märker att den saknar något (hello, ett drag som skickas igen).
export function shouldResendState(input: { awaiting: boolean; changed: boolean; others: boolean; now: number; lastSentAt: number }): boolean {
  const { awaiting, changed, others, now, lastSentAt } = input
  return others && (awaiting || changed) && now - lastSentAt >= STATE_RESEND_MS
}

// Läget säger vilket nummer min senaste hand eller mitt senaste kort har. Har jag inte det numret saknar jag den.
export function handIsMissing(expected: number | undefined, mine: number | null): boolean {
  return expected !== undefined && expected !== mine
}

// Samma innehåll som gästen redan har? Då behöver inget ritas om, och klockan ska inte heller ändras.
export function isSameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// supabase.channel() ger tillbaka en befintlig kanal med samma namn, även en som håller på att stängas.
// Öppnar man lobbyn igen precis då (omladdning, kodkontrollen på startsidan) får man den döende kanalen, som
// aldrig svarar. Därför väntar en ny kanal tills den gamla med samma namn är helt stängd.
export class ClosingChannels {
  private closing = new Map<string, Promise<unknown>>()

  // Registrerar att kanalen med namnet håller på att stängas.
  add(topic: string, done: Promise<unknown>) {
    const settled = done.then(
      () => undefined,
      () => undefined,
    )
    this.closing.set(topic, settled)
    void settled.then(() => {
      if (this.closing.get(topic) === settled) this.closing.delete(topic)
    })
  }

  // Blir klar när ingen kanal med namnet håller på att stängas.
  async wait(topic: string): Promise<void> {
    let pending = this.closing.get(topic)
    while (pending) {
      await pending
      const next = this.closing.get(topic)
      pending = next === pending ? undefined : next
    }
  }

  isClosing(topic: string): boolean {
    return this.closing.has(topic)
  }
}

export type LobbyStatus = 'connecting' | 'ready' | 'no-host' | 'error' | 'stuck'

export type StatusInput = {
  isHost: boolean
  failed: boolean
  connected: boolean
  received: boolean
  hostOnline: boolean
  // Ingen värd har synts på en stund efter anslutningen.
  graceOver: boolean
  // Gästen har försökt komma in längre än STUCK_AFTER_MS.
  waitedTooLong: boolean
}

// Vad lobbysidan ska visa.
export function lobbyStatus(input: StatusInput): LobbyStatus {
  const { isHost, failed, connected, received, hostOnline, graceOver, waitedTooLong } = input
  if (failed) return 'error'
  if (connected && (isHost || (hostOnline && received))) return 'ready'
  // Jag har ett tillstånd men värden är borta: någon tar över strax.
  if (!isHost && connected && received) return 'ready'
  // Kopplingen byts (t.ex. när jag tar över som värd): vyn ligger kvar så länge jag har ett tillstånd.
  if (!connected && received) return 'ready'
  if (connected && graceOver && !hostOnline) return 'no-host'
  return waitedTooLong ? 'stuck' : 'connecting'
}

// Gästen ska fråga värden efter läget igen: ansluten, men inget tillstånd ännu.
export function shouldRetryHello(input: { isHost: boolean; connected: boolean; received: boolean }): boolean {
  return !input.isHost && input.connected && !input.received
}

// Gästen har skickat tries hello utan att få något tillstånd. Efter RECONNECT_AFTER_HELLOS försök ansluter den på
// nytt (en gång per försök att komma in), annars frågar den igen.
export function helloRetryAction(input: { tries: number; autoReconnected: boolean }): 'hello' | 'reconnect' {
  return input.tries >= RECONNECT_AFTER_HELLOS && !input.autoReconnected ? 'reconnect' : 'hello'
}

// Fliken syns igen eller nätet kom tillbaka. Är kanalen stängd eller trasig görs en ny anslutning. En gäst som inte
// kommit in än (inget tillstånd) ansluter också på nytt, eftersom kanalen kan se öppen ut men vara död efter en stund
// i bakgrunden. Annars frågar gästen efter läget igen, eftersom meddelanden kan ha missats.
// channelState är kanalens läge (joined, joining, leaving, closed, errored), null medan en ny kanal väntar på att öppnas.
export function wakeAction(input: {
  isHost: boolean
  channelState: string | null
  received: boolean
}): 'reconnect' | 'hello' | null {
  const { isHost, channelState, received } = input
  if (channelState === 'closed' || channelState === 'errored' || channelState === 'leaving') return 'reconnect'
  if (isHost || channelState === null) return null
  return received ? 'hello' : 'reconnect'
}
