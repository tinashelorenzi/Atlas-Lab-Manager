import { useEffect, useState } from 'react'
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'
import { LogOut, User as UserIcon, Shield, BarChart3, History, ShieldCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Analytics } from './super-admin/Analytics'
import { LoginHistory } from './super-admin/LoginHistory'
import { SecurityTelemetryPage } from './super-admin/SecurityTelemetry'
import { UserImpersonationPage } from './super-admin/UserImpersonation'
import { Charts } from './super-admin/Charts'
import { LoadingMeter } from '@/components/ui/loading'

export function SuperAdminPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser.user_type !== 'super_administrator') {
          // Redirect to dashboard if not super admin
          navigate('/dashboard')
          return
        }
        setUser(currentUser)
      } catch (error) {
        authService.logout()
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    if (!authService.isAuthenticated()) {
      navigate('/')
      return
    }

    fetchUser()
  }, [navigate])

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Super Administrator Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-foreground">
              <UserIcon className="h-4 w-4" />
              <span className="text-sm">{user?.full_name}</span>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Link
                    to="/super-admin"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-foreground ${
                      location.pathname === '/super-admin' ? 'bg-muted' : ''
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                  <Link
                    to="/super-admin/login-history"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-foreground ${
                      location.pathname === '/super-admin/login-history' ? 'bg-muted' : ''
                    }`}
                  >
                    <History className="h-4 w-4" />
                    <span>Login History</span>
                  </Link>
                  <Link
                    to="/super-admin/security"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-foreground ${
                      location.pathname === '/super-admin/security' ? 'bg-muted' : ''
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Security Telemetry</span>
                  </Link>
                  <Link
                    to="/super-admin/charts"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-foreground ${
                      location.pathname === '/super-admin/charts' ? 'bg-muted' : ''
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Charts</span>
                  </Link>
                  <Link
                    to="/super-admin/impersonate"
                    className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-foreground ${
                      location.pathname === '/super-admin/impersonate' ? 'bg-muted' : ''
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Impersonate User</span>
                  </Link>
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Analytics />} />
              <Route path="/login-history" element={<LoginHistory />} />
              <Route path="/security" element={<SecurityTelemetryPage />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/impersonate" element={<UserImpersonationPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

