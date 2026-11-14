import { describe, expect, it } from 'vitest'
import { WORDS } from '@/lib/imposterjakten'
import {
  addWord,
  categoryCounts,
  MIN_PER_CATEGORY,
  newWordId,
  parseForms,
  removeWord,
  restoreWord,
  reviewedCount,
  serializeWords,
  setApproved,
  smallCategories,
  tooSmallAfterMoving,
  tooSmallAfterRemoving,
  updateWord,
  wordError,
  type ReviewWord,
} from '@/lib/ordgranskning'

// Filen läses som den ligger på disken (testerna körs i Node, från projektroten), utan att typerna för Node behövs.
const node = globalThis as unknown as {
  process: { getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, encoding: 'utf8'): string } }
}

const word = (id: string, extra: Partial<ReviewWord> = {}): ReviewWord => ({
  id,
  ord: id[0].toUpperCase() + id.slice(1),
  kategori: 'Saker',
  ledtrad: 'ledtråd',
  nara: `nära-${id}`,
  godkanda: [id, `${id}et`],
  svarighet: 'latt',
  ...extra,
})

describe('granskningen av Imposterjaktens ord', () => {
  it('skriver ordlistan precis som filen redan ser ut', () => {
    const file = node.process.getBuiltinModule('node:fs').readFileSync('src/lib/imposterjakten.json', 'utf8')
    const newline = file.includes('\r\n') ? '\r\n' : '\n'
    expect(serializeWords(WORDS, newline)).toBe(file)
  })

  it('godkänner hela den nuvarande ordlistan', () => {
    for (const item of WORDS) expect(wordError(item, WORDS), item.ord).toBeNull()
  })

  it('delar upp godkända former vid komma', () => {
    expect(parseForms('paraply,  paraplyet , , allsång på  skansen')).toEqual(['paraply', 'paraplyet', 'allsång på skansen'])
  })

  it('säger vad som är fel i ett ord', () => {
    const others = [word('stol'), word('bord')]
    expect(wordError(word('stol'), others)).toBeNull()
    expect(wordError(word('stol', { ord: ' ' }), others)).toBe('Ordet får inte vara tomt.')
    expect(wordError(word('stol', { ledtrad: '' }), others)).toBe('Ledtråden får inte vara tom.')
    expect(wordError(word('stol', { godkanda: [] }), others)).toBe('Minst en godkänd form behövs.')
    expect(wordError(word('stol', { godkanda: ['Stol'] }), others)).toBe('Godkända former skrivs med små bokstäver.')
    expect(wordError(word('stol', { godkanda: ['stolen'] }), others)).toBe('Ordet självt ("stol") ska stå bland de godkända formerna.')
    expect(wordError(word('stol', { nara: 'Stolet' }), others)).toBe('Nära-ordet får inte vara ordet självt eller en godkänd form.')
    expect(wordError(word('stol', { nara: 'nära-bord' }), others)).toBe('Nära-ordet används redan av Bord.')
    expect(wordError(word('stol', { svarighet: 'omöjlig' }), others)).toBe('Svårigheten ska vara Lätt, Mellan eller Klurig.')
    expect(wordError(word('stol', { ord: 'Bord', godkanda: ['bord'] }), others)).toBe('Ordet finns redan i listan.')
  })

  it('sparar ändringar utan att ändra id eller plats, och städar mellanslag', () => {
    const words = [word('stol'), word('bord'), word('lampa')]
    const saved = updateWord(words, { ...word('bord'), id: 'bord', ord: '  Matbord ', godkanda: ['matbord', ' matbordet '], ledtrad: 'kök' })
    expect(saved.map((item) => item.id)).toEqual(['stol', 'bord', 'lampa'])
    expect(saved[1]).toEqual({ id: 'bord', ord: 'Matbord', kategori: 'Saker', ledtrad: 'kök', nara: 'nära-bord', godkanda: ['matbord', 'matbordet'], svarighet: 'latt' })
    expect(() => updateWord(words, word('finns-inte'))).toThrow('Ordet finns inte längre i listan.')
    expect(() => updateWord(words, word('bord', { nara: '' }))).toThrow('Nära-ordet får inte vara tomt.')
  })

  it('ger ett nytt ord ett id i samma format som de andra', () => {
    expect(newWordId('Allsång på Skansen', [])).toBe('allsang-pa-skansen')
    expect(newWordId('Zlatan Ibrahimović', [])).toBe('zlatan-ibrahimovic')
    expect(newWordId('Stand-up', [])).toBe('stand-up')
    expect(newWordId(' Ölprovning ', ['olprovning', 'olprovning-2'])).toBe('olprovning-3')
    // De id:n som redan finns i ordlistan har samma format, och är unika. (Ett id ändras aldrig, så det behöver inte
    // längre stämma med ordet när ordet har skrivits om.)
    for (const item of WORDS) expect(item.id, item.ord).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(new Set(WORDS.map((item) => item.id)).size).toBe(WORDS.length)
  })

  it('lägger till ett nytt ord sist, med samma regler som när ett ord ändras', () => {
    const words = [word('stol'), word('bord')]
    const fields = { ord: ' Soffa ', kategori: 'Saker', ledtrad: 'vardagsrum', nara: 'Fåtölj', godkanda: ['soffa', 'soffan'], svarighet: 'mellan' }
    const { words: more, added } = addWord(words, fields)
    expect(more.map((item) => item.id)).toEqual(['stol', 'bord', 'soffa'])
    expect(added).toEqual({ id: 'soffa', ord: 'Soffa', kategori: 'Saker', ledtrad: 'vardagsrum', nara: 'Fåtölj', godkanda: ['soffa', 'soffan'], svarighet: 'mellan' })
    // Ett ord som redan finns stoppas, utan hänsyn till stora och små bokstäver.
    expect(() => addWord(words, { ...fields, ord: 'STOL', godkanda: ['stol'] })).toThrow('Ordet finns redan i listan.')
    expect(() => addWord(words, { ...fields, nara: 'nära-bord' })).toThrow('Nära-ordet används redan av Bord.')
    expect(() => addWord(words, { ...fields, ledtrad: '' })).toThrow('Ledtråden får inte vara tom.')
  })

  it('kastar ett ord och lägger tillbaka det på samma plats', () => {
    const words = [word('stol'), word('bord'), word('lampa')]
    const { words: fewer, removed, index } = removeWord(words, 'bord')
    expect(fewer.map((item) => item.id)).toEqual(['stol', 'lampa'])
    expect(restoreWord(fewer, removed, index)).toEqual(words)
    expect(() => restoreWord(words, removed, index)).toThrow('Ordet finns redan i listan.')
    expect(() => removeWord(words, 'finns-inte')).toThrow()
  })

  it('räknar ord per kategori och varnar för små kategorier', () => {
    const many = Array.from({ length: MIN_PER_CATEGORY }, (_, i) => word(`sak${i}`))
    const words = [...many, word('katt', { kategori: 'Djur' })]
    expect(categoryCounts(words)).toEqual([
      { category: 'Saker', count: MIN_PER_CATEGORY },
      { category: 'Djur', count: 1 },
    ])
    expect(smallCategories(words)).toEqual([{ category: 'Djur', count: 1 }])
    // Att kasta eller flytta ett ord ur en kategori med precis 15 gör den för liten.
    expect(tooSmallAfterRemoving(words, 'sak3')).toEqual({ category: 'Saker', count: MIN_PER_CATEGORY - 1 })
    expect(tooSmallAfterMoving(words, 'sak3', 'Djur')).toEqual({ category: 'Saker', count: MIN_PER_CATEGORY - 1 })
    expect(tooSmallAfterMoving(words, 'sak3', 'Saker')).toBeNull()
    expect(tooSmallAfterRemoving([...words, word('sak99')], 'sak3')).toBeNull()
  })

  it('godkänner och ångrar, och räknar bara ord som finns kvar', () => {
    const words = [word('stol'), word('bord')]
    const now = new Date('2026-11-14T12:00:00Z')
    const reviews = setApproved(setApproved({}, 'stol', true, now), 'borta', true, now)
    expect(reviews.stol).toEqual({ verdict: 'godkand', at: '2026-11-14T12:00:00.000Z' })
    expect(reviewedCount(words, reviews)).toBe(1)
    expect(setApproved(reviews, 'stol', false, now).stol).toBeUndefined()
  })

  it('den riktiga ordlistan har minst 15 ord i varje kategori', () => {
    expect(smallCategories(WORDS)).toEqual([])
  })
})
