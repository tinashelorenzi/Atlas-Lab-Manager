import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'
import { LogOut, User as UserIcon, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SuperAdminPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Super Administrator Control Panel</CardTitle>
            <CardDescription>System-wide administration and management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">User Type:</p>
                <p className="text-lg font-semibold text-foreground capitalize">
                  {user?.user_type.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="text-foreground">{user?.email}</p>
              </div>
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Super Administrator features and controls will be available here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

