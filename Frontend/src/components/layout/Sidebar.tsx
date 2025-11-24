import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  FolderKanban,
  FileText,
  FileBarChart,
  FileCheck,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import logo from '@/assets/logo.svg'
import { authService } from '@/services/authService'
import type { User } from '@/types/user'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

const allMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
  { icon: FlaskConical, label: 'Test Samples', path: '/dashboard/test-samples', roles: ['all'] },
  { icon: Users, label: 'Customers', path: '/dashboard/customers', roles: ['all'] },
  { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects', roles: ['all'] },
  { icon: FileText, label: 'Result Entries', path: '/dashboard/result-entries', roles: ['all'] },
  { icon: FileCheck, label: 'Amended Reports', path: '/dashboard/proposed-reports', roles: ['lab_administrator', 'lab_manager'] },
  { icon: FileBarChart, label: 'Reports', path: '/dashboard/reports', roles: ['all'] },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['all'] },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        // Handle error silently
      }
    }
    fetchUser()
  }, [])

  const menuItems = allMenuItems.filter(item => {
    if (item.roles.includes('all')) return true
    if (!currentUser) return false
    return item.roles.includes(currentUser.user_type)
  })
  return (
    <>
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'bg-card border-r border-border transition-all duration-300 z-40 flex flex-col h-full',
          'fixed lg:static',
          isOpen ? 'w-64' : 'w-16',
          isOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 border-b border-border flex items-center justify-center px-4">
          {isOpen ? (
            <div className="flex items-center gap-2">
              <img src={logo} alt="Atlas" className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">Atlas Lab</span>
            </div>
          ) : (
            <img src={logo} alt="Atlas" className="h-8 w-8" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground',
                        !isOpen && 'justify-center'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
