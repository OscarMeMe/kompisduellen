// Nya versioner av sajten. När det finns en ny version säger pwa.ts till här. Vad som händer sedan beror på var man
// är: utanför en lobby laddas sidan om direkt, i en lobby först när man lämnat den.

export type UpdateAction = 'none' | 'reload' | 'notice'

// Lobbyn och sökvägarna som skickar vidare dit. Spelsidorna (/spel/kortkaos) räknas inte, lobbykoder har fyra tecken.
export function isLobbyPath(pathname: string): boolean {
  return /^\/(lobby|resultat)\/[^/]+\/?$/.test(pathname) || /^\/spel\/[^/]{4}\/?$/.test(pathname)
}

export function updateAction(pending: boolean, pathname: string): UpdateAction {
  if (!pending) return 'none'
  return isLobbyPath(pathname) ? 'notice' : 'reload'
}

// Sajtens huvudskript i en HTML-sida. Filnamnet innehåller en hash, så det byts vid varje ny version.
export function entryScript(html: string): string | null {
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    if (!/\btype=["']module["']/.test(tag)) continue
    const src = tag.match(/\bsrc=["']([^"']+)["']/)
    if (src) return src[1]
  }
  return null
}

// Kör sidan en annan version än den som ligger ute? Går det inte att avgöra räknas det som nej, så att ingen sida
// laddas om i onödan. Då kollas det igen nästa gång.
export function isNewerBuild(running: string | null, latest: string | null): boolean {
  return running !== null && latest !== null && running !== latest
}

let pending = false
const listeners = new Set<() => void>()

export function markUpdatePending() {
  if (pending) return
  pending = true
  listeners.forEach((listener) => listener())
}

export function subscribeUpdate(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isUpdatePending() {
  return pending
}
