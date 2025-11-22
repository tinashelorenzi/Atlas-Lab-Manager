import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { useEffect, useState } from 'react'
import type { User as UserType } from '@/types/user'

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
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
    <header className="h-16 border-b border-border bg-card flex items-center px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="h-9 w-9 mr-4"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1"></div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full"></span>
        </Button>

        {user && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[120px]">
              <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {user.user_type.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
