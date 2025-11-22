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
          // Desktop: margin-left matches sidebar width
          // When open: w-64 = 256px, adjusted based on your finding
          // When collapsed: w-16 = 64px, may need similar adjustment
          sidebarOpen 
            ? 'lg:ml-64' 
            : 'lg:ml-16'
        )}
      >
        <div className="w-full overflow-hidden">
          <Navbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        </div>
        <main className="flex-1 overflow-auto w-full">
          <div className="w-full max-w-[1600px]  px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}