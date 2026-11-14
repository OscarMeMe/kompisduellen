import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Save, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { Stamp } from '@/components/Stamp'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { checkClue } from '@/lib/imposterjakten'
import {
  categoryCounts,
  LEVEL_LABELS,
  LEVELS,
  MIN_PER_CATEGORY,
  newWordId,
  parseForms,
  reviewedCount,
  smallCategories,
  tooSmallAfterMoving,
  tooSmallAfterRemoving,
  wordError,
  type ReviewWord,
  type WordFiles,
} from '@/lib/ordgranskning'
import { cn } from '@/lib/utils'

// Granskningssidan för Imposterjaktens ord (/granska-ord). Finns bara med npm run dev och byggs aldrig in i sajten.
// Varje ord är ett kort där allt går att ändra och spara, godkänna eller kasta. Ändringarna skrivs till
// src/lib/imposterjakten.json och omdömena till granskning-ord.json via dev-servern (vite-plugin-granska-ord.ts).
// Ett beslut går att ångra tills sidan laddas om. Byggd för dator.

type Status = 'ej' | 'godkand' | 'alla'
const STATUSES: { value: Status; label: string }[] = [
  { value: 'ej', label: 'Ej granskad' },
  { value: 'godkand', label: 'Godkänd' },
  { value: 'alla', label: 'Alla' },
]

// Så länge står ett ord kvar i listan efter ett beslut (ms), så att det går att ångra direkt. Sedan flyttar det till sin
// flik: ett godkänt ord till Godkänd, och ett ord vars godkännande ångrats tillbaka till Ej granskad.
const STAY_MS = 5000

// Det som är fel i ett ord, i klartext, eller null: reglerna för att spara (wordError), och att ledtråden och nära-ordet
// inte spärras av ordet självt i spelet (checkClue, t.ex. Kickboxning som nära-ord till Boxning).
function wordProblem(word: ReviewWord, words: readonly ReviewWord[]): string | null {
  const error = wordError(word, words)
  if (error) return error
  for (const [label, text] of [
    ['Ledtråden', word.ledtrad],
    ['Nära-ordet', word.nara],
  ] as const) {
    const joined = text.replace(/\s+/g, '')
    if (/^[\p{L}\p{N}-]+$/u.test(joined) && !checkClue(joined, word, []).ok) return `${label} spärras av ordet självt i spelet (det liknar ordet eller en godkänd form).`
  }
  return null
}

// Ett kastat ord som går att lägga tillbaka: ordet, platsen det stod på och om det var godkänt.
type Thrown = { word: ReviewWord; index: number; approved: boolean }

async function call(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`/__granska-ord${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await response.json()) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Något gick fel.')
  return data
}

export function OrdGranskningPage() {
  const [files, setFiles] = useState<WordFiles | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('alla')
  const [status, setStatus] = useState<Status>('ej')
  // Ord som nyss fått ett beslut står kvar i listan i STAY_MS, så att beslutet går att ångra direkt. Sedan syns de i
  // sin egen flik (Godkänd eller Ej granskad), där beslutet också går att ångra.
  const [decided, setDecided] = useState<string[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const running = timers.current
    return () => running.forEach((timer) => clearTimeout(timer))
  }, [])
  const [thrown, setThrown] = useState<Thrown[]>([])
  // Frågan en gång till innan ett ord kastas ur en kategori som då får för få ord.
  const [confirm, setConfirm] = useState<{ word: ReviewWord; category: string; count: number } | null>(null)
  // Det tomma kortet för ett nytt ord, med kategorin förvald. null = inget öppet.
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    call('/data')
      .then((data) => setFiles(data as unknown as WordFiles))
      .catch((reason: Error) => setError(reason.message))
  }, [])

  const counts = useMemo(() => (files ? categoryCounts(files.words) : []), [files])
  // Ord som inte klarar reglerna, t.ex. nya ord som lagts in i filen för hand.
  const broken = useMemo(() => (files ? files.words.filter((word) => wordProblem(word, files.words) !== null) : []), [files])
  if (error && !files) return <p className="py-10 text-center font-semibold text-destructive">{error}</p>
  if (!files) return <p className="py-10 text-center text-muted-foreground">Laddar orden…</p>

  const { words, reviews } = files
  const approved = (id: string) => reviews[id]?.verdict === 'godkand'
  const small = smallCategories(words)
  const done = reviewedCount(words, reviews)

  async function run(action: () => Promise<Record<string, unknown>>, after?: (data: Record<string, unknown>) => void) {
    try {
      const data = await action()
      setFiles({ words: data.words as ReviewWord[], reviews: data.reviews as WordFiles['reviews'] })
      setError(null)
      after?.(data)
    } catch (reason) {
      setError((reason as Error).message)
    }
  }
  function remember(id: string) {
    setDecided((ids) => (ids.includes(id) ? ids : [...ids, id]))
    // Ett nytt beslut om samma ord börjar om tiden.
    clearTimeout(timers.current.get(id))
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id)
        setDecided((ids) => ids.filter((other) => other !== id))
      }, STAY_MS),
    )
  }

  const approve = (id: string, on: boolean) => run(() => call('/godkann', { id, approved: on }), () => remember(id))
  const save = (word: ReviewWord) => run(() => call('/spara', { word }))
  // Ett nytt ord läggs sist i filen, räknas som godkänt direkt och står kvar i listan oavsett filter.
  const add = (word: Omit<ReviewWord, 'id'>) =>
    run(
      () => call('/lagg-till', { word }),
      (data) => {
        remember((data.added as ReviewWord).id)
        setAdding(null)
      },
    )
  const reallyThrow = (word: ReviewWord) =>
    run(
      () => call('/kasta', { id: word.id }),
      (data) => setThrown((list) => [...list, { word: data.removed as ReviewWord, index: data.index as number, approved: data.wasApproved === true }]),
    )
  function throwAway(word: ReviewWord) {
    const tooSmall = tooSmallAfterRemoving(words, word.id)
    if (tooSmall) setConfirm({ word, ...tooSmall })
    else void reallyThrow(word)
  }
  const restore = (item: Thrown) =>
    run(
      () => call('/aterstall', { word: item.word, index: item.index, approved: item.approved }),
      () => {
        setThrown((list) => list.filter((other) => other.word.id !== item.word.id))
        remember(item.word.id)
      },
    )

  const shown = words.filter((word) => {
    if (category !== 'alla' && word.kategori !== category) return false
    if (decided.includes(word.id)) return true
    return status === 'alla' || (status === 'godkand') === approved(word.id)
  })
  const shownThrown = thrown.filter((item) => category === 'alla' || item.word.kategori === category)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pt-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl">Granska orden i Imposterjakten</h1>
            <p className="text-muted-foreground">Bara lokalt. Ändringar skrivs direkt till imposterjakten.json.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-mint-soft px-4 py-2 font-heading text-lg font-bold tabular-nums" role="status">
              {done} av {words.length} granskade
            </p>
            {/* Lägg till ord, med kategorin som är vald förvald (annars den första). */}
            <Button onClick={() => setAdding(category === 'alla' ? (counts[0]?.category ?? '') : category)}>
              <Plus aria-hidden />
              {category === 'alla' ? 'Lägg till ord' : `Lägg till ord i ${category}`}
            </Button>
          </div>
        </div>

        {small.length > 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-coral-soft px-4 py-3 font-bold">
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
            <span>
              För få ord: {small.map((entry) => `${entry.category} har ${entry.count}`).join(', ')}. Varje kategori behöver minst {MIN_PER_CATEGORY}, annars slår testerna fel och orden kan ta slut
              under en match.
            </span>
          </p>
        )}

        {broken.length > 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-coral-soft px-4 py-3 font-bold">
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
            <span>
              {broken.length} ord behöver rättas innan testerna går igenom: {broken.map((word) => word.ord).join(', ')}. Felet står på varje kort.
            </span>
          </p>
        )}

        {/* Antalet ord per kategori. Ett tryck filtrerar på kategorin. */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategori">
          <CategoryChip label="Alla" count={words.length} active={category === 'alla'} onClick={() => setCategory('alla')} />
          {counts.map((entry) => (
            <CategoryChip
              key={entry.category}
              label={entry.category}
              count={entry.count}
              warn={entry.count < MIN_PER_CATEGORY}
              active={category === entry.category}
              onClick={() => setCategory(entry.category)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Status" className="flex rounded-full bg-muted p-1">
            {STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={status === option.value}
                onClick={() => setStatus(option.value)}
                className={cn(
                  'h-10 rounded-full px-4 font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  status === option.value ? 'bg-card shadow-soft-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Visar {shown.length} ord{shownThrown.length > 0 ? ` och ${shownThrown.length} kastade` : ''}. Ett ord du nyss bestämt dig om står kvar i 5 sekunder och flyttar sedan till sin flik.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-coral-soft px-4 py-2 font-semibold text-destructive">
            {error}
          </p>
        )}
      </header>

      {/* Det tomma kortet för ett nytt ord. Ny key när kategorin byts, så att den förvalda kategorin följer med. */}
      {adding !== null && (
        <NewWordCard key={adding} category={adding} words={words} categories={counts.map((entry) => entry.category)} onAdd={(word) => void add(word)} onCancel={() => setAdding(null)} />
      )}

      {/* Kastade ord, som går att lägga tillbaka tills sidan laddas om. */}
      {shownThrown.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shownThrown.map((item) => (
            <li key={item.word.id} className="flex items-center gap-3 rounded-lg border-2 border-dashed border-destructive/50 bg-card/60 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-lg font-bold text-muted-foreground line-through">{item.word.ord}</p>
                <p className="text-sm text-muted-foreground">Kastat ur {item.word.kategori}</p>
              </div>
              <Button variant="outline" onClick={() => void restore(item)}>
                <Undo2 aria-hidden />
                Ångra
              </Button>
            </li>
          ))}
        </ul>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-soft">Inga ord att visa här.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((word) => (
            <WordCard
              // Kortet börjar om när ordet sparats, så att fälten visar det som står i filen.
              key={`${word.id}-${JSON.stringify(word)}`}
              word={word}
              words={words}
              categories={counts.map((entry) => entry.category)}
              approved={approved(word.id)}
              onApprove={(on) => void approve(word.id, on)}
              onThrow={() => throwAway(word)}
              onSave={(changed) => void save(changed)}
            />
          ))}
        </ul>
      )}

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kasta {confirm?.word.ord} ändå?</DialogTitle>
            <DialogDescription>
              Då har {confirm?.category} bara {confirm?.count} ord. Varje kategori behöver minst {MIN_PER_CATEGORY}, annars slår testerna fel och orden kan ta slut under en match.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Behåll ordet
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm) void reallyThrow(confirm.word)
                setConfirm(null)
              }}
            >
              Kasta ändå
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryChip({ label, count, warn = false, active, onClick }: { label: string; count: number; warn?: boolean; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center gap-2 rounded-full border-2 px-3 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active ? 'border-foreground bg-foreground text-background' : warn ? 'border-destructive bg-coral-soft' : 'bg-card hover:bg-muted',
      )}
    >
      {warn && <TriangleAlert aria-label="För få ord" className="size-4 text-destructive" />}
      {label}
      <span className={cn('rounded-full px-2 text-sm font-bold tabular-nums', active ? 'bg-background/20' : 'bg-muted')}>{count}</span>
    </button>
  )
}

// Ett ord som ett kort: alla fält går att ändra, och Spara skriver dem till filen. Id:t visas men ändras aldrig.
function WordCard({
  word,
  words,
  categories,
  approved,
  onApprove,
  onThrow,
  onSave,
}: {
  word: ReviewWord
  words: readonly ReviewWord[]
  categories: string[]
  approved: boolean
  onApprove: (on: boolean) => void
  onThrow: () => void
  onSave: (word: ReviewWord) => void
}) {
  const [draft, setDraft] = useState({ ord: word.ord, kategori: word.kategori, ledtrad: word.ledtrad, nara: word.nara, godkanda: word.godkanda.join(', '), svarighet: word.svarighet })
  const changed: ReviewWord = { id: word.id, ord: draft.ord, kategori: draft.kategori, ledtrad: draft.ledtrad, nara: draft.nara, godkanda: parseForms(draft.godkanda), svarighet: draft.svarighet }
  const dirty = JSON.stringify({ ...changed, ord: changed.ord.trim(), ledtrad: changed.ledtrad.trim(), nara: changed.nara.trim() }) !== JSON.stringify(word)
  // Felet visas alltid, även på ett ord som ingen ändrat (t.ex. ett nytt ord som lagts in i filen för hand).
  const problem = wordProblem(changed, words)
  const moving = dirty ? tooSmallAfterMoving(words, word.id, draft.kategori) : null
  const set = (field: keyof typeof draft) => (value: string) => setDraft((now) => ({ ...now, [field]: value }))

  return (
    <li className={cn('relative space-y-3 rounded-lg border-2 bg-card p-4 shadow-soft', approved ? 'border-accent' : 'border-border')}>
      {approved && (
        <Stamp className="pointer-events-none absolute top-3 right-3 z-10 border-accent bg-card/85 text-lg text-accent">Godkänd</Stamp>
      )}
      <Fields draft={draft} set={set} categories={categories} />

      {problem && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {problem}
        </p>
      )}
      {moving && !problem && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          Flyttas ordet har {moving.category} bara {moving.count} ord (minst {MIN_PER_CATEGORY} behövs).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={!dirty || problem !== null} onClick={() => onSave(changed)}>
          <Save aria-hidden />
          Spara
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft({ ord: word.ord, kategori: word.kategori, ledtrad: word.ledtrad, nara: word.nara, godkanda: word.godkanda.join(', '), svarighet: word.svarighet })}>
            Återställ
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">id: {word.id}</span>
        {approved ? (
          <Button variant="outline" onClick={() => onApprove(false)}>
            <Undo2 aria-hidden />
            Ångra godkänd
          </Button>
        ) : (
          // Osparade ändringar sparas först, så att det som godkänns är det som står i filen. Ett ord med fel går inte att godkänna.
          <Button disabled={dirty || problem !== null} title={dirty ? 'Spara ändringarna först' : problem ? 'Rätta felet först' : undefined} onClick={() => onApprove(true)}>
            <Check aria-hidden />
            Godkänn
          </Button>
        )}
        <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-coral-soft hover:text-destructive" onClick={onThrow}>
          <Trash2 aria-hidden />
          Kasta
        </Button>
      </div>
    </li>
  )
}

type Draft = { ord: string; kategori: string; ledtrad: string; nara: string; godkanda: string; svarighet: string }

// Fälten på ett kort: ordet, kategorin, svårigheten, ledtråden, nära-ordet och de godkända formerna.
function Fields({ draft, set, categories }: { draft: Draft; set: (field: keyof Draft) => (value: string) => void; categories: string[] }) {
  const select = 'h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Ordet" className="col-span-2">
        <Input value={draft.ord} onChange={(event) => set('ord')(event.target.value)} className="font-heading text-lg font-bold" />
      </Field>
      <Field label="Kategori">
        <select value={draft.kategori} onChange={(event) => set('kategori')(event.target.value)} className={select}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Svårighet">
        <select value={draft.svarighet} onChange={(event) => set('svarighet')(event.target.value)} className={select}>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ledtråd till impostern (Normal)">
        <Input value={draft.ledtrad} onChange={(event) => set('ledtrad')(event.target.value)} />
      </Field>
      <Field label="Nära-ord (Lurig)">
        <Input value={draft.nara} onChange={(event) => set('nara')(event.target.value)} />
      </Field>
      <Field label="Godkända former, med komma emellan" className="col-span-2">
        <Input value={draft.godkanda} onChange={(event) => set('godkanda')(event.target.value)} />
      </Field>
    </div>
  )
}

// Det tomma kortet för ett nytt ord, med kategorin förvald. Samma regler och felmeddelanden som när ett ord ändras,
// och ett ord som redan finns i listan stoppas (utan hänsyn till stora och små bokstäver). Sparas ordet läggs det sist
// i filen med ett nytt id och räknas som godkänt direkt.
function NewWordCard({
  category,
  words,
  categories,
  onAdd,
  onCancel,
}: {
  category: string
  words: readonly ReviewWord[]
  categories: string[]
  onAdd: (word: Omit<ReviewWord, 'id'>) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>({ ord: '', kategori: category, ledtrad: '', nara: '', godkanda: '', svarighet: 'mellan' })
  const set = (field: keyof Draft) => (value: string) => setDraft((now) => ({ ...now, [field]: value }))
  const fields = { ord: draft.ord, kategori: draft.kategori, ledtrad: draft.ledtrad, nara: draft.nara, godkanda: parseForms(draft.godkanda), svarighet: draft.svarighet }
  // Felet visas först när något är ifyllt, så att det tomma kortet inte börjar med en varning.
  const started = [draft.ord, draft.ledtrad, draft.nara, draft.godkanda].some((text) => text.trim() !== '')
  const problem = wordProblem({ ...fields, id: '' }, words)
  return (
    <section aria-label="Nytt ord" className="space-y-3 rounded-lg border-2 border-primary bg-card p-4 shadow-soft">
      <h2 className="text-xl">Nytt ord</h2>
      <Fields draft={draft} set={set} categories={categories} />
      <p className="text-sm text-muted-foreground">
        Ordet läggs sist i imposterjakten.json, får ett eget id{draft.ord.trim() ? ` (${newWordId(draft.ord, words.map((word) => word.id))})` : ''} och räknas som godkänt direkt.
      </p>
      {started && problem && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={problem !== null} onClick={() => onAdd(fields)}>
          <Save aria-hidden />
          Spara nytt ord
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </section>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
