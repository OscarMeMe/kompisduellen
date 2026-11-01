// Vilken version av sajten fliken kör. Numret är tiden när sajten byggdes, så en högre siffra är en nyare version.
// Publiceras en ny version medan en lobby är igång kan flikarna köra olika versioner, och då kan de inte spela ihop.
// Därför skickar värden sin version med läget, och gästerna sin i hello.

const TEST_KEY = 'kd-testversion'

// Bara med dev-servern: /lobby/KOD?version=1 låtsas att fliken har en annan version, för att prova beskedet.
function devOverride(): number | null {
  if (!import.meta.env.DEV) return null
  try {
    const fromUrl = new URLSearchParams(location.search).get('version')
    if (fromUrl) sessionStorage.setItem(TEST_KEY, fromUrl)
    const saved = sessionStorage.getItem(TEST_KEY)
    return saved ? Number(saved) : null
  } catch {
    return null
  }
}

export const APP_VERSION: number = devOverride() ?? __APP_VERSION__

// ok: alla kör samma version, eller så går det inte att avgöra. reload: jag har den äldre versionen och ska ladda om.
// wait: värden har den äldre versionen, så en omladdning hjälper inte mig. Det är värden som ska ladda om.
export type VersionStatus = 'ok' | 'reload' | 'wait'

// hostVersion saknas hos en värd med en äldre version av sajten, som inte skickar någon. Då går det inte att avgöra.
export function versionStatus(input: {
  isHost: boolean
  mine: number
  hostVersion: number | null
  guestVersions: readonly number[]
}): VersionStatus {
  const { isHost, mine, hostVersion, guestVersions } = input
  if (isHost) return guestVersions.some((version) => version > mine) ? 'reload' : 'ok'
  if (hostVersion === null || hostVersion === mine) return 'ok'
  return hostVersion > mine ? 'reload' : 'wait'
}

// Ladda om för att få den nya versionen. Lobbykoden står i adressen, och spelaren och värdens tillstånd ligger kvar i fliken.
export function reloadForNewVersion() {
  if (import.meta.env.DEV) {
    try {
      sessionStorage.removeItem(TEST_KEY)
    } catch {
      // Då står testversionen kvar.
    }
    location.replace(location.pathname)
    return
  }
  location.reload()
}
