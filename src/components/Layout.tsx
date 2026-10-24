import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="relative min-h-svh overflow-x-hidden">
      {/* Färgglada bakgrundsbubblor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-violet-300/40 blur-3xl" />
        <div className="absolute top-40 -right-32 size-96 rounded-full bg-pink-300/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-amber-200/50 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground shadow-md">
              ⚡
            </span>
            <span>
              <span className="text-primary">Kompis</span>
              <span className="text-pink-500">duellen</span>
            </span>
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
