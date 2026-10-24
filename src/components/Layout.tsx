import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="relative min-h-svh overflow-x-hidden">

      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="text-xl font-black tracking-tight">
            Kompis<span className="text-primary">duellen</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/#spel" className="text-muted-foreground hover:text-foreground">
              Alla spel
            </Link>
            <Link to="/ga-med" className="rounded-full bg-white px-4 py-2 shadow-sm hover:shadow">
              Gå med
            </Link>
          </nav>
        </header>
        <main className="flex flex-1 flex-col gap-6 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
