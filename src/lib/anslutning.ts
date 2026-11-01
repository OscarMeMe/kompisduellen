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
// Värden skickar läget igen så här ofta (ms). Ett meddelande i kanalen kan försvinna utan att anslutningen bryts, och
// då står gästen kvar i ett gammalt läge. Har den som har tur missat det hänger hela matchen, eftersom inget nytt
// läge kommer förrän den spelaren gjort något.
export const STATE_RESEND_MS = 5000
// Händerna och korten skickas igen vart fjärde varv. De är fler meddelanden och ändras sällan.
export const HANDS_RESEND_EVERY = 4

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
