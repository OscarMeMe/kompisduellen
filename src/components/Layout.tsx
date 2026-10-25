import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import type { LayoutContext } from '@/hooks/useLayout'
import { loadPlayer } from '@/lib/player'
import { cn } from '@/lib/utils'

export function Layout() {
  const [inMatch, setInMatch] = useState(false)
  // Läses om vid varje sidbyte, så att ett nytt namn syns när man gått vidare.
  useLocation()
  const player = loadPlayer()

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <header className="pt-[env(safe-area-inset-top)]">
        <div
          className={cn(
            'mx-auto flex w-full max-w-5xl items-center justify-between px-4 sm:px-6',
            inMatch ? 'justify-center py-3 sm:py-5' : 'py-5',
          )}
        >
          {/* Loggan leder till startsidan, utom under en match så att ingen lämnar lobbyn av misstag. */}
          {inMatch ? (
            <Logo />
          ) : (
            <Link to="/" aria-label="Kompisduellen, till startsidan" className="group">
              <Logo />
            </Link>
          )}
          <nav className={cn(inMatch && 'hidden')}>
            {player ? (
              <Link
                to="/profil"
                className="flex items-center gap-2 rounded-full border bg-card py-2 pr-4 pl-3 text-sm font-bold shadow-soft-sm transition-transform hover:-translate-y-0.5"
              >
                <span className="text-xl leading-none">{player.avatar}</span>
                <span className="max-w-32 truncate">{player.name}</span>
              </Link>
            ) : (
              <Link
                to="/ga-med"
                className="flex items-center rounded-full border bg-card px-4 py-2.5 text-sm font-bold shadow-soft-sm transition-transform hover:-translate-y-0.5"
              >
                Gå med
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
        <Outlet context={{ setInMatch } satisfies LayoutContext} />
      </main>
    </div>
  )
}

function Logo() {
  return (
    <span className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
      Kompis{' '}
      <span className="inline-block -rotate-3 rounded-full bg-primary px-3 pb-0.5 text-primary-foreground shadow-primary transition-transform group-hover:rotate-0">
        duellen
      </span>
    </span>
  )
}
