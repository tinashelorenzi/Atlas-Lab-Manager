import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Customers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer information and relationships
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Customer management interface coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Content will be added here</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

