import { Choice } from '@/components/lobby/Choice'
import { CATEGORIES, type ImposterSettings } from '@/lib/imposterjakten'

// Värdens val för Imposterjakten i väntrummet: svårighet, kategori och om ni sitter tillsammans (säger orden högt) eller
// spelar på distans (skriver orden).
// Antal omgångar väljs som antal rundor i de andra spelen.
export function ImposterSettingsChoices({
  settings,
  onChange,
}: {
  settings: ImposterSettings
  onChange: (settings: Partial<ImposterSettings>) => void
}) {
  return (
    <>
      <Choice
        label="Svårighet"
        hint="Välj hur mycket hjälp impostern får."
        note="Normal: impostern får en vag ledtråd. Svår: ingen ledtråd alls. Lurig: impostern får ett liknande ord och vet inte om att den är impostern."
        options={[
          { value: 0, label: 'Normal' },
          { value: 1, label: 'Svår' },
          { value: 2, label: 'Lurig' },
        ]}
        selected={settings.tricky ? 2 : settings.hard ? 1 : 0}
        onSelect={(value) => onChange({ hard: value === 1, tricky: value === 2 })}
      />
      <Choice
        label="Kategori"
        hint="Väljer du en kategori ser alla den, även impostern."
        options={[{ value: 0, label: 'Blandat' }, ...CATEGORIES.map((category, i) => ({ value: i + 1, label: category }))]}
        selected={settings.category === null ? 0 : CATEGORIES.indexOf(settings.category) + 1}
        onSelect={(value) => onChange({ category: value === 0 ? null : CATEGORIES[value - 1] })}
      />
      <Choice
        label="Sitter ni tillsammans?"
        hint="Tillsammans säger ni orden högt. På distans skriver ni dem."
        options={[
          { value: 1, label: 'Ja, vi sitter tillsammans' },
          { value: 0, label: 'Nej, vi spelar på distans' },
        ]}
        selected={settings.aloud ? 1 : 0}
        onSelect={(value) => onChange({ aloud: value === 1 })}
      />
    </>
  )
}
