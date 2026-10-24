import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function CreateLobbyPage() {
  return (
    <>
      <PageHeader title="Skapa lobby" description="Här väljer du spelläge och bjuder in dina kompisar." />
      <Button asChild size="lg" className="h-12 text-base">
        <Link to="/lobby/ABCD">Skapa (platshållare)</Link>
      </Button>
    </>
  )
}
