import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { analyticsService, type LoginHistoryItem } from '@/services/analyticsService'
import { CheckCircle, XCircle, Search, Filter } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function LoginHistory() {
  const [logins, setLogins] = useState<LoginHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    skip: 0,
    limit: 50,
    success_only: false,
    failed_only: false,
    search: '',
  })

  useEffect(() => {
    loadLogins()
  }, [filters.skip, filters.limit, filters.success_only, filters.failed_only])

  const loadLogins = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getLoginHistory({
        skip: filters.skip,
        limit: filters.limit,
        success_only: filters.success_only || undefined,
        failed_only: filters.failed_only || undefined,
      })
      setLogins(data.items)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load login history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogins = logins.filter(login => {
    if (!filters.search) return true
    const search = filters.search.toLowerCase()
    return (
      login.email.toLowerCase().includes(search) ||
      (login.user_name && login.user_name.toLowerCase().includes(search)) ||
      (login.ip_address && login.ip_address.includes(search))
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Login History</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Track all login attempts and authentication events
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Search</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="Email, name, or IP..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant={filters.success_only ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({
                  ...filters,
                  success_only: !filters.success_only,
                  failed_only: false
                })}
              >
                Successful Only
              </Button>
              <Button
                variant={filters.failed_only ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({
                  ...filters,
                  failed_only: !filters.failed_only,
                  success_only: false
                })}
              >
                Failed Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Login Attempts</CardTitle>
          <CardDescription>
            Showing {filteredLogins.length} of {total} total logins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingMeter />
            </div>
          ) : filteredLogins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No login history found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogins.map((login) => (
                <div
                  key={login.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {login.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{login.email}</span>
                        {login.user_name && (
                          <span className="text-sm text-muted-foreground">
                            ({login.user_name})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {login.ip_address && <span>IP: {login.ip_address}</span>}
                        {login.failure_reason && (
                          <span className="ml-2 text-destructive">
                            • {login.failure_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(login.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > filters.limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page {Math.floor(filters.skip / filters.limit) + 1} of {Math.ceil(total / filters.limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.skip === 0}
                  onClick={() => setFilters({ ...filters, skip: Math.max(0, filters.skip - filters.limit) })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.skip + filters.limit >= total}
                  onClick={() => setFilters({ ...filters, skip: filters.skip + filters.limit })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginHistory

