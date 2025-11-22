import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and view laboratory reports
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Report generation interface coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Content will be added here</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

