import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Solfjader } from '@/components/kort/Solfjader'
import { PromptCard } from '@/components/kort/PlayingCard'
import { Center, Middle } from '@/components/kortkaos/Kortbord'
import { BLANK_KEY, handCards } from '@/components/kortkaos/hand'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasFinePointer } from '@/lib/device'
import { cleanBlank, type CardMove, type MyHand, type Pick } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'

type ChoosingStepProps = {
  prompt: string
  hand: MyHand
  // Värden har tagit emot att jag tryckt Spela kortet.
  done: boolean
  footer?: ReactNode
  onMove: (move: CardMove) => void
}

// Välj kort: varje val skickas direkt till värden, så att det räknas även utan Spela kortet.
// Valet går att byta tills man trycker på Spela kortet eller tiden tar slut. Det valda kortet syns i frågans lucka.
export function ChoosingStep({ prompt, hand, done, footer, onMove }: ChoosingStepProps) {
  // Mitt senaste val, innan värden hunnit bekräfta det i handen.
  const [picked, setPicked] = useState<Pick | null>(null)
  const [sentDone, setSentDone] = useState(false)
  const [writing, setWriting] = useState(false)
  const gapRef = useRef<HTMLElement>(null)
  const current = picked ?? hand.pick
  const locked = done || sentDone
  const preview = current && (current.kind === 'card' ? kortkaosRules.answerText(current.card) : current.text)
  const selectedKey = current ? (current.kind === 'card' ? current.card : BLANK_KEY) : null
  const cards = handCards(hand, current?.kind === 'blank' ? current.text : undefined)

  function choose(pick: Pick) {
    if (locked) return
    setPicked(pick)
    onMove({ type: 'pick', pick })
  }

  function select(key: string) {
    if (locked) return
    if (key === BLANK_KEY) setWriting(true)
    else choose({ kind: 'card', card: key })
  }

  function finish() {
    if (!current) return
    setSentDone(true)
    setWriting(false)
    onMove({ type: 'done' })
  }

  return (
    <Middle>
      <Center>
        <PromptCard
          prompt={prompt}
          answer={preview ?? undefined}
          gapRef={gapRef}
          footer={footer}
          stamp={locked ? 'Spelat' : undefined}
          className="lg:w-full lg:max-w-2xl"
        />
      </Center>

      {locked ? (
        <div className="space-y-3">
          <p
            role="status"
            className="flex items-center justify-center gap-2 rounded-md bg-mint-soft py-4 font-semibold text-foreground lg:mx-auto lg:w-fit lg:px-6 lg:py-3"
          >
            <Check className="size-5" aria-hidden /> Klart! Väntar på de andra…
          </p>
          {/* På dator ligger handen kvar, nedsjunken och utan att gå att välja. */}
          <div aria-hidden className="hidden translate-y-6 opacity-40 motion-safe:transition motion-safe:duration-200 lg:block">
            <Solfjader label="Din hand" cards={cards} />
          </div>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 lg:justify-center">
            <h2 className="text-xl lg:sr-only">Välj ett kort</h2>
            <span className="text-sm text-background/75 max-lg:hidden">
              Klicka på ett kort, eller tryck 1–{Math.min(9, cards.length)}. Du kan byta tills du spelar kortet.
            </span>
            <span className="text-sm text-background/75 lg:hidden">Du kan byta kort tills du trycker på Spela kortet.</span>
          </div>

          {cards.length === 0 ? (
            <p className="rounded-md bg-muted px-4 py-3 text-center text-muted-foreground">
              Korten är slut, så du står över den här rundan.
            </p>
          ) : (
            <div className="relative">
              <Solfjader label="Din hand" cards={cards} selected={selectedKey} onSelect={select} shortcuts />
              {writing && (
                <BlankCardForm
                  initial={current?.kind === 'blank' ? current.text : ''}
                  onCancel={() => setWriting(false)}
                  onUse={(text) => {
                    choose({ kind: 'blank', text })
                    setWriting(false)
                  }}
                />
              )}
            </div>
          )}

          <div {...SPLAT_SHIELD} className="lg:mx-auto lg:w-full lg:max-w-sm">
            <Button size="lg" className="w-full" disabled={!current} onClick={finish}>
              Spela kortet
            </Button>
          </div>
        </div>
      )}
    </Middle>
  )
}

type BlankCardFormProps = {
  initial: string
  onUse: (text: string) => void
  onCancel: () => void
}

// Formuläret för det blanka kortet. På dator en ruta ovanför handen, så att bordet inte blir högre.
function BlankCardForm({ initial, onUse, onCancel }: BlankCardFormProps) {
  const [text, setText] = useState(initial)
  const id = useId()
  const max = kortkaosRules.blankMaxLength
  const clean = cleanBlank(text, max)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (clean) onUse(clean)
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
      className="mt-3 space-y-3 rounded-lg border bg-card p-4 text-foreground shadow-soft animate-pop lg:absolute lg:bottom-full lg:left-1/2 lg:z-40 lg:mt-0 lg:mb-2 lg:w-md lg:-translate-x-1/2 lg:shadow-lift"
    >
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>Ditt eget svar</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {text.length}/{max}
        </span>
      </div>
      <Input
        id={id}
        value={text}
        maxLength={max}
        onChange={(e) => setText(e.target.value)}
        placeholder="t.ex. grannens hemliga bastu"
        autoComplete="off"
        // Svaret hamnar oftast mitt i en mening, så ingen automatisk stor bokstav.
        autoCapitalize="none"
        autoFocus={hasFinePointer()}
      />
      <p className="text-sm text-muted-foreground">
        Kortet ser ut som alla andra, så ingen vet att det var blankt. Du har ett blankt kort per match.
      </p>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!clean}>
          Använd kortet
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}
