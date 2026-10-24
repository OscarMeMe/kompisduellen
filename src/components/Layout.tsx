import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Kompisduellen
        </Link>
        <Link to="/profil" className="text-sm text-muted-foreground hover:text-foreground">
          Profil
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-6 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
