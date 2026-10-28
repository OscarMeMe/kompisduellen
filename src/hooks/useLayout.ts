import { useOutletContext } from 'react-router'

export type LayoutContext = {
  // Under en match döljs menyn och loggan går inte att klicka på, så att ingen lämnar
  // lobbyn av misstag. Lämnar värden försvinner lobbyn för alla.
  setInMatch: (inMatch: boolean) => void
  // Värden med andra i lobbyn får en fråga innan hen lämnar. Med en vakt går klick på loggan och profilen dit i
  // stället för att lämna sidan. null = ingen vakt.
  setLeaveGuard: (guard: ((to: string) => void) | null) => void
}

// Det som sidorna kan ändra i Layout (sidhuvudet).
export function useLayout() {
  return useOutletContext<LayoutContext>()
}
