import { afterEach, describe, expect, it, vi } from 'vitest'
import { workerTimeout } from '@/lib/arbetstimer'

// Testerna körs utan Worker, så här prövas reservläget med vanlig setTimeout. Själva workern provas i webbläsaren.
describe('timers i en egen tråd', () => {
  afterEach(() => vi.useRealTimers())

  it('kör funktionen efter tiden, och går att stoppa', () => {
    vi.useFakeTimers()
    const done = vi.fn()
    const stopped = vi.fn()
    workerTimeout(done, 1000)
    const stop = workerTimeout(stopped, 1000)
    stop()
    vi.advanceTimersByTime(999)
    expect(done).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(done).toHaveBeenCalledOnce()
    expect(stopped).not.toHaveBeenCalled()
  })
})
