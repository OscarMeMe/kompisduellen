import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reloadForNewVersion, type VersionStatus } from '@/lib/version'

// Flikarna i lobbyn kör olika versioner av sajten och kan inte spela ihop. Beskedet ligger över allt, så att ingen spelar
// vidare med fel version. Lobbykoden, spelaren och värdens tillstånd finns kvar efter omladdningen.
export function VersionNotice({ status, inMatch }: { status: VersionStatus; inMatch: boolean }) {
  if (status === 'ok') return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div role="alertdialog" aria-labelledby="version-rubrik" className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 text-center shadow-soft motion-safe:animate-pop">
        {status === 'reload' ? (
          <>
            <h2 id="version-rubrik" className="text-2xl">
              Det finns en ny version av spelet
            </h2>
            <p className="text-muted-foreground">
              {inMatch ? 'Ladda om sidan så kommer du tillbaka till matchen.' : 'Ladda om sidan så är du kvar i lobbyn.'}
            </p>
            <Button size="lg" className="w-full" onClick={reloadForNewVersion}>
              <RefreshCw aria-hidden />
              Ladda om
            </Button>
          </>
        ) : (
          <>
            <h2 id="version-rubrik" className="text-2xl">
              Värden har en äldre version av spelet
            </h2>
            <p className="text-muted-foreground">Ni kan fortsätta när värden har laddat om sidan. Du behöver inte göra något.</p>
          </>
        )}
      </div>
    </div>
  )
}
