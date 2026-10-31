import { Choice } from '@/components/lobby/Choice'
import { CATEGORIES, type ImposterSettings } from '@/lib/imposterjakten'

// Värdens val för Imposterjakten i väntrummet: svårighet, kategori och om associationerna skrivs eller sägs högt.
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
        note="Normal: impostern får en vag ledtråd. Svår: ingen ledtråd alls."
        options={[
          { value: 0, label: 'Normal' },
          { value: 1, label: 'Svår' },
        ]}
        selected={settings.hard ? 1 : 0}
        onSelect={(value) => onChange({ hard: value === 1 })}
      />
      <Choice
        label="Kategori"
        hint="Väljer du en kategori ser alla den, även impostern."
        options={[{ value: 0, label: 'Blandat' }, ...CATEGORIES.map((category, i) => ({ value: i + 1, label: category }))]}
        selected={settings.category === null ? 0 : CATEGORIES.indexOf(settings.category) + 1}
        onSelect={(value) => onChange({ category: value === 0 ? null : CATEGORIES[value - 1] })}
      />
      <Choice
        label="Associationer"
        hint="Skriv orden i appen, eller säg dem högt när ni sitter tillsammans."
        options={[
          { value: 0, label: 'Skriv i appen' },
          { value: 1, label: 'Säg högt' },
        ]}
        selected={settings.aloud ? 1 : 0}
        onSelect={(value) => onChange({ aloud: value === 1 })}
      />
    </>
  )
}
