import { useEffect } from 'react'

// Ber sökmotorerna att inte visa sidan i sökresultaten (<meta name="robots" content="noindex">) så länge
// komponenten finns. Används av lobbysidan, eftersom en lobby bara lever en kväll. Taggen tas bort när man lämnar.
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}
