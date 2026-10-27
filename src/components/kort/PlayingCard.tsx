import type { ReactNode } from 'react'
import { GAP, promptParts } from '@/lib/kort'
import { cn } from '@/lib/utils'

// Spelkorten i kortspelen: svarta frågekort och vita svarskort. Samma rundning och skuggor som
// övriga kort, men formade som riktiga kort.

type PromptCardProps = {
  prompt: string
  // Ett svar att visa i luckan, t.ex. kortet man har valt.
  answer?: string
  // Liten text längst ner, t.ex. spelets namn.
  footer?: ReactNode
  className?: string
}

export function PromptCard({ prompt, answer, footer, className }: PromptCardProps) {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col justify-between gap-6 rounded-lg bg-foreground p-6 text-background shadow-soft sm:min-h-56 sm:p-8',
        className,
      )}
    >
      <p className="font-heading text-2xl leading-snug font-bold break-words sm:text-3xl">
        {answer ? <Sentence prompt={prompt} answer={answer} highlight="text-sun" /> : <WithGap prompt={prompt} />}
      </p>
      {footer && <div className="text-sm font-semibold opacity-70">{footer}</div>}
    </div>
  )
}

// Frågan med en tom lucka. Skärmläsare får höra "lucka".
function WithGap({ prompt }: { prompt: string }) {
  const [before, ...rest] = prompt.split(GAP)
  if (rest.length === 0) return <>{prompt}</>
  return (
    <>
      {before}
      <span className="inline-block w-24 border-b-4 border-current align-baseline sm:w-32" aria-hidden />
      <span className="sr-only">lucka</span>
      {rest.join(GAP)}
    </>
  )
}

// Frågan med svaret i luckan. Svaret markeras med en egen färg.
export function Sentence({ prompt, answer, highlight = 'text-primary' }: { prompt: string; answer: string; highlight?: string }) {
  const parts = promptParts(prompt, answer)
  return (
    <>
      {parts.before}
      <strong className={cn('font-bold', highlight)}>{parts.answer}</strong>
      {parts.after}
    </>
  )
}

type AnswerCardProps = {
  children: ReactNode
  // Finns den går kortet att trycka på.
  onSelect?: () => void
  selected?: boolean
  disabled?: boolean
  // Rad längst ner, t.ex. vem som spelade kortet.
  footer?: ReactNode
  // Blankt kort: streckad kant.
  blank?: boolean
  className?: string
}

export function AnswerCard({ children, onSelect, selected, disabled, footer, blank, className }: AnswerCardProps) {
  const classes = cn(
    'flex h-full min-h-40 w-full flex-col justify-between gap-3 rounded-lg border-2 bg-card p-4 text-left font-heading text-lg leading-snug font-bold break-words shadow-soft transition',
    blank && 'border-dashed',
    selected ? 'border-primary ring-4 ring-primary/20 -translate-y-1' : 'border-border',
    onSelect && !disabled && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50',
    onSelect && 'focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none',
    disabled && 'opacity-60',
    className,
  )
  const content = (
    <>
      <span>{children}</span>
      {footer && <span className="font-sans text-sm font-semibold text-muted-foreground">{footer}</span>}
    </>
  )
  if (!onSelect) return <div className={classes}>{content}</div>
  return (
    <button type="button" className={classes} onClick={onSelect} disabled={disabled} aria-pressed={selected}>
      {content}
    </button>
  )
}
