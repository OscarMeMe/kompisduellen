import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function ResultsPage() {
  return (
    <>
      <PageHeader title="Resultat" description="Här visas vem som vann duellen." />
      <Button asChild size="lg" variant="outline" className="h-12 text-base">
        <Link to="/">Till startsidan</Link>
      </Button>
    </>
  )
}
