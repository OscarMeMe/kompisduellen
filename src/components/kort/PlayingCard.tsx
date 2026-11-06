import type { ComponentProps, MouseEvent, ReactNode, Ref } from 'react'
import { GAP, promptParts } from '@/lib/kort'
import { cn } from '@/lib/utils'

// Spelkorten i kortspelen: svarta frågekort och vita svarskort. Samma rundning och skuggor som
// övriga kort, men formade som riktiga kort.
// Långa ord bryts bara vid de mjuka bindestrecken (­) i kortens text, mellan orddelarna i sammansatta ord
// (hyphens-manual). Webbläsarens egen avstavning gissar ibland fel ("rumpav-tryck"). break-words finns kvar som
// reserv.

type PromptCardProps = {
  prompt: string
  // Ett svar att visa i luckan, t.ex. kortet man har valt.
  answer?: string
  // Luckan (tom eller med svaret), t.ex. dit ett valt kort flyger.
  gapRef?: Ref<HTMLElement>
  // Liten text längst ner, t.ex. spelets namn.
  footer?: ReactNode
  // En stämpel i hörnet, t.ex. "Spelat" när kortet är spelat.
  stamp?: ReactNode
  className?: string
}

// Frågekortet har en tunn ljus kant och en tydlig skugga, så att det syns även mot Kortkaos mörka bord.
export function PromptCard({ prompt, answer, gapRef, footer, stamp, className }: PromptCardProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-48 flex-col justify-between gap-6 rounded-lg bg-foreground p-6 text-background shadow-lift ring-2 ring-background/20 sm:min-h-56 sm:p-8 lg:short:min-h-40 lg:short:gap-4 lg:short:p-6',
        className,
      )}
    >
      <p className="font-heading text-2xl leading-snug font-bold break-words hyphens-manual sm:text-3xl lg:short:text-2xl">
        {answer ? (
          <Sentence
            prompt={prompt}
            answer={answer}
            highlight="text-sun"
            answerRef={gapRef}
            // Svaret tonas in när kortet har landat i luckan. Ny key när svaret byts.
            answerClassName="motion-safe:animate-[fade-in_0.2s_ease-out_0.12s_both]"
          />
        ) : (
          <WithGap prompt={prompt} gapRef={gapRef} />
        )}
      </p>
      {footer && <div className="text-sm font-semibold opacity-70">{footer}</div>}
      {stamp && (
        <span className="absolute -top-3 right-5 rotate-6 rounded-full border-2 border-foreground bg-mint px-3 py-1 font-heading text-sm font-bold text-foreground shadow-soft-sm motion-safe:animate-stamp">
          {stamp}
        </span>
      )}
    </div>
  )
}

// Frågan med en tom lucka. Skärmläsare får höra "lucka".
function WithGap({ prompt, gapRef }: { prompt: string; gapRef?: Ref<HTMLElement> }) {
  const [before, ...rest] = prompt.split(GAP)
  if (rest.length === 0) return <>{prompt}</>
  return (
    <>
      {before}
      <span ref={gapRef} className="inline-block w-24 border-b-4 border-current align-baseline sm:w-32" aria-hidden />
      <span className="sr-only">lucka</span>
      {rest.join(GAP)}
    </>
  )
}

// Frågan med svaret i luckan. Svaret markeras med en egen färg.
export function Sentence({
  prompt,
  answer,
  highlight = 'text-primary',
  answerRef,
  answerClassName,
}: {
  prompt: string
  answer: string
  highlight?: string
  answerRef?: Ref<HTMLElement>
  answerClassName?: string
}) {
  const parts = promptParts(prompt, answer)
  return (
    <>
      {parts.before}
      <strong key={answer} ref={answerRef} className={cn('font-bold', highlight, answerClassName)}>
        {parts.answer}
      </strong>
      {parts.after}
    </>
  )
}

type AnswerCardProps = {
  children: ReactNode
  // Finns den går kortet att trycka på.
  onSelect?: (event: MouseEvent<HTMLButtonElement>) => void
  selected?: boolean
  disabled?: boolean
  // Rad längst ner, t.ex. vem som spelade kortet.
  footer?: ReactNode
  // Blankt kort: streckad kant.
  blank?: boolean
  className?: string
} & Omit<ComponentProps<'button'>, 'children' | 'onSelect' | 'onClick' | 'className' | 'disabled' | 'type'>

export function AnswerCard({ children, onSelect, selected, disabled, footer, blank, className, ...rest }: AnswerCardProps) {
  const classes = cn(
    'flex h-full min-h-40 w-full flex-col justify-between gap-3 rounded-lg border-2 bg-card p-4 text-left font-heading text-lg leading-snug font-bold text-card-foreground break-words hyphens-manual shadow-soft transition',
    blank && 'border-dashed',
    selected ? 'border-primary ring-4 ring-primary/20 -translate-y-1' : 'border-border',
    onSelect && !disabled && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50',
    onSelect && 'focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none',
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
    <button {...rest} type="button" className={classes} onClick={onSelect} disabled={disabled} aria-pressed={selected}>
      {content}
    </button>
  )
}
