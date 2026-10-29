import { useEffect } from 'react'

// Ber telefonen att inte släcka skärmen medan active är sant (Screen Wake Lock). Används för värden under en match,
// eftersom en låst telefon stoppar allt och rundorna då står still för alla. Webbläsaren släpper låset när fliken
// döljs, så det begärs igen när fliken syns. Gör ingenting där det inte stöds (se canKeepScreenOn i device.ts).
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function request() {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // T.ex. lågt batteri eller energisparläge. Då gäller tipset om att hålla skärmen tänd.
      }
    }

    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [active])
}
