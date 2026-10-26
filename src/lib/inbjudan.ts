// Inbjudan till en lobby: länken och vad som händer när man delar den.
// Rena funktioner, så att alla utfall (delad, avbruten, kopierad, misslyckad) går att testa.

// Länken för med sig koden, så att gästen slipper skriva den.
export function inviteLink(origin: string, code: string): string {
  return `${origin}/lobby/${code}`
}

export type ShareResult = 'delad' | 'avbruten' | 'kopierad' | 'kopiering-misslyckades'

type ShareDeps = {
  // Enhetens delningsfunktion (navigator.share). Saknas den kopieras länken i stället.
  share?: (data: ShareData) => Promise<void>
  copy: (text: string) => Promise<void>
}

export async function copyInvite(link: string, copy: ShareDeps['copy']): Promise<ShareResult> {
  try {
    await copy(link)
    return 'kopierad'
  } catch {
    return 'kopiering-misslyckades'
  }
}

// Delar länken med enhetens delningsfunktion där den finns, annars kopieras den.
// Avbryter man delningen händer ingenting. Andra fel: kopiera i stället.
export async function shareInvite(data: ShareData & { url: string }, deps: ShareDeps): Promise<ShareResult> {
  if (!deps.share) return copyInvite(data.url, deps.copy)
  try {
    await deps.share(data)
    return 'delad'
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') return 'avbruten'
    return copyInvite(data.url, deps.copy)
  }
}

// Återkopplingen under knapparna. Delning och avbrott har ingen egen bekräftelse:
// enhetens delningsruta visar själv vad som hände.
export function shareMessage(result: ShareResult): string | null {
  if (result === 'kopierad') return 'Länken är kopierad'
  if (result === 'kopiering-misslyckades') return 'Kunde inte kopiera. Be kompisarna skriva koden i stället.'
  return null
}
