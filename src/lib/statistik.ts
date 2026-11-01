import type { PostHog } from 'posthog-js'

// Besöksstatistik med PostHog (EU). Utan nyckel görs ingenting och appen fungerar som vanligt.
// Inga kakor och inget sparas i webbläsaren (persistence: 'memory'), så varje sidladdning får ett nytt
// anonymt id. Skicka aldrig namn, figurer eller annat personligt, bara spel och antal.
// PostHog laddas för sig efter appen. Stoppas det (t.ex. av en annonsblockerare) märks ingenting.
// Testmatcher ska inte synas i statistiken: inget skickas lokalt, från en automatiserad webbläsare eller när
// kd-ingen-statistik är satt i localStorage (för en testrobot som körs mot den riktiga sajten).

const key = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_HOST

const OPT_OUT_KEY = 'kd-ingen-statistik'

let client: Promise<PostHog | null> | null = null

export function statistikAllowed(input: { hostname: string; dev: boolean; webdriver: boolean; optedOut: boolean }): boolean {
  const { hostname, dev, webdriver, optedOut } = input
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost')
  return !local && !dev && !webdriver && !optedOut
}

function optedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== null
  } catch {
    return false
  }
}

export function startStatistik() {
  if (client || !key || !host) return
  const allowed = statistikAllowed({
    hostname: location.hostname,
    dev: import.meta.env.DEV,
    webdriver: navigator.webdriver,
    optedOut: optedOut(),
  })
  if (!allowed) return
  client = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        persistence: 'memory',
        person_profiles: 'identified_only',
        // Sidvisningar även när man byter sida inom appen.
        capture_pageview: 'history_change',
        // Klick och sessionsinspelning kan få med namn som syns på sidan, så de är avstängda.
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
      })
      return posthog
    })
    .catch(() => null)
}

type Events = {
  lobby_skapad: { spel: string }
  lobby_gick_med: { spel: string }
  match_startad: { spel: string; antal_spelare: number; antal_rundor: number }
  match_avslutad: { spel: string; antal_spelare: number; antal_rundor: number; langd_sekunder: number }
  spelade_igen: { spel: string }
  bytte_spel: { fran_spel: string; till_spel: string }
}

export function track<E extends keyof Events>(event: E, properties: Events[E]) {
  void client?.then((posthog) => posthog?.capture(event, properties))
}
