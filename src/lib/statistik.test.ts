import { describe, expect, it } from 'vitest'
import { statistikAllowed } from '@/lib/statistik'

describe('statistikAllowed', () => {
  const live = { hostname: 'kompisduellen.se', dev: false, webdriver: false, optedOut: false }

  it('skickar på den riktiga sajten', () => {
    expect(statistikAllowed(live)).toBe(true)
    expect(statistikAllowed({ ...live, hostname: 'kompisduellen.vercel.app' })).toBe(true)
  })

  it('skickar inget när sajten körs lokalt', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'test.localhost']) {
      expect(statistikAllowed({ ...live, hostname })).toBe(false)
    }
  })

  it('skickar inget från dev-servern, även på en adress i det lokala nätet', () => {
    expect(statistikAllowed({ ...live, hostname: '192.168.1.5', dev: true })).toBe(false)
  })

  it('skickar inget från en automatiserad webbläsare eller en testrobot', () => {
    expect(statistikAllowed({ ...live, webdriver: true })).toBe(false)
    expect(statistikAllowed({ ...live, optedOut: true })).toBe(false)
  })

  it('en sajt som bara liknar localhost räknas inte som lokal', () => {
    expect(statistikAllowed({ ...live, hostname: 'localhost.example.com' })).toBe(true)
  })
})
