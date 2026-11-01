import { registerSW } from 'virtual:pwa-register'
import { entryScript, isNewerBuild, markUpdatePending, shouldReloadAfterLoadError, shouldReloadFor } from '@/lib/uppdatering'

const DAY_MS = 24 * 60 * 60 * 1000
const RELOADED_FOR_KEY = 'kd-laddade-om-for'
const LOAD_ERROR_KEY = 'kd-laddade-om-vid-fel'

// När sidan senast laddades om efter ett laddningsfel. undefined = det går inte att läsa eller spara i fliken.
function lastLoadErrorReload(): number | null | undefined {
  try {
    const saved = sessionStorage.getItem(LOAD_ERROR_KEY)
    return saved === null ? null : Number(saved)
  } catch {
    return undefined
  }
}

// Vite säger till när en del av sajten inte gick att ladda. Laddas sidan inte om visas felgränsen (FelGrans) som vanligt.
function reloadOnLoadError() {
  window.addEventListener('vite:preloadError', () => {
    const now = Date.now()
    if (!shouldReloadAfterLoadError({ pathname: location.pathname, online: navigator.onLine, now, lastReloadAt: lastLoadErrorReload() })) return
    try {
      sessionStorage.setItem(LOAD_ERROR_KEY, String(now))
    } catch {
      return
    }
    location.reload()
  })
}

function reloadedFor(): string | null {
  try {
    return sessionStorage.getItem(RELOADED_FOR_KEY)
  } catch {
    return null
  }
}

function rememberReload(latest: string) {
  try {
    sessionStorage.setItem(RELOADED_FOR_KEY, latest)
  } catch {
    // Går det inte att spara kan vi inte skydda oss mot en loop, så då laddas sidan inte om alls.
  }
}

// Jämför sidans huvudskript med det som ligger ute. Frågetecknet gör att frågan går till nätet och inte till service
// workerns sparade appskal. Utan nät händer inget, då kollas det igen senare.
async function checkForNewBuild() {
  try {
    const response = await fetch(`/app.html?v=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return
    const running = document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null
    const latest = entryScript(await response.text())
    if (!latest || !isNewerBuild(running, latest) || !shouldReloadFor(latest, reloadedFor())) return
    rememberReload(latest)
    if (reloadedFor() === latest) markUpdatePending()
  } catch {
    // Inget nät.
  }
}

// Registrerar service workern och kollar efter en ny version när sidan öppnas, när fliken blir synlig igen, när
// webbläsaren tar fram en sparad sida och annars en gång per dygn. Se uppdatering.ts för vad som händer sedan.
export function startPwa() {
  reloadOnLoadError()
  registerSW({
    immediate: true,
    // Utan den här laddar pluginet om sidan direkt, även mitt i en match.
    onNeedReload: () => void checkForNewBuild(),
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const look = () => {
        registration.update().catch(() => {})
        void checkForNewBuild()
      }
      look()
      setInterval(look, DAY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') look()
      })
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) look()
      })
    },
  })
}
