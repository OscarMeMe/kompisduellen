import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { pageMeta, renderHeadTags } from '@/lib/sidinfo'

// Byter titel, beskrivning, kanonisk adress, Open Graph och strukturerad data i <head> när man går till en annan sida.
// Allt mellan <!-- sidinfo --> och <!-- /sidinfo --> i index.html ersätts med taggarna för den nya sidan.
export function usePageMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const nodes = Array.from(document.head.childNodes)
    const start = nodes.find((node) => node.nodeType === Node.COMMENT_NODE && node.nodeValue?.trim() === 'sidinfo')
    const end = nodes.find((node) => node.nodeType === Node.COMMENT_NODE && node.nodeValue?.trim() === '/sidinfo')
    if (!start || !end) return
    while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove()
    const tags = document.createRange().createContextualFragment(`\n${renderHeadTags(pageMeta(pathname))}\n    `)
    document.head.insertBefore(tags, end)
  }, [pathname])
}
