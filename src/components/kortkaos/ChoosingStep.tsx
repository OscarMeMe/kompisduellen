import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { flyToGap } from '@/components/kort/flyga'
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
import { cn } from '@/lib/utils'

type ChoosingStepProps = {
  prompt: string
  hand: MyHand
  // Värden har tagit emot att jag tryckt Spela kortet.
  done: boolean
  footer?: ReactNode
  onMove: (move: CardMove) => void
}

// Välj kort: varje val skickas direkt till värden, så att det räknas även utan Spela kortet.
// Valet går att byta tills man trycker på Spela kortet eller tiden tar slut. Det valda kortet glider upp och syns i
// frågans lucka. På dator går kortet också att dra upp till frågekortet.
export function ChoosingStep({ prompt, hand, done, footer, onMove }: ChoosingStepProps) {
  // Mitt senaste val, innan värden hunnit bekräfta det i handen.
  const [picked, setPicked] = useState<Pick | null>(null)
  const [sentDone, setSentDone] = useState(false)
  const [writing, setWriting] = useState(false)
  const gapRef = useRef<HTMLElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  // Ett kort dras och släpps det nu hamnar det i luckan.
  const [dropReady, setDropReady] = useState(false)
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

  function select(key: string, el: HTMLElement) {
    if (locked) return
    if (key === BLANK_KEY) return setWriting(true)
    if (current?.kind !== 'card' || current.card !== key) flyToGap(el, gapRef.current)
    choose({ kind: 'card', card: key })
  }

  function finish() {
    if (!current) return
    setSentDone(true)
    setWriting(false)
    onMove({ type: 'done' })
  }

  return (
    <Middle>
      <Center ref={promptRef}>
        <PromptCard
          prompt={prompt}
          answer={preview ?? undefined}
          gapRef={gapRef}
          footer={footer}
          stamp={locked ? 'Spelat' : undefined}
          className={cn('lg:w-full lg:max-w-2xl lg:transition-shadow', dropReady && 'ring-4 ring-sun')}
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
          {/* På dator ligger handen kvar, nedsjunken och utan att gå att välja. Det spelade kortet är borta ur handen. */}
          <div aria-hidden className="pointer-events-none hidden translate-y-3 opacity-40 motion-safe:transition motion-safe:duration-200 lg:block">
            <Solfjader label="Din hand" cards={cards.filter((card) => card.key !== selectedKey)} />
          </div>
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 lg:hidden">
            <h2 className="text-xl">Välj ett kort</h2>
            <span className="text-sm font-medium text-background">Du kan byta kort tills du trycker på Spela kortet.</span>
          </div>
          <h2 className="sr-only max-lg:hidden">Välj ett kort</h2>

          {cards.length === 0 ? (
            <p className="rounded-md bg-muted px-4 py-3 text-center text-muted-foreground">
              Korten är slut, så du står över den här rundan.
            </p>
          ) : (
            <div className="relative">
              <Solfjader
                label="Din hand"
                cards={cards}
                selected={selectedKey}
                onSelect={select}
                shortcuts
                dropTarget={promptRef}
                onDropReady={setDropReady}
              />
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

          {/* På dator står tipsen bredvid knappen, så att handen får plats. */}
          <div className="lg:grid lg:grid-cols-[1fr_minmax(0,20rem)_1fr] lg:items-center lg:gap-4">
            <p className="hidden text-right text-sm font-medium text-background lg:block">
              Klicka, dra upp eller tryck 1–{Math.min(9, cards.length)}
            </p>
            <div {...SPLAT_SHIELD}>
              <Button size="lg" className="w-full" disabled={!current} onClick={finish}>
                Spela kortet
              </Button>
            </div>
            <p className="hidden text-sm font-medium text-background lg:block">Du kan byta tills du spelar kortet</p>
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
