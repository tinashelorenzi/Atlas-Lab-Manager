import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { analyticsService, type OverviewStats } from '@/services/analyticsService'
import { Users, LogIn, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function Analytics() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getOverviewStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingMeter />
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load statistics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics & Statistics</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          System-wide statistics and metrics
        </p>
      </div>

      {/* User Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Logins</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.logins.total_successful.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.logins.successful_24h} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.logins.total_failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.logins.failed_24h} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requests.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.requests.last_24h} in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Error Statistics</CardTitle>
          <CardDescription>HTTP error codes and security events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">500 Internal Server Error</span>
                <TrendingUp className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold text-destructive">{stats.errors['500_internal_server_error'].total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.errors['500_internal_server_error'].last_24h} in last 24h
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">401 Unauthorized</span>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.errors['401_unauthorized'].total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.errors['401_unauthorized'].last_24h} in last 24h
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">403 Forbidden</span>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.errors['403_forbidden'].total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.errors['403_forbidden'].last_24h} in last 24h
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">404 Not Found</span>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.errors['404_not_found'].total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.errors['404_not_found'].last_24h} in last 24h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Business Statistics</CardTitle>
          <CardDescription>Laboratory operations metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Customers</div>
              <div className="text-2xl font-bold">{stats.business.customers}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Samples</div>
              <div className="text-2xl font-bold">{stats.business.samples}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Projects</div>
              <div className="text-2xl font-bold">{stats.business.projects}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Result Entries</div>
              <div className="text-2xl font-bold">{stats.business.result_entries}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Reports</div>
              <div className="text-2xl font-bold">{stats.business.reports}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Type</CardTitle>
          <CardDescription>User distribution across roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.users.by_type).map(([type, count]) => (
              <div key={type} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground capitalize">
                  {type.replace('_', ' ')}
                </div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Analytics

