import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Projects() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage laboratory projects
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Project management interface coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Content will be added here</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

