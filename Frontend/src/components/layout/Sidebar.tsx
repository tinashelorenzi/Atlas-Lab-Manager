import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  FolderKanban,
  FileText,
  FileBarChart,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import logo from '@/assets/logo.svg'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FlaskConical, label: 'Test Samples', path: '/dashboard/test-samples' },
  { icon: Users, label: 'Customers', path: '/dashboard/customers' },
  { icon: FolderKanban, label: 'Projects', path: '/dashboard/projects' },
  { icon: FileText, label: 'Result Entries', path: '/dashboard/result-entries' },
  { icon: FileBarChart, label: 'Reports', path: '/dashboard/reports' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40 flex flex-col box-border',
          isOpen ? 'w-64' : 'w-16',
          // Mobile: hidden by default, slides in when open
          // Desktop: always visible
          isOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        )}
      >
      {/* Logo Section */}
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

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
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

