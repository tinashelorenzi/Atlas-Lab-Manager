import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { settingsService } from '@/services/settingsService'
import { Turnstile } from '@marsidev/react-turnstile'
import { LogIn, Loader2 } from 'lucide-react'
import logo from '@/assets/logo.svg'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch Turnstile configuration from public endpoint
    const loadTurnstileConfig = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE_URL}/api/settings/integrations/public/turnstile`)
        if (response.ok) {
          const data = await response.json()
          if (data.enabled && data.site_key) {
            setTurnstileEnabled(true)
            setTurnstileSiteKey(data.site_key)
          }
        }
      } catch (error) {
        console.error('Failed to load Turnstile config:', error)
      }
    }
    loadTurnstileConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Check Turnstile if enabled
    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security verification')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    
    setIsLoading(true)
    
    try {
      const loginResponse = await authService.login({
        username: email,
        password: password,
        turnstile_token: turnstileToken,
      })
      
      // Check if password reset is required
      if (loginResponse.needs_password_reset) {
        navigate('/password-reset')
        return
      }
      
      // Get user info to determine routing
      const user = await authService.getCurrentUser()
      
      // Route based on user type
      if (user.user_type === 'super_administrator') {
        navigate('/super-admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
      // Trigger shake animation
      setShake(true)
      setTimeout(() => setShake(false), 500)
      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset()
        setTurnstileToken(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className={`w-full max-w-md border-border transition-transform ${shake ? 'animate-shake' : ''}`}>
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="Atlas Lab Manager" className="h-20 w-20" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold text-foreground">
              Atlas Lab Manager
            </CardTitle>
            <CardDescription>
              Sign in to access your laboratory management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            {turnstileEnabled && turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setTurnstileToken(null)
                    setError('Security verification failed. Please try again.')
                  }}
                  onExpire={() => {
                    setTurnstileToken(null)
                  }}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (turnstileEnabled && !turnstileToken)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

