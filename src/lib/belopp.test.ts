import { describe, expect, it } from 'vitest'
import {
  formatExactSek,
  formatSek,
  formatTypedNumber,
  isValidPrice,
  MAX_PRICE,
  MIN_PRICE,
  parseTypedNumber,
  roundSek,
} from '@/lib/belopp'

// toLocaleString('sv-SE') skriver tusental med hårt mellanslag. Testerna jämför med vanliga mellanslag.
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('tolkning av det man skriver', () => {
  it('läser hela kronor, med eller utan mellanslag', () => {
    expect(parseTypedNumber('1500')).toBe(1500)
    expect(parseTypedNumber('1 500')).toBe(1500)
    expect(parseTypedNumber('  12  ')).toBe(12)
    expect(parseTypedNumber('007')).toBe(7)
  })

  it('komma eller punkt ger ören under en krona', () => {
    expect(parseTypedNumber('0,24')).toBe(0.24)
    expect(parseTypedNumber('0.24')).toBe(0.24)
    expect(parseTypedNumber(',5')).toBe(0.5)
    expect(parseTypedNumber('0,05')).toBe(0.05)
  })

  it('från en krona avrundas till hela kronor', () => {
    expect(parseTypedNumber('4,5')).toBe(5)
    expect(parseTypedNumber('4,49')).toBe(4)
    expect(parseTypedNumber('1,25')).toBe(1)
  })

  it('räknar bara två decimaler och ignorerar fler kommatecken', () => {
    expect(parseTypedNumber('0,249')).toBe(0.24)
    expect(parseTypedNumber('0,2,4')).toBe(0.24)
  })

  it('punkt räknas som decimaltecken, inte tusentalsavgränsare', () => {
    // "1.500" blir 1,50 kr och avrundas till 2 kr. Rutan visar det direkt som "1,50", så man ser vad som hände.
    expect(parseTypedNumber('1.500')).toBe(2)
    expect(formatTypedNumber('1.500')).toBe('1,50')
  })

  it('struntar i bokstäver och tecken', () => {
    expect(parseTypedNumber('12 kr')).toBe(12)
    expect(parseTypedNumber('ca 300')).toBe(300)
  })

  it('tom ruta eller bara tecken ger inget tal', () => {
    expect(parseTypedNumber('')).toBeNaN()
    expect(parseTypedNumber('   ')).toBeNaN()
    expect(parseTypedNumber('kr')).toBeNaN()
  })

  it('tar högst nio siffror före decimaltecknet', () => {
    expect(parseTypedNumber('1234567890')).toBe(123456789)
  })
})

describe('det som visas i rutan', () => {
  it('grupperar tusental och behåller ett påbörjat decimalkomma', () => {
    expect(plain(formatTypedNumber('1500'))).toBe('1 500')
    expect(plain(formatTypedNumber('1234567'))).toBe('1 234 567')
    expect(formatTypedNumber('0,')).toBe('0,')
    expect(formatTypedNumber(',5')).toBe('0,5')
    expect(formatTypedNumber('')).toBe('')
  })
})

describe('avrundning', () => {
  it('hela kronor från en krona, annars hela ören', () => {
    expect(roundSek(4.75)).toBe(5)
    expect(roundSek(1)).toBe(1)
    expect(roundSek(0.994)).toBe(0.99)
    expect(roundSek(0.5)).toBe(0.5)
  })
})

describe('giltiga gissningar', () => {
  it('godtar från ett öre till hundra miljoner kronor', () => {
    expect(isValidPrice(MIN_PRICE)).toBe(true)
    expect(isValidPrice(0.24)).toBe(true)
    expect(isValidPrice(MAX_PRICE)).toBe(true)
  })

  it('slänger noll, negativt, för stort, fler än två decimaler och sådant som inte är tal', () => {
    expect(isValidPrice(0)).toBe(false)
    expect(isValidPrice(-5)).toBe(false)
    expect(isValidPrice(MAX_PRICE + 1)).toBe(false)
    expect(isValidPrice(0.005)).toBe(false)
    expect(isValidPrice(1.234)).toBe(false)
    expect(isValidPrice(Number.NaN)).toBe(false)
    expect(isValidPrice(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('visning i kronor', () => {
  it('ören under en krona, annars hela kronor med tusental', () => {
    expect(formatSek(0.24)).toBe('24 öre')
    expect(formatSek(4.75)).toBe('5 kr')
    expect(plain(formatSek(67_000_000))).toBe('67 000 000 kr')
  })

  it('det exakta priset med två decimaler', () => {
    expect(formatExactSek(2.44)).toBe('2,44 kr')
    expect(plain(formatExactSek(1250))).toBe('1 250,00 kr')
  })
})
