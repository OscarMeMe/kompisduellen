import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'
import { addWord, removeWord, restoreWord, serializeWords, setApproved, updateWord, type ReviewWord, type WordFiles, type WordReviews } from './src/lib/ordgranskning.ts'

// Läser och skriver Imposterjaktens ordlista åt granskningssidan (/granska-ord). Körs bara av dev-servern
// (apply: 'serve'), så varken sidan eller omdömena följer med när sajten byggs.

const FILES = {
  words: path.resolve(import.meta.dirname, 'src/lib/imposterjakten.json'),
  reviews: path.resolve(import.meta.dirname, 'granskning-ord.json'),
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch (error) {
    throw new Error(`Kunde inte läsa ${path.basename(file)}: ${(error as Error).message}`, { cause: error })
  }
}

function readFiles(): WordFiles {
  return { words: readJson<ReviewWord[]>(FILES.words, []), reviews: readJson<WordReviews>(FILES.reviews, {}) }
}

// När ordlistan senast skrevs härifrån. Då ska dev-servern inte ladda om sidan (se handleHotUpdate).
let wroteWordsAt = 0

// Ordlistan skrivs som den redan ser ut: ett ord per rad och samma radbrytningar som filen har.
function writeWords(words: ReviewWord[]) {
  const before = fs.readFileSync(FILES.words, 'utf8')
  wroteWordsAt = Date.now()
  fs.writeFileSync(FILES.words, serializeWords(words, before.includes('\r\n') ? '\r\n' : '\n'))
}

function writeReviews(reviews: WordReviews) {
  fs.writeFileSync(FILES.reviews, JSON.stringify(reviews, null, 2) + '\n')
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of req) body += chunk
  return JSON.parse(body)
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

export function granskaOrdPlugin(): Plugin {
  return {
    name: 'kompisduellen-granska-ord',
    apply: 'serve',
    // Sidan har redan de nya orden när den själv har sparat dem. Utan det här skulle dev-servern ladda om sidan vid
    // varje sparning, och då går det inte längre att ångra ett beslut.
    handleHotUpdate({ file }) {
      if (path.resolve(file) === FILES.words && Date.now() - wroteWordsAt < 3000) return []
    },
    configureServer(server) {
      server.middlewares.use('/__granska-ord', async (req, res) => {
        try {
          if (req.method === 'GET' && req.url === '/data') {
            send(res, 200, readFiles())
          } else if (req.method === 'POST' && req.url === '/godkann') {
            // Godkänner ett ord, eller tar bort omdömet (approved: false).
            const { id, approved } = (await readBody(req)) as { id: string; approved: boolean }
            const files = readFiles()
            if (!files.words.some((word) => word.id === id)) throw new Error('Ordet finns inte längre i listan.')
            const reviews = setApproved(files.reviews, id, approved === true, new Date())
            writeReviews(reviews)
            send(res, 200, { words: files.words, reviews })
          } else if (req.method === 'POST' && req.url === '/spara') {
            const { word } = (await readBody(req)) as { word: ReviewWord }
            const files = readFiles()
            const words = updateWord(files.words, word)
            writeWords(words)
            send(res, 200, { words, reviews: files.reviews })
          } else if (req.method === 'POST' && req.url === '/lagg-till') {
            // Ett nytt ord läggs sist i ordlistan och räknas som godkänt direkt.
            const { word } = (await readBody(req)) as { word: Omit<ReviewWord, 'id'> }
            const files = readFiles()
            const { words, added } = addWord(files.words, word)
            const reviews = setApproved(files.reviews, added.id, true, new Date())
            writeWords(words)
            writeReviews(reviews)
            send(res, 200, { words, reviews, added })
          } else if (req.method === 'POST' && req.url === '/kasta') {
            // Ordet tas bort ur ordlistan. Svaret har ordet och platsen, så att sidan kan lägga tillbaka det.
            const { id } = (await readBody(req)) as { id: string }
            const files = readFiles()
            const { words, removed, index } = removeWord(files.words, id)
            const reviews = setApproved(files.reviews, id, false, new Date())
            writeWords(words)
            if (reviews !== files.reviews) writeReviews(reviews)
            send(res, 200, { words, reviews, removed, index, wasApproved: files.reviews[id] !== undefined })
          } else if (req.method === 'POST' && req.url === '/aterstall') {
            const { word, index, approved } = (await readBody(req)) as { word: ReviewWord; index: number; approved: boolean }
            const files = readFiles()
            const words = restoreWord(files.words, word, index)
            const reviews = approved ? setApproved(files.reviews, word.id, true, new Date()) : files.reviews
            writeWords(words)
            if (reviews !== files.reviews) writeReviews(reviews)
            send(res, 200, { words, reviews })
          } else {
            send(res, 404, { error: 'Finns inte' })
          }
        } catch (error) {
          send(res, 400, { error: (error as Error).message })
        }
      })
    },
  }
}
