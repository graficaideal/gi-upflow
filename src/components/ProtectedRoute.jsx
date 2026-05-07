import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) return null

  if (!session) return <Navigate to="/login" replace />

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
