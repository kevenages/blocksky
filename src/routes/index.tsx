import { useEffect } from 'react'
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Zap, Lock, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import { FeatureCardGrid } from '@/components/feature-card-grid'
import { ExternalLinks } from '@/components/external-links'
import { FaqSection } from '@/components/faq-section'

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => ({
    error: search.error as string | undefined,
    login: search.login as string | undefined,
  }),
})

function HomePage() {
  const { error, login } = useSearch({ from: '/' })
  const navigate = useNavigate()

  // Handle URL error parameters (e.g., from failed OAuth)
  useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        invalid_handle: 'Invalid Bluesky handle. Please check and try again.',
        login_failed: 'Login failed. Please try again.',
        oauth_error: 'Authentication error. Please try again.',
      }
      const message = errorMessages[error] || 'An error occurred. Please try again.'
      toast.error(message)
      navigate({ to: '/', search: { error: undefined, login: undefined }, replace: true })
    }
  }, [error, navigate])

  // Track OAuth login success (redirect from /auth/callback)
  useEffect(() => {
    if (login === 'oauth') {
      analytics.loginSuccess('oauth')
      navigate({ to: '/', search: { error: undefined, login: undefined }, replace: true })
    }
  }, [login, navigate])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex flex-col items-center space-y-3">
            <img src="/logo.png" alt="BlockSky" className="h-24 w-auto" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Block<span className="text-blue-500">Sky</span>
            </h1>
          </div>
          <p className="max-w-[600px] text-lg text-muted-foreground">
            Protect yourself on Bluesky. Mass block followers of problematic accounts with one click.
          </p>
        </div>

        {/* Feature App Cards */}
        <div className="w-full max-w-4xl">
          <FeatureCardGrid />
        </div>

        {/* How It Works Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
          <Card>
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Mutual Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We never block your mutuals - people you follow who also follow you back.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Zap className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Real-time Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Watch as accounts are blocked in real-time with detailed progress updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Lock className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Secure OAuth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your credentials are never stored. We use Bluesky's official OAuth.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Wand2 className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Automatic Blocking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Block thousands of accounts automatically while you wait.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Links Section */}
        <ExternalLinks />

        {/* FAQ Section */}
        <FaqSection />
      </div>
    </div>
  )
}
