// Statusraderna medan domaren väljer vinnare. En ny rad var fjärde sekund. Raderna säger aldrig något om vilket kort
// domaren tittar på eller vem som spelade vad.
export const WAITING_LINES = [
  'Domaren har tappat tron på mänskligheten.',
  'Det här kommer bli svårt att förklara för mamma.',
  'Någon kommer behöva förklara sig efter matchen.',
  'Domaren läser tyst och rör på läpparna.',
  'Domaren överväger att byta kompisar.',
  'Domaren har bett om betänketid och en kopp kaffe.',
  'Juryn i Melodifestivalen hade varit snabbare.',
  'Domaren försöker hålla masken. Det går sådär.',
  'Inget av det här går att skriva i släktchatten.',
  'Domaren väger humor mot anständighet. Humorn leder.',
  'Domaren har läst alla kort och börjar om från början.',
  'Domaren behöver en stund. Och kanske en terapeut.',
  'Ingen lämnar rummet förrän det här är avgjort.',
  'Någon här borde skämmas, och alla vet vem.',
  'Domaren vill bara säga att ni alla är fruktansvärda.',
]

export const WAITING_LINE_MS = 4000

// Raden som visas, given hur många gånger den har bytts. Rundan avgör var listan börjar, så att det inte alltid
// börjar med samma rad.
export function waitingLine(round: number, tick: number): string {
  return WAITING_LINES[(round * 5 + tick) % WAITING_LINES.length]
}
