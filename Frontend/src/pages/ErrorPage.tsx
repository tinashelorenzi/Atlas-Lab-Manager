import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorPageProps {
  error?: Error | unknown
}

export function ErrorPage({ error: propError }: ErrorPageProps = {}) {
  // Try to get error from route, but fallback to prop if not in Router context
  let routeError: unknown = null
  try {
    routeError = useRouteError()
  } catch {
    // Not in Router context, use prop error
  }
  
  const error = propError || routeError

  let errorTitle = 'Something went wrong'
  let errorMessage = 'An unexpected error occurred. Please try again later.'
  let errorDetails: string | null = null

  if (isRouteErrorResponse(error)) {
    errorTitle = `Error ${error.status}`
    errorMessage = error.statusText || errorMessage
    errorDetails = error.data?.message || error.data?.detail || null
  } else if (error instanceof Error) {
    errorTitle = 'Application Error'
    errorMessage = error.message || errorMessage
    errorDetails = error.stack || null
  }

  // Try to use navigate, but fallback to window.location if not in Router context
  let navigate: ((path: string) => void) | null = null
  try {
    navigate = useNavigate()
  } catch {
    // Not in Router context
  }

  const handleGoHome = () => {
    if (navigate) {
      navigate('/')
    } else {
      window.location.href = '/'
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">{errorTitle}</CardTitle>
          <CardDescription className="text-base mt-2">{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorDetails && (
            <div className="p-4 bg-muted rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Error Details:</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {errorDetails}
              </p>
            </div>
          )}

          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground mb-2">
              <strong>Need Help?</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              If this error persists, please contact your system administrator with the error details above.
              Include information about what you were doing when the error occurred.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoHome} variant="default" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Button>
            <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

