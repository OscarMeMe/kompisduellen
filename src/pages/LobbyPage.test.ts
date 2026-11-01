import { describe, expect, it } from 'vitest'

// En ny publicering tar bort de gamla filerna. Lobbyn ska därför ha allt den behöver i samma fil som lobbysidan, så att
// ett spelbyte mitt under en spelkväll aldrig behöver hämta något nytt från servern.
const sources = import.meta.glob(
  [
    '/src/pages/LobbyPage.tsx',
    '/src/hooks/useLobby.ts',
    '/src/components/{lobby,narmast,gissa-priset,kortkaos,imposterjakten,kort}/**/*.{ts,tsx}',
    '!**/*.test.*',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

describe('lobbyns filer', () => {
  it('inget i lobbyn och spelvyerna laddas först när det behövs', () => {
    const files = Object.keys(sources)
    expect(files.length).toBeGreaterThan(20)
    expect(files.filter((file) => /\blazy\(|\bimport\(/.test(sources[file]))).toEqual([])
  })
})
