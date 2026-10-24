import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden">
      {/* Färgglada bakgrundsbubblor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-violet-300/40 blur-3xl" />
        <div className="absolute top-40 -right-32 size-96 rounded-full bg-pink-300/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-amber-200/50 blur-3xl" />
      </div>

      <header className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/" className="group flex items-center gap-1 text-2xl font-black tracking-tight sm:text-3xl">
            <span className="text-violet-900">Kompis</span>
            <span className="inline-block -rotate-3 rounded-xl bg-primary px-2 pb-0.5 text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:rotate-2">
              duellen
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/#sa-funkar" className="hidden text-muted-foreground hover:text-foreground sm:inline">
              Så funkar det
            </Link>
            <Link to="/#spel" className="text-muted-foreground hover:text-foreground">
              Alla spel
            </Link>
            <Link
              to="/ga-med"
              className="rounded-full bg-pink-500 px-4 py-2 text-white shadow-sm shadow-pink-500/30 transition-transform hover:-translate-y-0.5"
            >
              Gå med
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
