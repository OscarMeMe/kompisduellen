import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Kompisduellen</h1>
        <p className="text-muted-foreground">Utmana dina vänner – på Discord eller på förfesten.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Button asChild size="lg" className="h-12 text-base">
          <Link to="/skapa">Skapa lobby</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 text-base">
          <Link to="/ga-med">Gå med i ett spel</Link>
        </Button>
      </div>
    </div>
  )
}
