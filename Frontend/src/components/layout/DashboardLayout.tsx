import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          // Mobile: full width, no margin (sidebar is overlay)
          'w-full ml-0',
          // Desktop: margin-left to account for fixed sidebar
          sidebarOpen 
            ? 'lg:ml-64' 
            : 'lg:ml-16'
        )}
      >
        <Navbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

