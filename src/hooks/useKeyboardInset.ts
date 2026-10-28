import { useEffect, useState } from 'react'

// Hur många pixlar mobilens tangentbord (eller annat) täcker längst ner på sidan. Används för att lyfta
// en fast panel ovanför tangentbordet. Webbläsare som själva krymper sidan när tangentbordet öppnas ger 0.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)))
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
