import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Sidan finns inte" description="Vi hittade inte det du letade efter." />
      <Button asChild size="lg">
        <Link to="/">Till startsidan</Link>
      </Button>
    </>
  )
}
