import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Hand, HandSlot } from '@/components/kort/Hand'
import { AnswerCard, PromptCard } from '@/components/kort/PlayingCard'
import { SPLAT_SHIELD } from '@/lib/splatt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasFinePointer } from '@/lib/device'
import { capitalize, cleanBlank, type CardMove, type MyHand, type Pick } from '@/lib/kort'
import { kortkaosRules } from '@/lib/kortkaos'

type ChoosingStepProps = {
  prompt: string
  hand: MyHand
  // Värden har tagit emot mitt Klar.
  done: boolean
  footer?: ReactNode
  onMove: (move: CardMove) => void
}

// Välj kort: varje val skickas direkt till värden, så att det räknas även utan Klar.
// Valet går att byta tills man klickar Klar eller tiden tar slut.
export function ChoosingStep({ prompt, hand, done, footer, onMove }: ChoosingStepProps) {
  // Mitt senaste val, innan värden hunnit bekräfta det i handen.
  const [picked, setPicked] = useState<Pick | null>(null)
  const [sentDone, setSentDone] = useState(false)
  const [writing, setWriting] = useState(false)
  const current = picked ?? hand.pick
  const locked = done || sentDone
  const preview = current && (current.kind === 'card' ? kortkaosRules.answerText(current.card) : current.text)

  function choose(pick: Pick) {
    if (locked) return
    setPicked(pick)
    onMove({ type: 'pick', pick })
  }

  function finish() {
    if (!current) return
    setSentDone(true)
    setWriting(false)
    onMove({ type: 'done' })
  }

  return (
    <>
      <PromptCard prompt={prompt} answer={preview ?? undefined} footer={footer} />

      {locked ? (
        <p role="status" className="flex items-center justify-center gap-2 rounded-md bg-mint-soft py-4 font-semibold">
          <Check className="size-5" aria-hidden /> Klart! Väntar på de andra…
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-xl">Välj ett kort</h2>
            <span className="text-sm text-muted-foreground">Du kan byta tills du klickar Klar</span>
          </div>

          {hand.cards.length === 0 && !hand.blank ? (
            <p className="rounded-md bg-muted px-4 py-3 text-center text-muted-foreground">
              Korten är slut, så du står över den här rundan.
            </p>
          ) : (
            <Hand label="Din hand">
              {hand.cards.map((card) => (
                <HandSlot key={card}>
                  <AnswerCard
                    selected={current?.kind === 'card' && current.card === card}
                    onSelect={() => choose({ kind: 'card', card })}
                  >
                    {capitalize(kortkaosRules.answerText(card))}
                  </AnswerCard>
                </HandSlot>
              ))}
              {hand.blank && (
                <HandSlot>
                  <AnswerCard
                    blank
                    selected={current?.kind === 'blank'}
                    onSelect={() => setWriting(true)}
                    footer={current?.kind === 'blank' ? 'Tryck för att ändra' : 'Skriv ett eget svar'}
                  >
                    {current?.kind === 'blank' ? capitalize(current.text) : 'Blankt kort'}
                  </AnswerCard>
                </HandSlot>
              )}
            </Hand>
          )}

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

          <div {...SPLAT_SHIELD}>
            <Button size="lg" className="w-full" disabled={!current} onClick={finish}>
              Klar
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

type BlankCardFormProps = {
  initial: string
  onUse: (text: string) => void
  onCancel: () => void
}

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4 shadow-soft animate-pop">
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
