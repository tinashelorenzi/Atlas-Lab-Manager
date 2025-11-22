import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingMeter } from '@/components/ui/loading'
import { Activity, FlaskConical, Users, FolderKanban } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        navigate('/')
        return
      }

      try {
        const user = await authService.getCurrentUser()
        // Redirect super admin to their panel
        if (user.user_type === 'super_administrator') {
          navigate('/super-admin')
        }
      } catch (error) {
        authService.logout()
        navigate('/')
      }
    }

    checkAuth()
  }, [navigate])

  const stats = [
    {
      title: 'Active Projects',
      value: '12',
      description: '+2 from last month',
      icon: FolderKanban,
      trend: 'up',
    },
    {
      title: 'Test Samples',
      value: '48',
      description: '+8 from last week',
      icon: FlaskConical,
      trend: 'up',
    },
    {
      title: 'Customers',
      value: '24',
      description: '+3 new this month',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Pending Results',
      value: '7',
      description: 'Awaiting review',
      icon: Activity,
      trend: 'neutral',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your lab today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Area */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes in your lab</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">New test sample received</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Project status updated</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">New customer registered</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors">
                Create New Sample
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-sm transition-colors">
                Add Customer
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-sm transition-colors">
                Generate Report
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
