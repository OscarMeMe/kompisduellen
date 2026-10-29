import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { GamePage } from '@/pages/GamePage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ResultsPage } from '@/pages/ResultsPage'

// Startsidan ingår i första laddningen. Övriga sidor hämtas först när man går dit, så att startsidan laddar snabbt
// på mobilnät. Lobbysidan är störst (alla spel, realtiden och QR-koden).
const CreateLobbyPage = lazy(() => import('@/pages/CreateLobbyPage').then((m) => ({ default: m.CreateLobbyPage })))
const JoinPage = lazy(() => import('@/pages/JoinPage').then((m) => ({ default: m.JoinPage })))
const LobbyPage = lazy(() => import('@/pages/LobbyPage').then((m) => ({ default: m.LobbyPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))

// Medan en sida hämtas visas en liten snurra.
function Loading({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="size-10 animate-spin text-primary" aria-label="Laddar" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// Granskningen av Gissa priset finns bara i utvecklingsläge. I produktionsbygget blir villkoret false,
// så sidan och dess kod byggs aldrig in i sajten.
const ReviewPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })))
  : null

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="skapa" element={<Loading><CreateLobbyPage /></Loading>} />
        <Route path="ga-med" element={<Loading><JoinPage /></Loading>} />
        <Route path="lobby/:code" element={<Loading><LobbyPage /></Loading>} />
        <Route path="spel/:code" element={<GamePage />} />
        <Route path="resultat/:code" element={<ResultsPage />} />
        <Route path="profil" element={<Loading><ProfilePage /></Loading>} />
        {ReviewPage && (
          <Route
            path="granska"
            element={
              <Suspense>
                <ReviewPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
