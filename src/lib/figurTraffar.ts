// Vilka figurer i väntrummet som just träffats av ett kast. Figuren reagerar när kastet landar och inte när det skickas,
// flera kast i rad startar om rörelsen och tiden, och den som lämnat eller inte tar emot kast reagerar inte.

import { IMPACT_MS } from '@/lib/kast'

// Så länge står figuren kvar som träffad efter att kastet landat (ms).
export const HIT_VISIBLE_MS = 1200

// Spelarens id och numret på senaste träffen. Ett nytt nummer startar om rörelsen.
export type FigureHits = Record<string, number>

export type HitTracker = {
  // Ett kast är på väg mot spelaren. canHit frågas när det landar: tar spelaren fortfarande emot kast?
  thrown: (id: string, canHit: () => boolean) => void
  // De spelare som kan träffas just nu. Alla andras träffar och väntande kast tas bort.
  sync: (ids: readonly string[]) => void
  // Tar bort en spelares träff och väntande kast.
  clear: (id: string) => void
  // Städar bort alla timers.
  stop: () => void
}

export function createHitTracker(onChange: (hits: FigureHits) => void): HitTracker {
  const landing = new Map<string, Set<ReturnType<typeof setTimeout>>>()
  const ending = new Map<string, ReturnType<typeof setTimeout>>()
  let hits: FigureHits = {}
  let seq = 0

  function setHit(id: string, value: number | null) {
    const { [id]: _old, ...rest } = hits
    hits = value === null ? rest : { ...rest, [id]: value }
    onChange(hits)
  }

  function land(id: string) {
    clearTimeout(ending.get(id))
    seq += 1
    setHit(id, seq)
    ending.set(
      id,
      setTimeout(() => {
        ending.delete(id)
        setHit(id, null)
      }, HIT_VISIBLE_MS),
    )
  }

  function clear(id: string) {
    for (const timer of landing.get(id) ?? []) clearTimeout(timer)
    landing.delete(id)
    clearTimeout(ending.get(id))
    ending.delete(id)
    if (hits[id] !== undefined) setHit(id, null)
  }

  return {
    thrown(id, canHit) {
      const timers = landing.get(id) ?? new Set()
      landing.set(id, timers)
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (canHit()) land(id)
      }, IMPACT_MS)
      timers.add(timer)
    },
    sync(ids) {
      for (const id of new Set([...landing.keys(), ...ending.keys()])) {
        if (!ids.includes(id)) clear(id)
      }
    },
    clear,
    stop() {
      for (const timers of landing.values()) for (const timer of timers) clearTimeout(timer)
      for (const timer of ending.values()) clearTimeout(timer)
      landing.clear()
      ending.clear()
    },
  }
}
