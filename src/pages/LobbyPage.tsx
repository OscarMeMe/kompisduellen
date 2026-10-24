import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function LobbyPage() {
  const { code } = useParams()

  return (
    <>
      <PageHeader title="Väntrum" description="Väntar på att alla ska ansluta…" />
      <div className="rounded-xl border p-6 text-center">
        <p className="text-sm text-muted-foreground">Lobbykod</p>
        <p className="text-4xl font-bold tracking-widest">{code}</p>
      </div>
      <Button asChild size="lg" className="h-12 text-base">
        <Link to={`/spel/${code}`}>Starta spelet</Link>
      </Button>
    </>
  )
}
