import { describe, expect, it } from 'vitest'
import { entryScript, isLobbyPath, isNewerBuild, LOAD_ERROR_RELOAD_PAUSE_MS, shouldReloadAfterLoadError, shouldReloadFor, updateAction } from './uppdatering'

describe('isLobbyPath', () => {
  it('känner igen lobbyn och sökvägarna som skickar vidare dit', () => {
    expect(isLobbyPath('/lobby/ABCD')).toBe(true)
    expect(isLobbyPath('/lobby/ABCD/')).toBe(true)
    expect(isLobbyPath('/spel/ABCD')).toBe(true)
    expect(isLobbyPath('/resultat/ABCD')).toBe(true)
  })

  it('räknar inte startsidan, spelsidorna eller andra sidor som lobby', () => {
    for (const path of [
      '/',
      '/spel/gissa-priset',
      '/spel/narmast-vinner',
      '/spel/kortkaos',
      '/spel/imposterjakten',
      '/skapa',
      '/ga-med',
      '/profil',
    ]) {
      expect(isLobbyPath(path)).toBe(false)
    }
  })
})

describe('updateAction', () => {
  it('gör inget utan en ny version', () => {
    expect(updateAction(false, '/')).toBe('none')
    expect(updateAction(false, '/lobby/ABCD')).toBe('none')
  })

  it('laddar om utanför en lobby', () => {
    for (const path of ['/', '/spel/kortkaos', '/skapa', '/ga-med', '/profil']) {
      expect(updateAction(true, path)).toBe('reload')
    }
  })

  it('laddar aldrig om i en lobby, utan visar raden', () => {
    expect(updateAction(true, '/lobby/ABCD')).toBe('notice')
  })
})

describe('entryScript', () => {
  it('hittar huvudskriptet i en byggd sida', () => {
    const html = `<head>
      <script defer src="/_vercel/insights/script.js"></script>
      <script type="module" crossorigin src="/assets/index-AbC123.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/react-XyZ.js">
    </head>`
    expect(entryScript(html)).toBe('/assets/index-AbC123.js')
  })

  it('ger null när det inte finns något', () => {
    expect(entryScript('<html><script type="module">inline()</script></html>')).toBeNull()
    expect(entryScript('')).toBeNull()
  })
})

describe('shouldReloadAfterLoadError', () => {
  const input = { pathname: '/skapa', online: true, now: LOAD_ERROR_RELOAD_PAUSE_MS * 2, lastReloadAt: null }

  it('laddar om en gång när en fil saknas', () => {
    expect(shouldReloadAfterLoadError(input)).toBe(true)
  })

  it('laddar aldrig om i en lobby', () => {
    expect(shouldReloadAfterLoadError({ ...input, pathname: '/lobby/ABCD' })).toBe(false)
    expect(shouldReloadAfterLoadError({ ...input, pathname: '/spel/ABCD' })).toBe(false)
    expect(shouldReloadAfterLoadError({ ...input, pathname: '/spel/kortkaos' })).toBe(true)
  })

  it('blir aldrig en slinga: inte igen direkt efter en omladdning', () => {
    expect(shouldReloadAfterLoadError({ ...input, lastReloadAt: input.now - 1000 })).toBe(false)
    expect(shouldReloadAfterLoadError({ ...input, lastReloadAt: input.now - LOAD_ERROR_RELOAD_PAUSE_MS })).toBe(true)
  })

  it('laddar inte om utan nät, eller om det inte går att komma ihåg omladdningen', () => {
    expect(shouldReloadAfterLoadError({ ...input, online: false })).toBe(false)
    expect(shouldReloadAfterLoadError({ ...input, lastReloadAt: undefined })).toBe(false)
  })
})

describe('shouldReloadFor', () => {
  it('laddar om en gång per version, så att det aldrig blir en loop', () => {
    expect(shouldReloadFor('/assets/b.js', null)).toBe(true)
    expect(shouldReloadFor('/assets/b.js', '/assets/a.js')).toBe(true)
    expect(shouldReloadFor('/assets/b.js', '/assets/b.js')).toBe(false)
  })
})

describe('isNewerBuild', () => {
  it('är sant bara när båda är kända och olika', () => {
    expect(isNewerBuild('/assets/a.js', '/assets/b.js')).toBe(true)
    expect(isNewerBuild('/assets/a.js', '/assets/a.js')).toBe(false)
    expect(isNewerBuild(null, '/assets/b.js')).toBe(false)
    expect(isNewerBuild('/assets/a.js', null)).toBe(false)
  })
})
