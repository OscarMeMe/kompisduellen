import { createContext, useContext } from 'react'
import type { Splat, Thrown, ThrowItemId } from '@/lib/kast'

// Reaktionerna och kasten på lobbysidan, delade via context (ReactionsProvider i Reactions.tsx), så att väntrummet,
// spelarlistorna och facitvyerna kommer åt dem utan props.

// En reaktion som visas överst på skärmen en kort stund.
// target = den som träffades av ett kast ("Oscar 🍅 → Lisa"). Saknas för vanliga reaktioner.
export type FloatingReaction = { key: string; name: string; emoji: string; target?: string }

// Kasten (kast.ts, Kast.tsx). allowed = värden har inte stängt av dem och fler än en är med. targets = de jag kan
// kasta på just nu. splat = det som splattar mot mig just nu. thrown = det jag nyss kastade (bekräftelsen).
export type Throws = {
  allowed: boolean
  targets: { id: string; name: string; avatar: string }[]
  lastThrowAt: number | null
  throwAt: (to: string, item: ThrowItemId) => void
  acceptsThrows: boolean
  setAcceptsThrows: (on: boolean) => void
  splat: Splat | null
  thrown: Thrown | null
}

export type ReactionsValue = {
  // Reaktioner kan skickas när fler än en är med i lobbyn.
  enabled: boolean
  floating: FloatingReaction[]
  send: (reactionId: string) => void
  throws: Throws
  soundOn: boolean
  setSoundOn: (on: boolean) => void
}

export const ReactionsContext = createContext<ReactionsValue | null>(null)

// Reaktionerna och ljudvalet. null utanför en lobby.
export function useReactions(): ReactionsValue | null {
  return useContext(ReactionsContext)
}

// Kasten för spelarlistorna och splatten. null utanför en lobby.
export function useThrows(): Throws | null {
  return useContext(ReactionsContext)?.throws ?? null
}
