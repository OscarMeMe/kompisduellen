import { useId } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ChoiceProps = {
  label: string
  hint?: string
  // Förklaring under hela raden, i liten dämpad text.
  note?: string
  options: { value: number; label: string }[]
  selected: number
  onSelect: (value: number) => void
}

// En rad med val, t.ex. antal rundor. Valt alternativ har en bock, så att det inte bara syns på färgen.
export function Choice({ label, hint, note, options, selected, onSelect }: ChoiceProps) {
  const labelId = useId()
  const row = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p id={labelId} className="font-bold">
          {label}
        </p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5 sm:gap-2">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <Button
              key={option.value}
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              className="h-11 min-w-16 px-3 text-base sm:px-4"
              onClick={() => onSelect(option.value)}
            >
              {active && <Check aria-hidden />}
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
  if (!note) return row
  return (
    <div className="space-y-1.5">
      {row}
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  )
}

// Gissa priset: om nästa fråga kommer av sig själv efter rätt svar eller när värden klickar. Samma ord i väntrummet
// och i snabbvalen efter matchen.
export const NEXT_QUESTION_LABEL = 'Nästa fråga'
export const AUTO_ADVANCE_TEXT = 'Automatiskt'
export const HOST_ADVANCES_TEXT = 'Värden klickar'

export function NextQuestionChoice({ autoAdvance, onSelect }: { autoAdvance: boolean; onSelect: (auto: boolean) => void }) {
  return (
    <Choice
      label={NEXT_QUESTION_LABEL}
      note="Efter varje fråga visas rätt svar. Välj om nästa fråga kommer av sig själv eller när värden klickar."
      options={[
        { value: 1, label: AUTO_ADVANCE_TEXT },
        { value: 0, label: HOST_ADVANCES_TEXT },
      ]}
      selected={autoAdvance ? 1 : 0}
      onSelect={(value) => onSelect(value === 1)}
    />
  )
}
