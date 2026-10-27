import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, ExternalLink, Loader2, Trash2, Wrench } from 'lucide-react'
import { PriceAnswerCard, PriceFact } from '@/components/gissa-priset/PriceAnswerCard'
import { PriceQuestionCard } from '@/components/gissa-priset/PriceQuestionCard'
import { Wide } from '@/components/lobby/LobbyLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { roundSek } from '@/lib/belopp'
import {
  exportReviews,
  missingFields,
  VERDICT_LABELS,
  type ItemSource,
  type Review,
  type ReviewFiles,
  type Verdict,
} from '@/lib/granskning'
import type { PriceItem } from '@/lib/prisdata'
import { cn } from '@/lib/utils'

// Intern granskning av frågorna i Gissa priset (/granska). Finns bara i utvecklingsläge (se App.tsx)
// och läser och skriver filerna via vite-plugin-granska.ts. Länkas inte någonstans.

type Entry = { item: PriceItem; source: ItemSource }
type Filter = 'alla' | 'ogranskade' | 'godkand' | 'fixa' | 'nya'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alla', label: 'Alla' },
  { id: 'ogranskade', label: 'Ogranskade' },
  { id: 'godkand', label: 'Godkända' },
  { id: 'fixa', label: 'Behöver fixas' },
  { id: 'nya', label: 'Nya i inkorgen' },
]

const VERDICT_STYLES: Record<Verdict, string> = {
  godkand: 'bg-mint-soft',
  fixa: 'bg-sun-soft',
  'ta-bort': 'bg-coral-soft',
}

// Samma id kan finnas både i spelet och i inkorgen, så nyckeln tar med var frågan ligger.
const keyOf = (entry: Entry) => `${entry.source}:${entry.item.id}`

function matchesFilter(entry: Entry, review: Review | undefined, filter: Filter): boolean {
  if (filter === 'ogranskade') return !review
  if (filter === 'nya') return entry.source === 'inkorg'
  if (filter === 'alla') return true
  return review?.verdict === filter
}

async function request(url: string, init?: RequestInit): Promise<ReviewFiles<PriceItem>> {
  const res = await fetch(url, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Något gick fel.')
  return data
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
}

export function ReviewPage() {
  const [files, setFiles] = useState<ReviewFiles<PriceItem> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  // Filtret och frågan står i adressen, så att en omladdning visar samma fråga.
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.find((f) => f.id === params.get('filter'))?.id ?? 'alla'

  useEffect(() => {
    request('/__granska/data').then(setFiles, (e: Error) => setError(e.message))
  }, [])

  const entries: Entry[] = files
    ? [
        ...files.items.map((item) => ({ item, source: 'prisdata' as const })),
        ...files.inbox.map((item) => ({ item, source: 'inkorg' as const })),
      ]
    : []
  const filtered = entries.filter((entry) => matchesFilter(entry, files?.reviews[entry.item.id], filter))
  const index = Math.max(0, filtered.findIndex((entry) => keyOf(entry) === params.get('fraga')))
  const entry = filtered[index] as Entry | undefined
  const reviewedCount = entries.filter((e) => files?.reviews[e.item.id]).length

  function show(next: Entry | undefined, nextFilter: Filter = filter) {
    const query: Record<string, string> = { filter: nextFilter }
    if (next) query.fraga = keyOf(next)
    setParams(query, { replace: true })
  }

  const previous = filtered[index - 1]
  const next = filtered[index + 1]

  // Piltangenterna bläddrar, utom när man skriver en kommentar.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : undefined
      if (!target) return
      event.preventDefault()
      const query: Record<string, string> = { filter, fraga: keyOf(target) }
      setParams(query, { replace: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previous, next, filter, setParams])

  async function judge(verdict: Verdict, comment: string) {
    if (!entry) return
    // Efter omdömet visas nästa fråga i listan (eller den förra om det var den sista).
    const after = next ?? previous
    setSaving(true)
    try {
      const updated = await request('/__granska/omdome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.item.id, source: entry.source, verdict, comment }),
      })
      setFiles(updated)
      setError(null)
      show(after)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copyExport() {
    if (!files) return
    await navigator.clipboard.writeText(exportReviews(files.reviews))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!files) {
    return (
      <Wide>
        {error ? (
          <p className="rounded-lg border bg-coral-soft p-4 font-semibold shadow-soft">{error}</p>
        ) : (
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
        )}
      </Wide>
    )
  }

  const review = entry ? files.reviews[entry.item.id] : undefined
  const missing = entry ? missingFields(entry.item) : []

  return (
    <Wide>
      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl">Granska Gissa priset</h1>
            <p className="text-sm text-muted-foreground">
              Granskade {reviewedCount} av {entries.length} · {files.inbox.length} i inkorgen
            </p>
          </div>
          <Button variant="outline" onClick={copyExport} disabled={reviewedCount === 0}>
            <ClipboardCopy /> {copied ? 'Kopierat!' : 'Exportera'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={f.id === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => show(undefined, f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg border bg-coral-soft p-4 font-semibold shadow-soft">{error}</p>}

      {!entry ? (
        <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-soft">
          Inga frågor här.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => show(previous)} disabled={!previous} aria-label="Föregående">
              <ArrowLeft />
            </Button>
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm">
              <span className="font-bold">
                {index + 1} av {filtered.length}
              </span>
              <code className="truncate rounded-full bg-muted px-3 py-0.5">{entry.item.id}</code>
              {entry.source === 'inkorg' && (
                <span className="rounded-full bg-sky-soft px-3 py-0.5 font-bold">Ny</span>
              )}
              {review && (
                <span className={cn('rounded-full px-3 py-0.5 font-bold', VERDICT_STYLES[review.verdict])}>
                  {VERDICT_LABELS[review.verdict]}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => show(next)} disabled={!next} aria-label="Nästa">
              <ArrowRight />
            </Button>
          </div>

          {missing.length > 0 && (
            <p className="rounded-lg border bg-sun-soft p-4 text-sm font-semibold shadow-soft">
              Saknas eller har fel typ: {missing.join(', ')}
            </p>
          )}

          <PriceQuestionCard item={entry.item} />
          <PriceAnswerCard item={entry.item} target={roundSek(entry.item.priceSek)} revealed />
          <PriceFact item={entry.item} />
          {entry.item.source && (
            <a
              href={entry.item.source}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start text-sm font-semibold break-all text-primary hover:underline"
            >
              Källa: {entry.item.source} <ExternalLink className="size-3.5 shrink-0" />
            </a>
          )}

          <ReviewPanel key={keyOf(entry)} initialComment={review?.comment ?? ''} saving={saving} onJudge={judge} />
        </>
      )}
    </Wide>
  )
}

function ReviewPanel({
  initialComment,
  saving,
  onJudge,
}: {
  initialComment: string
  saving: boolean
  onJudge: (verdict: Verdict, comment: string) => void
}) {
  const [comment, setComment] = useState(initialComment)

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-soft sm:p-6">
      <div className="space-y-2">
        <Label htmlFor="kommentar">Kommentar</Label>
        <Textarea
          id="kommentar"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Valfritt, t.ex. vad som behöver fixas"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="lg" disabled={saving} onClick={() => onJudge('godkand', comment)}>
          <Check /> Godkänd
        </Button>
        <Button size="lg" variant="outline" disabled={saving} onClick={() => onJudge('fixa', comment)}>
          <Wrench /> Behöver fixas
        </Button>
        <Button size="lg" variant="destructive" disabled={saving} onClick={() => onJudge('ta-bort', comment)}>
          <Trash2 /> Ta bort
        </Button>
      </div>
    </div>
  )
}
