import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { analyticsService, type ChartDataPoint, type RequestChartDataPoint } from '@/services/analyticsService'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'

export function Charts() {
  const [loginData, setLoginData] = useState<ChartDataPoint[]>([])
  const [requestData, setRequestData] = useState<RequestChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadChartData()
  }, [days])

  const loadChartData = async () => {
    try {
      setLoading(true)
      const [loginChart, requestChart] = await Promise.all([
        analyticsService.getLoginChartData(days),
        analyticsService.getRequestsChartData(days)
      ])
      setLoginData(loginChart)
      setRequestData(requestChart)
    } catch (error) {
      console.error('Failed to load chart data:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Charts</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Visual representation of system metrics and trends
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

      {/* Login Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Login Activity
          </CardTitle>
          <CardDescription>
            Successful and failed login attempts over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={loginData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="successful" stroke="#10b981" name="Successful" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No login data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Request Activity
          </CardTitle>
          <CardDescription>
            Total requests and status code distribution over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={requestData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total Requests" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No request data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Charts

