import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { CreateLobbyPage } from '@/pages/CreateLobbyPage'
import { GamePage } from '@/pages/GamePage'
import { HomePage } from '@/pages/HomePage'
import { JoinPage } from '@/pages/JoinPage'
import { LobbyPage } from '@/pages/LobbyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ResultsPage } from '@/pages/ResultsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="skapa" element={<CreateLobbyPage />} />
        <Route path="ga-med" element={<JoinPage />} />
        <Route path="lobby/:code" element={<LobbyPage />} />
        <Route path="spel/:code" element={<GamePage />} />
        <Route path="resultat/:code" element={<ResultsPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
