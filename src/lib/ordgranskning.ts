// Reglerna för granskningssidan för Imposterjaktens ord (/granska-ord, bara med npm run dev): kontroll av ett ändrat ord,
// ändra, kasta och lägga tillbaka ord, antalet ord per kategori och hur ordlistan skrivs till filen. Rena funktioner, som
// används både av sidan och av dev-serverns plugin (vite-plugin-granska-ord.ts). Importerar inte ordlistan själv, så
// att pluginet kan läsa den här filen i Node.

export type ReviewWord = {
  id: string
  ord: string
  kategori: string
  ledtrad: string
  nara: string
  godkanda: string[]
  svarighet: string
}

// Omdömena, per ordets id. Bara godkända ord står här: ett kastat ord tas bort ur ordlistan.
export type WordReviews = Record<string, { verdict: 'godkand'; at: string }>

export type WordFiles = { words: ReviewWord[]; reviews: WordReviews }

// Så många ord behöver varje kategori, så att den räcker till tio omgångar (testerna i imposterjakten.test.ts kräver det).
export const MIN_PER_CATEGORY = 15
export const LEVELS = ['latt', 'mellan', 'klurig'] as const
export const LEVEL_LABELS: Record<string, string> = { latt: 'Lätt', mellan: 'Mellan', klurig: 'Klurig' }

// Samma jämförelse som normalizeWord i imposterjakten.ts.
const norm = (text: string) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv')

// Godkända former som de skrivs i fältet: åtskilda med komma.
export function parseForms(text: string): string[] {
  return text
    .split(',')
    .map((form) => form.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

// Fälten som går att ändra, städade: inga onödiga mellanslag.
export function cleanWord(word: ReviewWord): ReviewWord {
  const tidy = (text: string) => text.trim().replace(/\s+/g, ' ')
  return { ...word, ord: tidy(word.ord), kategori: tidy(word.kategori), ledtrad: tidy(word.ledtrad), nara: tidy(word.nara), godkanda: word.godkanda.map(tidy).filter(Boolean) }
}

// Går ordet att spara? Ger felet i klartext, eller null. others = alla andra ord i listan. Reglerna är de som spelet
// och testerna i imposterjakten.test.ts kräver.
export function wordError(word: ReviewWord, others: readonly ReviewWord[]): string | null {
  const clean = cleanWord(word)
  if (!clean.ord) return 'Ordet får inte vara tomt.'
  if (!clean.kategori) return 'Kategorin får inte vara tom.'
  if (!clean.ledtrad) return 'Ledtråden får inte vara tom.'
  if (!clean.nara) return 'Nära-ordet får inte vara tomt.'
  if (!(LEVELS as readonly string[]).includes(clean.svarighet)) return 'Svårigheten ska vara Lätt, Mellan eller Klurig.'
  if (clean.godkanda.length === 0) return 'Minst en godkänd form behövs.'
  const forms = clean.godkanda.map(norm)
  if (clean.godkanda.some((form) => form !== form.toLocaleLowerCase('sv'))) return 'Godkända former skrivs med små bokstäver.'
  if (new Set(forms).size !== forms.length) return 'Samma godkända form står två gånger.'
  if (!forms.includes(norm(clean.ord))) return `Ordet självt ("${clean.ord.toLocaleLowerCase('sv')}") ska stå bland de godkända formerna.`
  if ([norm(clean.ord), ...forms].includes(norm(clean.nara))) return 'Nära-ordet får inte vara ordet självt eller en godkänd form.'
  const sameNear = others.find((other) => other.id !== clean.id && norm(other.nara) === norm(clean.nara))
  if (sameNear) return `Nära-ordet används redan av ${sameNear.ord}.`
  const sameWord = others.find((other) => other.id !== clean.id && norm(other.ord) === norm(clean.ord))
  if (sameWord) return 'Ordet finns redan i listan.'
  return null
}

// Sparar ändringarna i ett ord. Ordets id ändras aldrig, och ordet står kvar på sin plats. Kastar ett fel om ordet
// saknas eller inte går att spara.
export function updateWord(words: readonly ReviewWord[], changed: ReviewWord): ReviewWord[] {
  const index = words.findIndex((word) => word.id === changed.id)
  if (index === -1) throw new Error('Ordet finns inte längre i listan.')
  const error = wordError(changed, words)
  if (error) throw new Error(error)
  const clean = cleanWord(changed)
  // Fälten i samma ordning som i filen, och id:t från det sparade ordet.
  const saved: ReviewWord = { id: words[index].id, ord: clean.ord, kategori: clean.kategori, ledtrad: clean.ledtrad, nara: clean.nara, godkanda: clean.godkanda, svarighet: clean.svarighet }
  return words.map((word, i) => (i === index ? saved : word))
}

// Ett nytt ords id, i samma format som de andra: små bokstäver utan å, ä och ö, och bindestreck mellan orden
// ("Allsång på Skansen" blir allsang-pa-skansen). Är id:t upptaget får det en siffra efter sig.
export function newWordId(ord: string, taken: readonly string[]): string {
  const base =
    ord
      .trim()
      .toLocaleLowerCase('sv')
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ord'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

// Lägger till ett nytt ord sist i listan, med ett nytt id. Samma regler som när ett ord ändras (wordError), så ett ord
// som redan finns går inte att lägga till. Kastar ett fel om ordet inte går att spara.
export function addWord(words: readonly ReviewWord[], fields: Omit<ReviewWord, 'id'>): { words: ReviewWord[]; added: ReviewWord } {
  const error = wordError({ ...fields, id: '' }, words)
  if (error) throw new Error(error)
  const clean = cleanWord({ ...fields, id: '' })
  const added: ReviewWord = {
    id: newWordId(clean.ord, words.map((word) => word.id)),
    ord: clean.ord,
    kategori: clean.kategori,
    ledtrad: clean.ledtrad,
    nara: clean.nara,
    godkanda: clean.godkanda,
    svarighet: clean.svarighet,
  }
  return { words: [...words, added], added }
}

// Kastar ett ord: det tas bort ur listan. Ger också ordet och platsen det stod på, så att det går att lägga tillbaka.
export function removeWord(words: readonly ReviewWord[], id: string): { words: ReviewWord[]; removed: ReviewWord; index: number } {
  const index = words.findIndex((word) => word.id === id)
  if (index === -1) throw new Error('Ordet finns inte längre i listan.')
  return { words: words.filter((_, i) => i !== index), removed: words[index], index }
}

// Lägger tillbaka ett kastat ord på platsen det stod på (eller sist, om listan blivit kortare).
export function restoreWord(words: readonly ReviewWord[], word: ReviewWord, index: number): ReviewWord[] {
  if (words.some((other) => other.id === word.id)) throw new Error('Ordet finns redan i listan.')
  const at = Math.max(0, Math.min(words.length, index))
  return [...words.slice(0, at), word, ...words.slice(at)]
}

// Godkänner ett ord, eller tar bort omdömet (approved = false).
export function setApproved(reviews: WordReviews, id: string, approved: boolean, now: Date): WordReviews {
  const { [id]: _removed, ...rest } = reviews
  return approved ? { ...rest, [id]: { verdict: 'godkand', at: now.toISOString() } } : rest
}

// Antalet ord per kategori, i den ordning kategorierna först förekommer.
export function categoryCounts(words: readonly ReviewWord[]): { category: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const word of words) counts.set(word.kategori, (counts.get(word.kategori) ?? 0) + 1)
  return [...counts].map(([category, count]) => ({ category, count }))
}

// Kategorierna som har för få ord.
export function smallCategories(words: readonly ReviewWord[]): { category: string; count: number }[] {
  return categoryCounts(words).filter((entry) => entry.count < MIN_PER_CATEGORY)
}

// Kategorin som skulle få för få ord om ordet kastades, eller null.
export function tooSmallAfterRemoving(words: readonly ReviewWord[], id: string): { category: string; count: number } | null {
  const word = words.find((item) => item.id === id)
  if (!word) return null
  const count = words.filter((item) => item.kategori === word.kategori).length - 1
  return count < MIN_PER_CATEGORY ? { category: word.kategori, count } : null
}

// Kategorin som skulle få för få ord om ordet flyttades till en annan kategori, eller null.
export function tooSmallAfterMoving(words: readonly ReviewWord[], id: string, category: string): { category: string; count: number } | null {
  const word = words.find((item) => item.id === id)
  if (!word || word.kategori === category) return null
  return tooSmallAfterRemoving(words, id)
}

// Hur många ord som är granskade (godkända) av dem som finns kvar i listan.
export function reviewedCount(words: readonly ReviewWord[], reviews: WordReviews): number {
  return words.filter((word) => reviews[word.id]?.verdict === 'godkand').length
}

// Ordlistan som den skrivs till imposterjakten.json: ett ord per rad, med fälten i samma ordning som förut, så att
// ändringarna blir lätta att läsa i git. newline = radbrytningen som filen redan har.
export function serializeWords(words: readonly ReviewWord[], newline = '\n'): string {
  const value = (item: unknown): string => (Array.isArray(item) ? `[${item.map((part) => JSON.stringify(part)).join(', ')}]` : JSON.stringify(item))
  const lines = words.map((word) => `  { ${Object.entries(word).map(([key, item]) => `${JSON.stringify(key)}: ${value(item)}`).join(', ')} }`)
  return `[${newline}${lines.join(`,${newline}`)}${newline}]${newline}`
}
