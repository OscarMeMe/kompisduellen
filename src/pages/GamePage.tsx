import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function GamePage() {
  const { code } = useParams()

  return (
    <>
      <PageHeader title="Spel" description="Här kommer frågorna och duellerna att visas." />
      <Button asChild size="lg" className="h-12 text-base">
        <Link to={`/resultat/${code}`}>Visa resultat</Link>
      </Button>
    </>
  )
}
