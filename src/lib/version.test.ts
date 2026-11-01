import { describe, expect, it } from 'vitest'
import { APP_VERSION, versionStatus } from '@/lib/version'

describe('versionStatus', () => {
  const guest = { isHost: false, mine: 5, hostVersion: 5, guestVersions: [] }
  const host = { isHost: true, mine: 5, hostVersion: null, guestVersions: [] }

  it('samma version som värden går bra', () => {
    expect(versionStatus(guest)).toBe('ok')
  })

  it('en gäst med äldre version än värden ska ladda om', () => {
    expect(versionStatus({ ...guest, hostVersion: 6 })).toBe('reload')
  })

  it('en gäst med nyare version än värden väntar, eftersom en omladdning inte hjälper', () => {
    expect(versionStatus({ ...guest, hostVersion: 4 })).toBe('wait')
  })

  it('en värd utan version (äldre sajt) går inte att avgöra, så gästen spärras inte', () => {
    expect(versionStatus({ ...guest, hostVersion: null })).toBe('ok')
  })

  it('värden ska ladda om när någon gäst har en nyare version', () => {
    expect(versionStatus(host)).toBe('ok')
    expect(versionStatus({ ...host, guestVersions: [5, 5] })).toBe('ok')
    expect(versionStatus({ ...host, guestVersions: [5, 6] })).toBe('reload')
  })

  it('värden behöver inte göra något när en gäst har en äldre version', () => {
    expect(versionStatus({ ...host, guestVersions: [3] })).toBe('ok')
  })

  it('appen har ett versionsnummer', () => {
    expect(APP_VERSION).toBeGreaterThan(0)
  })
})
