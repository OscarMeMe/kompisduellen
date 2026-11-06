// Ett slumpat id i samma form som crypto.randomUUID(). randomUUID finns bara på säkra sidor (https och localhost), så
// när sajten öppnas via datorns adress i nätverket (http://192.168.x.x, t.ex. för att testa på telefonen) byggs id:t av
// crypto.getRandomValues, som finns överallt.
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
