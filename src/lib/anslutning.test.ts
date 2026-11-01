import { describe, expect, it } from 'vitest'
import {
  ClosingChannels,
  helloRetryAction,
  isSameContent,
  lobbyStatus,
  RECONNECT_AFTER_HELLOS,
  shouldRetryHello,
  wakeAction,
  type StatusInput,
} from '@/lib/anslutning'

describe('kanaler som håller på att stängas', () => {
  it('en ny kanal väntar tills den gamla med samma namn är stängd', async () => {
    const closing = new ClosingChannels()
    let close!: () => void
    closing.add('lobby:ABCD', new Promise<void>((resolve) => (close = resolve)))
    expect(closing.isClosing('lobby:ABCD')).toBe(true)

    let opened = false
    const waiting = closing.wait('lobby:ABCD').then(() => (opened = true))
    await Promise.resolve()
    expect(opened).toBe(false)

    close()
    await waiting
    expect(opened).toBe(true)
    expect(closing.isClosing('lobby:ABCD')).toBe(false)
  })

  it('andra kanalnamn behöver inte vänta', async () => {
    const closing = new ClosingChannels()
    closing.add('lobby:ABCD', new Promise(() => {}))
    await expect(closing.wait('lobby:EFGH')).resolves.toBeUndefined()
  })

  it('en stängning som misslyckas släpper ändå kön', async () => {
    const closing = new ClosingChannels()
    closing.add('lobby:ABCD', Promise.reject(new Error('nätet')))
    await expect(closing.wait('lobby:ABCD')).resolves.toBeUndefined()
    expect(closing.isClosing('lobby:ABCD')).toBe(false)
  })

  it('väntar även in en stängning som börjar medan man väntar', async () => {
    const closing = new ClosingChannels()
    let closeFirst!: () => void
    let closeSecond!: () => void
    closing.add('lobby:ABCD', new Promise<void>((resolve) => (closeFirst = resolve)))
    let opened = false
    const waiting = closing.wait('lobby:ABCD').then(() => (opened = true))
    closing.add('lobby:ABCD', new Promise<void>((resolve) => (closeSecond = resolve)))
    closeFirst()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(opened).toBe(false)
    closeSecond()
    await waiting
    expect(opened).toBe(true)
  })
})

describe('lobbyns status', () => {
  const guest: StatusInput = {
    isHost: false,
    failed: false,
    connected: true,
    received: false,
    hostOnline: true,
    graceOver: false,
    waitedTooLong: false,
  }

  it('gästen ansluter tills tillståndet kommit', () => {
    expect(lobbyStatus(guest)).toBe('connecting')
    expect(lobbyStatus({ ...guest, received: true })).toBe('ready')
  })

  it('visar Försök igen när gästen väntat för länge trots att värden finns', () => {
    expect(lobbyStatus({ ...guest, waitedTooLong: true })).toBe('stuck')
    // Även när kanalen aldrig blev ansluten.
    expect(lobbyStatus({ ...guest, connected: false, waitedTooLong: true })).toBe('stuck')
  })

  it('ingen värd och fel går före', () => {
    expect(lobbyStatus({ ...guest, hostOnline: false, graceOver: true, waitedTooLong: true })).toBe('no-host')
    expect(lobbyStatus({ ...guest, failed: true, waitedTooLong: true })).toBe('error')
  })

  it('med ett tillstånd ligger vyn kvar även när värden eller kopplingen är borta', () => {
    expect(lobbyStatus({ ...guest, received: true, hostOnline: false })).toBe('ready')
    expect(lobbyStatus({ ...guest, received: true, connected: false })).toBe('ready')
  })

  it('värden är redo så fort den är ansluten', () => {
    expect(lobbyStatus({ ...guest, isHost: true, hostOnline: false })).toBe('ready')
    expect(lobbyStatus({ ...guest, isHost: true, connected: false })).toBe('connecting')
  })
})

describe('försök igen', () => {
  it('gästen frågar efter läget igen bara när den är ansluten och saknar tillstånd', () => {
    expect(shouldRetryHello({ isHost: false, connected: true, received: false })).toBe(true)
    expect(shouldRetryHello({ isHost: false, connected: true, received: true })).toBe(false)
    expect(shouldRetryHello({ isHost: false, connected: false, received: false })).toBe(false)
    expect(shouldRetryHello({ isHost: true, connected: true, received: false })).toBe(false)
  })

  it('när fliken syns igen: ny anslutning om kanalen är nere, annars hello från gästen', () => {
    for (const state of ['closed', 'errored', 'leaving']) {
      for (const received of [true, false]) {
        expect(wakeAction({ isHost: false, channelState: state, received })).toBe('reconnect')
        expect(wakeAction({ isHost: true, channelState: state, received })).toBe('reconnect')
      }
    }
    expect(wakeAction({ isHost: false, channelState: 'joined', received: true })).toBe('hello')
    expect(wakeAction({ isHost: false, channelState: 'joining', received: true })).toBe('hello')
    expect(wakeAction({ isHost: true, channelState: 'joined', received: false })).toBeNull()
    // En ny kanal väntar fortfarande på att den gamla ska stängas: gör ingenting.
    expect(wakeAction({ isHost: false, channelState: null, received: false })).toBeNull()
  })

  it('en gäst som fastnat på Ansluter ansluter på nytt när fliken syns igen, även om kanalen ser öppen ut', () => {
    expect(wakeAction({ isHost: false, channelState: 'joined', received: false })).toBe('reconnect')
    expect(wakeAction({ isHost: false, channelState: 'joining', received: false })).toBe('reconnect')
  })

  it('gästen ansluter på nytt en gång när hello inte får svar, och frågar sedan vidare', () => {
    expect(helloRetryAction({ tries: 1, autoReconnected: false })).toBe('hello')
    expect(helloRetryAction({ tries: RECONNECT_AFTER_HELLOS, autoReconnected: false })).toBe('reconnect')
    expect(helloRetryAction({ tries: RECONNECT_AFTER_HELLOS, autoReconnected: true })).toBe('hello')
    expect(helloRetryAction({ tries: 10, autoReconnected: true })).toBe('hello')
  })
})

describe('isSameContent', () => {
  it('ser när värdens läge är samma som gästen redan har', () => {
    const state = { phase: 'playing', players: { a: { name: 'Bea' } }, deadline: null }
    expect(isSameContent(state, JSON.parse(JSON.stringify(state)))).toBe(true)
    expect(isSameContent(state, { ...state, deadline: 5 })).toBe(false)
    expect(isSameContent(null, state)).toBe(false)
  })
})
