import { useSyncExternalStore } from 'react'
import { getMusicVolume, subscribeMusicVolume } from '@/lib/tantmusik'

// Musikens volym (0–1), samma överallt: ändras den i ett reglage följer alla andra och musiken med.
export function useMusicVolume(): number {
  return useSyncExternalStore(subscribeMusicVolume, getMusicVolume, getMusicVolume)
}
