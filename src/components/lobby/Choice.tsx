import { useId } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ChoiceProps = {
  label: string
  hint?: string
  options: { value: number; label: string }[]
  selected: number
  onSelect: (value: number) => void
}

// En rad med val, t.ex. antal rundor. Valt alternativ har en bock, så att det inte bara syns på färgen.
export function Choice({ label, hint, options, selected, onSelect }: ChoiceProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p id={labelId} className="font-bold">
          {label}
        </p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <Button
              key={option.value}
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              className="h-11 min-w-16 text-base"
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
}
