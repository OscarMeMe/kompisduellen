import { useLayoutEffect, useRef, useState } from 'react'

// Slutskärmarnas knappar (Revansch, Byt spel, Lämna lobby): får innehållet och knapparna plats på skärmen ligger
// knapparna direkt under innehållet (inline), annars ligger de fast längst ned och sidan skrollar bakom dem.
// mainRef sätts på innehållet (allt ovanför knapparna), buttonsRef på knapparnas rad. buttonsHeight är radens höjd, så
// att sidan kan få lika mycket luft nedtill när raden ligger fast.
export function useButtonsBelowContent() {
  const mainRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const [buttonsHeight, setButtonsHeight] = useState(160)
  const [inline, setInline] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      const main = mainRef.current
      const buttons = buttonsRef.current
      if (!main || !buttons) return
      const height = buttons.offsetHeight
      setButtonsHeight(height)
      // Innehållets nederkant räknat från sidans topp (inte från det som syns just nu), plus knapparna.
      setInline(main.offsetTop + main.offsetHeight + height <= window.innerHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (mainRef.current) observer.observe(mainRef.current)
    if (buttonsRef.current) observer.observe(buttonsRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
    // Raden byter plats i sidan när inline ändras, så den mäts om då.
  }, [inline])

  return { mainRef, buttonsRef, buttonsHeight, inline }
}
