// Anslutningen till en lobby: hur kanaler öppnas och stängs, när en gäst frågar värden efter läget igen (hello),
// vad som händer när fliken syns igen eller nätet kommer tillbaka, och vilken status sidan visar.
// Rena funktioner och en liten kö för kanaler som håller på att stängas, så att det mesta går att testa.

// Gästen frågar efter läget igen så här ofta tills tillståndet kommer (ms).
export const HELLO_RETRY_MS = 3000
// Har gästen inte kommit in efter så här lång tid visas ett meddelande med Försök igen (ms).
export const STUCK_AFTER_MS = 12_000

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

// Fliken syns igen eller nätet kom tillbaka. Är kanalen stängd eller trasig görs en ny anslutning. Annars frågar
// gästen efter läget igen, eftersom meddelanden kan ha missats medan fliken låg i bakgrunden.
// channelState är kanalens läge (joined, joining, leaving, closed, errored), null medan en ny kanal väntar på att öppnas.
export function wakeAction(input: { isHost: boolean; channelState: string | null }): 'reconnect' | 'hello' | null {
  const { isHost, channelState } = input
  if (channelState === 'closed' || channelState === 'errored' || channelState === 'leaving') return 'reconnect'
  return isHost || channelState === null ? null : 'hello'
}
