import { Navigate, useParams } from 'react-router'

// Prispallen visas i lobbysidan när matchen är slut.
export function ResultsPage() {
  const { code } = useParams()
  return <Navigate to={`/lobby/${code ?? ''}`} replace />
}
