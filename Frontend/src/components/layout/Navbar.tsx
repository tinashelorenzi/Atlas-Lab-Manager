import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { useEffect, useState } from 'react'
import type { User as UserType } from '@/types/user'

interface NavbarProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export function Navbar({ onMenuClick, sidebarOpen }: NavbarProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        // Handle error silently
      }
    }
    fetchUser()
  }, [])

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full"></span>
        </Button>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            {user && (
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.user_type.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

