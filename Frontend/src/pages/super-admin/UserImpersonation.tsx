import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { analyticsService, type UserForImpersonation, type ImpersonationStatus } from '@/services/analyticsService'
import { UserCheck, UserX, Users, AlertCircle } from 'lucide-react'
import { LoadingMeter } from '@/components/ui/loading'
import { useNavigate } from 'react-router-dom'

export function UserImpersonationPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserForImpersonation[]>([])
  const [loading, setLoading] = useState(true)
  const [impersonationStatus, setImpersonationStatus] = useState<ImpersonationStatus | null>(null)
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserForImpersonation | null>(null)
  const [reason, setReason] = useState('')
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, status] = await Promise.all([
        analyticsService.getUsersForImpersonation(),
        analyticsService.getImpersonationStatus()
      ])
      setUsers(usersData)
      setImpersonationStatus(status)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartImpersonation = async () => {
    if (!selectedUser) return

    try {
      setImpersonating(true)
      const response = await analyticsService.startImpersonation(selectedUser.id, reason || undefined)
      // Token is already stored in localStorage by the service
      // Redirect to dashboard as the impersonated user
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Failed to start impersonation:', error)
      alert(error.response?.data?.detail || 'Failed to start impersonation')
      setImpersonating(false)
      setShowImpersonateDialog(false)
    }
  }

  const handleEndImpersonation = async () => {
    if (!confirm('Are you sure you want to end the impersonation?')) {
      return
    }

    try {
      await analyticsService.endImpersonation()
      // Token is already stored in localStorage by the service
      // Redirect back to super admin panel
      navigate('/super-admin')
    } catch (error: any) {
      console.error('Failed to end impersonation:', error)
      alert(error.response?.data?.detail || 'Failed to end impersonation')
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Impersonation</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Simulate administrator access for technical support
        </p>
      </div>

      {/* Current Impersonation Status */}
      {impersonationStatus?.is_impersonating && (
        <Card className="border-orange-500 bg-orange-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <UserCheck className="h-5 w-5" />
              Currently Impersonating
            </CardTitle>
            <CardDescription>
              You are currently viewing the system as another user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Impersonating User:</div>
                <div className="text-lg font-semibold">
                  {impersonationStatus.impersonated_user?.full_name} ({impersonationStatus.impersonated_user?.email})
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Role: {impersonationStatus.impersonated_user?.user_type.replace('_', ' ')}
                </div>
              </div>
              {impersonationStatus.reason && (
                <div>
                  <div className="text-sm text-muted-foreground">Reason:</div>
                  <div className="text-sm">{impersonationStatus.reason}</div>
                </div>
              )}
              {impersonationStatus.started_at && (
                <div>
                  <div className="text-sm text-muted-foreground">Started:</div>
                  <div className="text-sm">{new Date(impersonationStatus.started_at).toLocaleString()}</div>
                </div>
              )}
              <Button
                variant="destructive"
                onClick={handleEndImpersonation}
                className="w-full"
              >
                <UserX className="h-4 w-4 mr-2" />
                End Impersonation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Users for Impersonation
          </CardTitle>
          <CardDescription>
            Select a Lab Administrator or Lab Manager to impersonate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users available for impersonation
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <Card key={user.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="font-semibold">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {user.user_type.replace('_', ' ')}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowImpersonateDialog(true)
                        }}
                        disabled={impersonationStatus?.is_impersonating === true}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Impersonate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impersonate Dialog */}
      <Dialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              You will be logged in as {selectedUser?.full_name}. All actions will be performed as this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Technical support for issue #123"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Provide a reason for this impersonation session
              </p>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-600">
                  <strong>Warning:</strong> You will have full access as this user. All actions will be logged and attributed to you as the super administrator.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpersonateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartImpersonation}
              disabled={impersonating}
            >
              {impersonating ? <LoadingMeter /> : <><UserCheck className="h-4 w-4 mr-2" />Start Impersonation</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserImpersonationPage

