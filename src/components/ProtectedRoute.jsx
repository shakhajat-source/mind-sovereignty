import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()

  // Session still resolving — render nothing to avoid flash
  if (session === undefined) return null

  if (!session) return <Navigate to="/" replace />

  return children
}
