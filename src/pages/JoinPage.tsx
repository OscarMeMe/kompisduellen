import { GaMedKod } from '@/components/GaMedKod'
import { PageHeader } from '@/components/PageHeader'

export function JoinPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <PageHeader title="Gå med" description="Skriv in koden du fått av den som skapade lobbyn." />
      <div className="rounded-lg border bg-card p-5 shadow-soft">
        <GaMedKod label="Lobbykod" size="large" autoFocus />
      </div>
    </div>
  )
}
