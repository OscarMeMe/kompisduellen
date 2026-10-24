import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinPage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (code.trim()) navigate(`/lobby/${code.trim().toUpperCase()}`)
  }

  return (
    <>
      <PageHeader title="Gå med" description="Skriv in koden du fått av den som skapade lobbyn." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Lobbykod</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="T.ex. ABCD"
            autoComplete="off"
            autoCapitalize="characters"
            className="h-12 text-center text-2xl tracking-widest uppercase"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 text-base" disabled={!code.trim()}>
          Gå med
        </Button>
      </form>
    </>
  )
}
