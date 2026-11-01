import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { isUpdatePending, subscribeUpdate, updateAction } from '@/lib/uppdatering'

// Laddar om sidan när det finns en ny version och man inte är i en lobby. Är man i en lobby visar Layout en rad
// (showNotice), och omladdningen sker när man lämnat lobbyn.
export function useAppUpdate() {
  const pending = useSyncExternalStore(subscribeUpdate, isUpdatePending, () => false)
  const { pathname } = useLocation()
  const action = updateAction(pending, pathname)

  useEffect(() => {
    if (action === 'reload') window.location.reload()
  }, [action])

  return { showNotice: action === 'notice' }
}
