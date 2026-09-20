import React, { useMemo } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, setTokens } = useAuthStore()
  const location = useLocation()

  // Check if tokens exist in URL search parameters (Google OAuth callback redirect)
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const access = searchParams.get('access')
  const refresh = searchParams.get('refresh')

  if (access && refresh) {
    // Synchronously save tokens so authentication state is immediately valid
    if (!isAuthenticated) {
      setTokens({ access, refresh })
    }
    return children ? <>{children}</> : <Outlet />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
