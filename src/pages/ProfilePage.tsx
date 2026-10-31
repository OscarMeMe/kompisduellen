import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Choice } from '@/components/lobby/Choice'
import { PageHeader } from '@/components/PageHeader'
import { PlayerSetup } from '@/components/PlayerSetup'
import { loadAcceptsThrows, saveAcceptsThrows } from '@/lib/kast'

// Namn och figur som används när du går med i en lobby. De sparas bara i den här webbläsaren.
export function ProfilePage() {
  const navigate = useNavigate()
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true
  // Om de andra i en lobby får kasta tomater och annat på mig. Sparas direkt i webbläsaren.
  const [acceptsThrows, setAcceptsThrows] = useState(loadAcceptsThrows)

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
      <div className="rounded-lg border bg-card p-5 shadow-soft">
        <Choice
          label="Ta emot kast"
          hint="Tomater och pajer från de andra"
          options={[
            { value: 1, label: 'På' },
            { value: 0, label: 'Av' },
          ]}
          selected={acceptsThrows ? 1 : 0}
          onSelect={(value) => {
            setAcceptsThrows(value === 1)
            saveAcceptsThrows(value === 1)
          }}
        />
      </div>
    </div>
  )
}
