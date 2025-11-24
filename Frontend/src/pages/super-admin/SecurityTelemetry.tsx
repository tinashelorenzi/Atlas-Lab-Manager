import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { analyticsService, type SecurityTelemetry } from '@/services/analyticsService'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function SecurityTelemetryPage() {
  const [telemetry, setTelemetry] = useState<SecurityTelemetry | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadTelemetry()
  }, [days])

  const loadTelemetry = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getSecurityTelemetry(days)
      setTelemetry(data)
    } catch (error) {
      console.error('Failed to load security telemetry:', error)
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

  if (!telemetry) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load security telemetry</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data for status codes
  const statusCodeData = Object.entries(telemetry.status_codes)
    .filter(([code]) => parseInt(code) >= 400)
    .map(([code, count]) => ({
      code: code,
      count: count,
      label: code === '401' ? 'Unauthorized' : code === '403' ? 'Forbidden' : code === '404' ? 'Not Found' : code === '500' ? 'Internal Server Error' : code
    }))
    .sort((a, b) => parseInt(a.code) - parseInt(b.code))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Telemetry</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Security events, failed logins, and error tracking
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Failed Logins Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Failed Login Attempts
          </CardTitle>
          <CardDescription>
            {telemetry.failed_logins.total} failed login attempts in the last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-3">By Failure Reason</h3>
              <div className="space-y-2">
                {Object.entries(telemetry.failed_logins.by_reason)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{reason || 'Unknown'}</span>
                      <span className="font-bold text-destructive">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">Top IP Addresses</h3>
              <div className="space-y-2">
                {Object.entries(telemetry.failed_logins.by_ip)
                  .slice(0, 10)
                  .map(([ip, count]) => (
                    <div key={ip} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-mono">{ip}</span>
                      <span className="font-bold text-destructive">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Code Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>HTTP Status Code Distribution</CardTitle>
          <CardDescription>
            Error codes and their frequency (4xx and 5xx only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusCodeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusCodeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No error status codes in this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Failed Logins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Recent Failed Login Attempts
          </CardTitle>
          <CardDescription>
            Latest {Math.min(50, telemetry.failed_logins.recent.length)} failed login attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telemetry.failed_logins.recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No failed login attempts in this period
            </div>
          ) : (
            <div className="space-y-2">
              {telemetry.failed_logins.recent.map((login) => (
                <div
                  key={login.id}
                  className="flex items-center justify-between p-3 border border-destructive/20 bg-destructive/5 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{login.email}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {login.ip_address && <span>IP: {login.ip_address}</span>}
                      {login.failure_reason && (
                        <span className="ml-2">• {login.failure_reason}</span>
                      )}
                    </div>
                    {login.user_agent && (
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">
                        {login.user_agent}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(login.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Error Requests (4xx & 5xx)
          </CardTitle>
          <CardDescription>
            Recent error requests requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telemetry.error_requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No error requests in this period
            </div>
          ) : (
            <div className="space-y-2">
              {telemetry.error_requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        req.status_code >= 500 ? 'bg-destructive/20 text-destructive' :
                        req.status_code >= 400 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {req.status_code}
                      </span>
                      <span className="font-mono text-sm">{req.method}</span>
                      <span className="text-sm">{req.path}</span>
                    </div>
                    {req.error_message && (
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">
                        {req.error_message}
                      </div>
                    )}
                    {req.ip_address && (
                      <div className="text-xs text-muted-foreground mt-1">
                        IP: {req.ip_address}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SecurityTelemetryPage

