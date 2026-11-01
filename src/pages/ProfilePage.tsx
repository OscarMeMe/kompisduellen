import { useLocation, useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'

// Namn och figur som används när du går med i en lobby. De sparas bara i den här webbläsaren.
export function ProfilePage() {
  const navigate = useNavigate()
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true
  // Om de andra i en lobby får kasta tomater och annat på mig. Sparas direkt i webbläsaren.

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <PageHeader title="Profil" description="Ändra ditt namn och din figur. De används när du går med i en lobby." />
      <div className="rounded-lg border bg-card p-5 shadow-soft">
        {/* Ny plats i historiken gör att sidhuvudet läser in det nya namnet direkt. */}
        <PlayerSetup submitLabel="Spara" onDone={() => navigate('/profil', { replace: true, state: { saved: true } })} />
        <p role="status" className="mt-3 text-center font-semibold text-accent-foreground empty:hidden">
          {saved ? 'Sparat. Det syns nu i sidhuvudet.' : null}
        </p>
      </div>
    </div>
  )
}
