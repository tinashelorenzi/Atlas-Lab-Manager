export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function LoadingMeter() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4">
        <div className="space-y-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-loading-bar"></div>
          </div>
          <p className="text-center text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  )
}

