import { useLayoutEffect, useRef, type ChangeEvent, type RefObject } from 'react'
import { Input } from '@/components/ui/input'
import { formatTypedNumber } from '@/lib/belopp'

type AmountInputProps = {
  text: string
  onTextChange: (text: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

const countDigits = (text: string) => text.replace(/\D/g, '').length

// Rutan för beloppet. Visar tusental med mellanslag medan man skriver, och håller markören
// på rätt ställe när texten formateras om (annars hoppar den till slutet).
export function AmountInput({ text, onTextChange, inputRef }: AmountInputProps) {
  const display = formatTypedNumber(text)
  // Antal siffror före markören efter senaste ändringen. null = markören ska ligga sist.
  const caretDigits = useRef<number | null>(null)

  // Körs efter varje rendering, eftersom React kan skriva om rutans text även när den ser likadan ut.
  useLayoutEffect(() => {
    const input = inputRef.current
    const digits = caretDigits.current
    caretDigits.current = null
    if (!input || digits === null || document.activeElement !== input) return
    let position = 0
    for (let seen = 0; position < display.length && seen < digits; position++) {
      if (/\d/.test(display[position])) seen++
    }
    input.setSelectionRange(position, position)
  })

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    let next = event.target.value
    let caret = event.target.selectionStart ?? next.length

    // Suddade man bara ett mellanslag tas siffran bredvid bort i stället, annars händer ingenting.
    const onlySpaceRemoved =
      next.length === display.length - 1 && next.replace(/\s/g, '') === display.replace(/\s/g, '')
    if (onlySpaceRemoved && caret > 0) {
      const forward = (event.nativeEvent as InputEvent).inputType === 'deleteContentForward'
      if (forward) next = next.slice(0, caret) + next.slice(caret + 1)
      else {
        next = next.slice(0, caret - 1) + next.slice(caret)
        caret -= 1
      }
    }

    caretDigits.current = caret >= next.length ? null : countDigits(next.slice(0, caret))
    onTextChange(next)
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder="0"
      aria-label="Din gissning, ett tal"
      className="h-20 rounded-2xl text-center text-4xl font-black sm:text-5xl"
      autoFocus
    />
  )
}
