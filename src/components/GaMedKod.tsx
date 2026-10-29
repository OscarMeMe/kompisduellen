import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasFinePointer } from '@/lib/device'
import { checkLobby, felText } from '@/lib/lobbykoll'
import { normalizeCode } from '@/lib/player'
import { cn } from '@/lib/utils'

type GaMedKodProps = {
  // Etiketten ovanför fältet.
  label?: string
  // large = det stora fältet på sidan Gå med. normal = den lugna ytan på startsidan.
  size?: 'normal' | 'large'
  // Flytta fokus till fältet när sidan öppnas (bara med mus eller styrplatta, så att mobilens tangentbord inte hoppar upp).
  autoFocus?: boolean
  className?: string
}

// Gå med med en kod. Versaler och högst fyra bokstäver, Enter fungerar. Knappen är dov tills koden är komplett.
// Koden kontrolleras innan man går med, så att en felaktig eller avslutad kod ger ett kort besked precis under fältet.
export function GaMedKod({ label = 'Har du fått en kod?', size = 'normal', autoFocus = false, className }: GaMedKodProps) {
  const navigate = useNavigate()
  const fieldId = useId()
  const errorId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // Fel kod: fältet vickar en kort stund. Rätt kod: knappen studsar innan man skickas vidare.
  const [wiggle, setWiggle] = useState(false)
  const [found, setFound] = useState(false)
  const complete = code.length === 4
  const large = size === 'large'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (checking) return
    if (!complete) {
      showError('Koden har fyra bokstäver.')
      return
    }
    setChecking(true)
    const result = await checkLobby(code)
    setChecking(false)
    if (result === 'finns') {
      setFound(true)
      setTimeout(() => navigate(`/lobby/${code}`), 250)
    } else showError(felText(code, result))
  }

  function showError(message: string) {
    setError(message)
    setWiggle(true)
    setTimeout(() => setWiggle(false), 500)
  }

  return (
    <form onSubmit={submit} className={cn('w-full space-y-2', className)} noValidate>
      <Label htmlFor={fieldId} className="text-base font-bold">
        {label}
      </Label>
      <div className={cn('flex gap-2', large && 'flex-col gap-3', wiggle && 'motion-safe:animate-wiggle')}>
        <Input
          id={fieldId}
          value={code}
          onChange={(event) => {
            setCode(normalizeCode(event.target.value))
            setError(null)
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          placeholder="T.ex. BHKX"
          maxLength={4}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus={autoFocus && hasFinePointer()}
          className={cn(
            'min-w-0 flex-1 font-heading font-bold tracking-widest uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case',
            large && 'h-20! flex-none text-center text-4xl tracking-[0.4em] placeholder:text-lg',
          )}
        />
        <Button
          type="submit"
          size="lg"
          variant={complete ? 'default' : 'outline'}
          className={cn(!complete && 'hover:bg-card hover:border-foreground/30', found && 'motion-safe:animate-hop')}
          disabled={checking}
        >
          Gå med
        </Button>
      </div>
      <p id={errorId} role="alert" className="text-sm font-semibold text-primary empty:hidden">
        {error}
      </p>
    </form>
  )
}
