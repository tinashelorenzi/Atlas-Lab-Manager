import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your laboratory management preferences
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Settings interface coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Content will be added here</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

