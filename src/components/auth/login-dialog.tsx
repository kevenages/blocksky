import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogIn, Loader2, Key } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'

interface LoginDialogProps {
  trigger?: React.ReactNode
}

export function LoginDialog({ trigger }: LoginDialogProps) {
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const { login, setUser } = useAuth()

  const handleOAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[OAuth] handleOAuthSubmit called')

    const trimmedHandle = handle.trim()
    if (!trimmedHandle) {
      toast.error('Please enter your Bluesky handle')
      return
    }

    // Validate handle format before attempting OAuth
    const HANDLE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    if (!HANDLE_REGEX.test(trimmedHandle)) {
      toast.error('Invalid handle format. Example: username.bsky.social')
      return
    }

    setIsLoading(true)
    console.log('[OAuth] Calling login with handle:', handle.trim())
    analytics.loginStart('oauth')

    try {
      await login(handle.trim())
      console.log('[OAuth] login() completed - should have redirected')
      // The login function will redirect to Bluesky OAuth
    } catch (error) {
      console.error('[OAuth] Login error:', error)
      toast.error('Failed to start login. Please try again.')
      setIsLoading(false)
    }
  }

  const handleAppPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedHandle = handle.trim()
    if (!trimmedHandle) {
      toast.error('Please enter your Bluesky handle')
      return
    }

    // Validate handle format
    const HANDLE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    if (!HANDLE_REGEX.test(trimmedHandle)) {
      toast.error('Invalid handle format. Example: username.bsky.social')
      return
    }

    if (!password.trim()) {
      toast.error('Please enter your app password')
      return
    }

    setIsLoading(true)
    analytics.loginStart('app_password')

    try {
      console.log('Calling /api/login-app-password...')
      const response = await fetch('/api/login-app-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle.trim(), appPassword: password.trim() }),
      })

      const result = await response.json()
      console.log('Login result:', result)

      if (!result) {
        toast.error('No response from server')
        return
      }

      if (result.success === true && result.user !== null) {
        console.log('Login successful, setting user:', result.user)
        analytics.loginSuccess('app_password')
        setUser(result.user)
        setOpen(false)
        toast.success('Logged in successfully!')
        setHandle('')
        setPassword('')
        // Force a page reload to ensure all components pick up the auth state
        window.location.reload()
      } else {
        console.log('Login failed:', result.error)
        toast.error(result.error ?? 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      const message = error instanceof Error ? error.message : 'Failed to login'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign in with Bluesky
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to BlockSky</DialogTitle>
          <DialogDescription>
            Choose your preferred login method
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="oauth" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oauth">Quick Login</TabsTrigger>
            <TabsTrigger value="app-password">App Password</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Sign in securely using Bluesky's official OAuth.</p>
              <p className="text-xs">Most secure option, but may hit rate limits sooner.</p>
            </div>
            <form onSubmit={handleOAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="yourname.bsky.social"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  You'll be redirected to Bluesky to authorize
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                onClick={() => {
                  console.log('[OAuth] Button clicked')
                  // Don't prevent default - let form submit handle it
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Continue with Bluesky
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="app-password" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Use an app password for faster blocking.</p>
              <p className="text-xs">Blocking runs directly in your browser (like the original BlockSky).</p>
            </div>
            <form onSubmit={handleAppPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="yourname.bsky.social"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Create an app password at Settings → Privacy → App Passwords
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Sign in with App Password
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
