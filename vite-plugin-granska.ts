import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'
import {
  applyVerdict,
  INBOX_IMAGE_DIR,
  publishedImage,
  type ItemSource,
  type ReviewFiles,
  type Verdict,
} from './src/lib/granskning.ts'

// Läser och skriver frågefilerna åt granskningssidan (/granska). Körs bara av dev-servern
// (apply: 'serve'), så varken sidan eller filerna följer med när sajten byggs.

const FILES = {
  items: path.resolve(import.meta.dirname, 'src/lib/prisdata.json'),
  inbox: path.resolve(import.meta.dirname, 'inkorg.json'),
  reviews: path.resolve(import.meta.dirname, 'granskning.json'),
}
const PUBLIC_DIR = path.resolve(import.meta.dirname, 'public')

type Question = { id: string; image?: string }

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch (error) {
    throw new Error(`Kunde inte läsa ${path.basename(file)}: ${(error as Error).message}`, { cause: error })
  }
}

function readFiles(): ReviewFiles<Question> {
  return {
    items: readJson<Question[]>(FILES.items, []),
    inbox: readJson<Question[]>(FILES.inbox, []),
    reviews: readJson(FILES.reviews, {}),
  }
}

// Skriver bara filer som ändrats, så att Vite inte laddar om spelet i onödan.
function writeFiles(before: ReviewFiles<Question>, after: ReviewFiles<Question>) {
  const write = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  if (after.items !== before.items) write(FILES.items, after.items)
  if (after.inbox !== before.inbox) write(FILES.inbox, after.inbox)
  if (after.reviews !== before.reviews) write(FILES.reviews, after.reviews)
}

// Inkorgsfrågans bild: flyttas till public/prisbilder när frågan godkänns och tas bort med frågan.
// Görs före JSON-filerna, så att inget ändras om bilden inte går att flytta.
function handleInboxImage(image: string | undefined, verdict: Verdict) {
  if (!image?.startsWith(INBOX_IMAGE_DIR)) return
  const from = path.join(PUBLIC_DIR, image)
  if (verdict === 'ta-bort') {
    fs.rmSync(from, { force: true })
  } else if (verdict === 'godkand') {
    const to = path.join(PUBLIC_DIR, publishedImage(image))
    if (!fs.existsSync(from)) throw new Error(`Bilden ${image} saknas.`)
    if (fs.existsSync(to)) throw new Error(`Det finns redan en bild ${publishedImage(image)}.`)
    fs.renameSync(from, to)
  }
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

export function granskaPlugin(): Plugin {
  return {
    name: 'kompisduellen-granska',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__granska', async (req, res) => {
        try {
          if (req.method === 'GET' && req.url === '/data') {
            send(res, 200, readFiles())
          } else if (req.method === 'POST' && req.url === '/omdome') {
            const { id, source, verdict, comment } = (await readBody(req)) as {
              id: string
              source: ItemSource
              verdict: Verdict
              comment: string
            }
            const before = readFiles()
            const after = applyVerdict(before, id, source, verdict, comment ?? '', new Date())
            if (source === 'inkorg') handleInboxImage(before.inbox.find((i) => i.id === id)?.image, verdict)
            writeFiles(before, after)
            send(res, 200, after)
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
