import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'

// Namn och figur som används när du går med i en lobby. De sparas bara i den här webbläsaren. Efter Spara kommer man
// tillbaka till startsidan, där sidhuvudet visar det nya namnet och figuren.
export function ProfilePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-6">
      <PageHeader title="Profil" description="Ändra ditt namn och din figur. De används när du går med i en lobby." />
      <div className="rounded-lg border bg-card p-5 shadow-soft">
        <PlayerSetup submitLabel="Spara" onDone={() => navigate('/')} />
      </div>
    </div>
  )
}
