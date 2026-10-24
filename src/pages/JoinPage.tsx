import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeCode } from '@/lib/player'

export function JoinPage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const clean = normalizeCode(code)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (clean.length === 4) navigate(`/lobby/${clean}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <PageHeader title="Gå med" description="Skriv in koden du fått av den som skapade lobbyn." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Lobbykod</Label>
          <Input
            id="code"
            value={clean}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD"
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            className="h-20 rounded-2xl bg-white text-center text-4xl font-black tracking-[0.4em] uppercase"
          />
        </div>
        <Button type="submit" size="lg" className="h-14 rounded-2xl text-lg" disabled={clean.length !== 4}>
          Gå med
        </Button>
      </form>
    </div>
  )
}
