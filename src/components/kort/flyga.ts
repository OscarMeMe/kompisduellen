// Ett valt kort som glider upp och landar i frågans lucka. En kopia av kortet läggs över sidan och animeras med
// webbläsarens egen element.animate (inga paket), och tas bort när den har landat. Bara på dator (lg), och inte alls
// med "reducerad rörelse". Där syns valet bara i luckan.

const DESKTOP = '(min-width: 1024px)'
const REDUCED = '(prefers-reduced-motion: reduce)'
const DURATION_MS = 230

export function flyToGap(from: HTMLElement, to: HTMLElement | null) {
  if (!to || typeof window.matchMedia !== 'function') return
  if (!window.matchMedia(DESKTOP).matches || window.matchMedia(REDUCED).matches) return
  const start = from.getBoundingClientRect()
  const end = to.getBoundingClientRect()
  // Kortets egen storlek, utan solfjäderns lutning.
  const width = from.offsetWidth
  const height = from.offsetHeight
  const clone = from.cloneNode(true) as HTMLElement
  clone.setAttribute('aria-hidden', 'true')
  clone.removeAttribute('id')
  clone.tabIndex = -1
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${start.left + start.width / 2 - width / 2}px`,
    top: `${start.top + start.height / 2 - height / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    margin: '0',
    zIndex: '60',
    pointerEvents: 'none',
    transform: 'none',
  })
  document.body.appendChild(clone)
  const dx = end.left + end.width / 2 - (start.left + start.width / 2)
  const dy = end.top + end.height / 2 - (start.top + start.height / 2)
  const scale = Math.max(0.35, Math.min(1, end.width / width))
  const animation = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1.05)', opacity: 1 },
      { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.7 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    ],
    { duration: DURATION_MS, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' },
  )
  const remove = () => clone.remove()
  animation.onfinish = remove
  animation.oncancel = remove
}
