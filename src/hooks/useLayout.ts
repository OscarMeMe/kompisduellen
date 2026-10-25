import { useOutletContext } from 'react-router'

export type LayoutContext = {
  // Under en match döljs menyn och loggan går inte att klicka på, så att ingen lämnar
  // lobbyn av misstag. Lämnar värden försvinner lobbyn för alla.
  setInMatch: (inMatch: boolean) => void
}

// Det som sidorna kan ändra i Layout (sidhuvudet).
export function useLayout() {
  return useOutletContext<LayoutContext>()
}
