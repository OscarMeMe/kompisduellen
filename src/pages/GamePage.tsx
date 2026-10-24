import { Navigate, useParams } from 'react-router'

// Hela spelet körs i lobbysidan så att alla stannar i samma realtidskanal.
export function GamePage() {
  const { code } = useParams()
  return <Navigate to={`/lobby/${code ?? ''}`} replace />
}
