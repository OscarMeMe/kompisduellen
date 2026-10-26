import { describe, expect, it, vi } from 'vitest'
import { copyInvite, inviteLink, shareInvite, shareMessage } from '@/lib/inbjudan'

const LINK = 'https://kompisduellen.vercel.app/lobby/ABCD'
const DATA = { title: 'Kompisduellen', text: 'Häng med!', url: LINK }

function abort() {
  const error = new Error('Avbruten')
  error.name = 'AbortError'
  return error
}

describe('inbjudningslänken', () => {
  it('för med sig koden', () => {
    expect(inviteLink('https://kompisduellen.vercel.app', 'ABCD')).toBe(LINK)
  })
})

describe('Dela', () => {
  it('skickar inbjudningslänken till enhetens delningsfunktion', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const copy = vi.fn()
    expect(await shareInvite(DATA, { share, copy })).toBe('delad')
    expect(share).toHaveBeenCalledWith(DATA)
    expect(copy).not.toHaveBeenCalled()
  })

  it('kopierar länken när delning inte stöds', async () => {
    const copy = vi.fn().mockResolvedValue(undefined)
    expect(await shareInvite(DATA, { copy })).toBe('kopierad')
    expect(copy).toHaveBeenCalledWith(LINK)
  })

  it('gör ingenting när man avbryter delningen', async () => {
    const share = vi.fn().mockRejectedValue(abort())
    const copy = vi.fn()
    const result = await shareInvite(DATA, { share, copy })
    expect(result).toBe('avbruten')
    expect(copy).not.toHaveBeenCalled()
    expect(shareMessage(result)).toBeNull()
  })

  it('kopierar i stället när delningen misslyckas av andra skäl', async () => {
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    const copy = vi.fn().mockResolvedValue(undefined)
    expect(await shareInvite(DATA, { share, copy })).toBe('kopierad')
  })

  it('visar bara bekräftelse när kopieringen lyckades', async () => {
    const ok = await copyInvite(LINK, vi.fn().mockResolvedValue(undefined))
    const blocked = await copyInvite(LINK, vi.fn().mockRejectedValue(new Error('blockerat')))
    // Urklippet saknas helt: anropet kastar direkt.
    const missing = await copyInvite(LINK, () => {
      throw new TypeError('clipboard is undefined')
    })
    expect(shareMessage(ok)).toBe('Länken är kopierad')
    expect(shareMessage(blocked)).toBe('Kunde inte kopiera. Be kompisarna skriva koden i stället.')
    expect(shareMessage(missing)).toBe('Kunde inte kopiera. Be kompisarna skriva koden i stället.')
    expect(shareMessage('delad')).toBeNull()
  })
})
