import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { LoadingMeter } from '@/components/ui/loading'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        setIsAuthenticated(false)
        return
      }

      try {
        await authService.getCurrentUser()
        setIsAuthenticated(true)
      } catch (error) {
        authService.logout()
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return <LoadingMeter />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

