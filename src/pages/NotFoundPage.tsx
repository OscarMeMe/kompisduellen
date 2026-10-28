import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <PageHeader title="Sidan finns inte" description="Vi hittade inte det du letade efter." />
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-soft sm:flex-row">
        <Button asChild size="lg" className="sm:flex-1">
          <Link to="/">Till startsidan</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="sm:flex-1">
          <Link to="/ga-med">Gå med med kod</Link>
        </Button>
      </div>
    </div>
  )
}
