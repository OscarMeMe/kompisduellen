import { describe, expect, it } from 'vitest'
import { timeWarning } from '@/lib/tidvarning'

describe('timeWarning', () => {
  it('är normal när det är mer än 10 sekunder kvar', () => {
    expect(timeWarning(30, false)).toBe('normal')
    expect(timeWarning(11, false)).toBe('normal')
  })

  it('kan varna senare i korta rundor', () => {
    expect(timeWarning(10, false, 5)).toBe('normal')
    expect(timeWarning(6, false, 5)).toBe('normal')
    expect(timeWarning(5, false, 5)).toBe('kritisk')
  })

  it('varnar vid 10 sekunder och ner till 6', () => {
    expect(timeWarning(10, false)).toBe('varning')
    expect(timeWarning(6, false)).toBe('varning')
  })

  it('är kritisk vid 5 sekunder och mindre, även när tiden är ute', () => {
    expect(timeWarning(5, false)).toBe('kritisk')
    expect(timeWarning(1, false)).toBe('kritisk')
    expect(timeWarning(0, false)).toBe('kritisk')
  })

  it('är alltid normal när svaret är låst', () => {
    expect(timeWarning(30, true)).toBe('normal')
    expect(timeWarning(10, true)).toBe('normal')
    expect(timeWarning(5, true)).toBe('normal')
    expect(timeWarning(0, true)).toBe('normal')
  })
})
