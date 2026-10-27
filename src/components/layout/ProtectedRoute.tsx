import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../ui'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Checking authentication…" />
  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Checking permissions…" />
  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <Spinner label="Loading…" />
  if (firebaseUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
