// Granskningen av frågorna i Gissa priset (sidan /granska, bara i utvecklingsläge).
// Rena funktioner som används både av sidan och av Vite-pluginen som läser och skriver filerna:
// - src/lib/prisdata.json: frågorna i spelet
// - inkorg.json (projektroten): nya frågor som väntar på granskning
// - granskning.json (projektroten): omdömen och kommentarer
// inkorg.json och granskning.json finns bara lokalt (.gitignore) och når aldrig spelet.

export type Verdict = 'godkand' | 'fixa' | 'ta-bort'

export const VERDICT_LABELS: Record<Verdict, string> = {
  godkand: 'Godkänd',
  fixa: 'Behöver fixas',
  'ta-bort': 'Ta bort',
}

export type Review = {
  verdict: Verdict
  comment: string
  reviewedAt: string
}

// Omdömen per fråge-id.
export type Reviews = Record<string, Review>

// Var frågan ligger: i spelet (prisdata.json) eller i inkorgen.
export type ItemSource = 'prisdata' | 'inkorg'

export type ReviewFiles<T extends { id: string }> = {
  items: T[]
  inbox: T[]
  reviews: Reviews
}

// Bilder till frågor i inkorgen ligger i public/prisbilder-inkorg, som inte följer med i git.
// När frågan godkänns flyttas bilden till public/prisbilder (se vite-plugin-granska.ts).
export const INBOX_IMAGE_DIR = '/prisbilder-inkorg/'
export const IMAGE_DIR = '/prisbilder/'

// Sökvägen som bilden får när frågan godkänns, t.ex. '/prisbilder-inkorg/x.webp' → '/prisbilder/x.webp'.
export function publishedImage(image: string): string {
  return image.startsWith(INBOX_IMAGE_DIR) ? IMAGE_DIR + image.slice(INBOX_IMAGE_DIR.length) : image
}

// Fälten som en fråga måste ha för att kunna visas i spelet.
const REQUIRED_FIELDS = {
  id: 'string',
  emoji: 'string',
  name: 'string',
  year: 'number',
  clue: 'string',
  priceSek: 'number',
  fact: 'string',
  source: 'string',
} as const

// Fält som saknas eller har fel typ, t.ex. ['priceSek'] om priset står som text.
export function missingFields(item: object): string[] {
  const record = item as Record<string, unknown>
  return Object.entries(REQUIRED_FIELDS)
    .filter(([field, type]) => typeof record[field] !== type || record[field] === '')
    .map(([field]) => field)
}

// Ett omdöme på en fråga. Returnerar filerna som de ska se ut efteråt:
// - Godkänd i inkorgen: frågan flyttas till slutet av prisdata.json, och bilden får sin publicerade sökväg.
// - Ta bort: frågan tas bort ur filen där den ligger.
// - Behöver fixas, eller Godkänd på en fråga i spelet: bara omdömet sparas.
export function applyVerdict<T extends { id: string; image?: string }>(
  files: ReviewFiles<T>,
  id: string,
  source: ItemSource,
  verdict: Verdict,
  comment: string,
  now: Date,
): ReviewFiles<T> {
  const list = source === 'inkorg' ? files.inbox : files.items
  const item = list.find((i) => i.id === id)
  if (!item) throw new Error(`Hittar ingen fråga med id "${id}" i ${source === 'inkorg' ? 'inkorgen' : 'prisdata.json'}.`)

  let { items, inbox } = files
  if (verdict === 'godkand' && source === 'inkorg') {
    const missing = missingFields(item)
    if (missing.length > 0) throw new Error(`Frågan saknar ${missing.join(', ')} och kan inte godkännas än.`)
    if (items.some((i) => i.id === id)) throw new Error(`Det finns redan en fråga med id "${id}" i prisdata.json.`)
    items = [...items, item.image ? { ...item, image: publishedImage(item.image) } : item]
    inbox = inbox.filter((i) => i !== item)
  } else if (verdict === 'ta-bort') {
    if (source === 'inkorg') inbox = inbox.filter((i) => i !== item)
    else items = items.filter((i) => i !== item)
  }

  const reviews = { ...files.reviews, [id]: { verdict, comment: comment.trim(), reviewedAt: now.toISOString() } }
  return { items, inbox, reviews }
}

// Listan som "Exportera" kopierar: en rad per granskad fråga, t.ex. "bitcoinpizza: Behöver fixas – Fel år".
export function exportReviews(reviews: Reviews): string {
  return Object.entries(reviews)
    .map(([id, review]) => {
      const line = `${id}: ${VERDICT_LABELS[review.verdict]}`
      return review.comment ? `${line} – ${review.comment}` : line
    })
    .join('\n')
}
