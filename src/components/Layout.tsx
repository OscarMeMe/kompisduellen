import { useCallback, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Emoji } from '@/components/Emoji'
import type { LayoutContext } from '@/hooks/useLayout'
import { usePageMeta } from '@/hooks/usePageMeta'
import { loadPlayer } from '@/lib/player'
import { cn } from '@/lib/utils'

export function Layout() {
  const [inMatch, setInMatch] = useState(false)
  // Hur många gånger figuren uppe till höger har klickats (för hoppet).
  const [hops, setHops] = useState(0)
  const [leaveInMatch, setLeaveInMatch] = useState(false)
  const [leaveGuard, setLeaveGuardState] = useState<((to: string) => void) | null>(null)
  // Sparas som en funktion i en funktion, eftersom useState annars anropar den.
  const setLeaveGuard = useCallback((guard: ((to: string) => void) | null) => setLeaveGuardState(() => guard), [])
  function guarded(to: string) {
    return (event: MouseEvent) => {
      if (!leaveGuard) return
      event.preventDefault()
      leaveGuard(to)
    }
  }
  // Titel, beskrivning och övrigt i <head> för sidan man är på.
  usePageMeta()
  // Läses om vid varje sidbyte, så att ett nytt namn syns när man gått vidare.
  useLocation()
  const player = loadPlayer()

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <header className="pt-[env(safe-area-inset-top)]">
        <div
          className={cn(
            'mx-auto flex w-full max-w-5xl items-center justify-between px-4 sm:px-6',
            inMatch ? 'justify-center py-3 sm:py-5' : 'py-4',
          )}
        >
          {/* Loggan leder till startsidan, utom under en match så att ingen lämnar lobbyn av misstag.
              I en provomgång går den att klicka på, med en fråga först. */}
          {inMatch && !leaveInMatch ? (
            <Logo />
          ) : (
            <Link to="/" aria-label="Kompisduellen, till startsidan" className="group shrink-0 py-1" onClick={guarded('/')}>
              <Logo />
            </Link>
          )}
          <nav className={cn('min-w-0', inMatch && 'hidden')}>
            {player ? (
              <Link
                to="/profil"
                onClick={(event) => {
                  setHops((n) => n + 1)
                  guarded('/profil')(event)
                }}
                className="flex items-center gap-2 rounded-full border bg-card py-2 pr-4 pl-3 text-sm font-bold shadow-soft-sm transition-transform hover:-translate-y-0.5"
              >
                {/* Figuren hoppar till vid klick. Ny key startar om hoppet. */}
                <Emoji key={hops} emoji={player.avatar} className={cn('text-xl', hops > 0 && 'motion-safe:animate-hop')} />
                <span className="max-w-24 truncate sm:max-w-32">{player.name}</span>
              </Link>
            ) : (
              <Link
                to="/ga-med"
                onClick={guarded('/ga-med')}
                className="flex items-center rounded-full border bg-card px-4 py-2.5 text-sm font-bold shadow-soft-sm transition-transform hover:-translate-y-0.5"
              >
                Gå med
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
        <Outlet context={{ setInMatch, setLeaveInMatch, setLeaveGuard } satisfies LayoutContext} />
      </main>
    </div>
  )
}

function Logo() {
  return (
    <span className="font-heading text-xl font-bold tracking-tight whitespace-nowrap sm:text-2xl">
      Kompis{' '}
      <span className="inline-block -rotate-3 rounded-full bg-primary px-3 pb-0.5 text-primary-foreground shadow-primary transition-[rotate] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:rotate-3">
        duellen
      </span>
    </span>
  )
}
