import { useCallback, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Emoji } from '@/components/Emoji'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import type { LayoutContext } from '@/hooks/useLayout'
import { usePageMeta } from '@/hooks/usePageMeta'
import { loadPlayer } from '@/lib/player'
import { cn } from '@/lib/utils'

export function Layout() {
  const [inMatch, setInMatch] = useState(false)
  // Hur många gånger figuren uppe till höger har klickats (för hoppet).
  const [hops, setHops] = useState(0)
  const [leaveInMatch, setLeaveInMatch] = useState(false)
  const [versionNotice, setVersionNotice] = useState(false)
  const [lobbyPlayer, setLobbyPlayer] = useState<{ name: string; avatar: string } | null>(null)
  const [leaveGuard, setLeaveGuardState] = useState<((to: string) => void) | null>(null)
  // Platsen uppe till höger där lobbyn visar ljudknappen (LobbySound), även under en match när menyn är dold.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
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
  // Laddar om vid en ny version, utom i en lobby. Där står det en rad i stället.
  const { showNotice } = useAppUpdate()
  // Läses om vid varje sidbyte, så att ett nytt namn syns när man gått vidare.
  const { pathname } = useLocation()
  const home = pathname === '/'
  const player = lobbyPlayer ?? loadPlayer()

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <header className="pt-[env(safe-area-inset-top)]">
        <div
          className={cn(
            'relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 sm:px-6',
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
          <div className={cn('flex min-w-0 items-center gap-2', inMatch && 'absolute top-1/2 right-4 -translate-y-1/2 sm:right-6')}>
          <div ref={setHeaderSlot} className="contents" />
          <nav className={cn('shrink-0', inMatch && 'hidden')}>
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
                <span className="max-w-20 truncate sm:max-w-32">{player.name}</span>
              </Link>
            ) : pathname !== '/' ? (
              // Startsidan har kodfältet i hjälteavsnittet, så där behövs inte knappen.
              <Link
                to="/ga-med"
                onClick={guarded('/ga-med')}
                className="flex items-center rounded-full border bg-card px-4 py-2.5 text-sm font-bold shadow-soft-sm transition-transform hover:-translate-y-0.5"
              >
                Gå med
              </Link>
            ) : null}
          </nav>
          </div>
        </div>
      </header>
      {showNotice && !versionNotice && (
        <p role="status" className="px-4 pb-2 text-center text-xs font-semibold text-muted-foreground">
          Det finns en ny version. Den laddas när ni är klara.
        </p>
      )}
      <main
        className={cn(
          'mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6',
          // Startsidans sektioner går ända ned till sidfoten.
          inMatch ? 'pb-[max(3rem,env(safe-area-inset-bottom))]' : home ? 'pb-0' : 'pb-10',
        )}
      >
        <Outlet context={{ setInMatch, setLeaveInMatch, setLeaveGuard, setVersionNotice, setLobbyPlayer, headerSlot } satisfies LayoutContext} />
      </main>
      {/* En diskret sidfot längst ner på alla sidor, men inte under en pågående match. */}
      {/* På startsidan fortsätter den på samma mörkare sandton som den sista sektionen (tipsen). */}
      {!inMatch &&
        (home ? (
          <footer style={{ backgroundColor: 'var(--startsida-fot)' }}>
            <p className="mx-auto max-w-5xl border-t border-foreground/10 px-4 pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground sm:px-6">
              Skapad av vänner, för vänner.
            </p>
          </footer>
        ) : (
          <footer className="mx-auto w-full max-w-5xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
            <p className="border-t border-border/70 pt-4 text-center text-xs text-muted-foreground">Skapad av vänner, för vänner.</p>
          </footer>
        ))}
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
