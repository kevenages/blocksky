import { useEffect } from 'react'
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Zap, Lock, Heart, Wand2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import { FeatureCardGrid } from '@/components/feature-card-grid'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-8 w-full max-w-4xl bg-muted/30 rounded-lg px-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://bsky.app/profile/blocksky.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-blue-500 transition-colors"
                  onClick={() => analytics.clickExternalLink('https://bsky.app/profile/blocksky.app')}
                >
                  <svg className="h-5 w-5" viewBox="0 0 600 530" fill="currentColor">
                    <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/>
                  </svg>
                  @blocksky.app
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Follow us on Bluesky for updates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://ko-fi.com/blockskyapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-pink-500 transition-colors"
                  onClick={() => analytics.clickExternalLink('https://ko-fi.com/blockskyapp')}
                >
                  <Heart className="h-5 w-5" />
                  Support us on Ko-fi
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help keep BlockSky free for everyone</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://forms.gle/2AEBdooVL12AjgLN8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-green-500 transition-colors"
                  onClick={() => analytics.clickExternalLink('https://forms.gle/2AEBdooVL12AjgLN8')}
                >
                  <MessageSquare className="h-5 w-5" />
                  Send Feedback
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help us improve BlockSky</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full" onValueChange={(value) => { if (value) analytics.clickFaq(value) }}>
            <AccordionItem value="close-page">
              <AccordionTrigger>Can I close the page while blocking?</AccordionTrigger>
              <AccordionContent>
                No, you need to keep the page open until blocking completes. If you close or navigate away, blocking will stop. Any accounts already blocked will stay blocked, but remaining accounts won't be processed. If you hit a rate limit, BlockSky will automatically resume when the limit resets - just keep the page open.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="login-methods">
              <AccordionTrigger>What's the difference between Quick Login and App Password?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2"><strong>App Password</strong> is the fastest option. Blocking requests go directly from your browser to Bluesky, just like the original BlockSky. The tradeoff is slightly reduced security - session tokens are temporarily accessible to JavaScript during blocking. You can revoke app passwords anytime in Bluesky Settings → Privacy → App Passwords.</p>
                <p><strong>Quick Login (OAuth)</strong> is the most secure option. Your credentials never touch BlockSky - you authenticate directly with Bluesky. Blocking runs through our server, which may hit rate limits sooner due to shared infrastructure.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="app-password-speed">
              <AccordionTrigger>Why is App Password faster than Quick Login?</AccordionTrigger>
              <AccordionContent>
                With App Password, blocking runs directly in your browser - requests go straight to Bluesky without passing through our servers. This is the same approach the original BlockSky used. Quick Login (OAuth) routes requests through our server for enhanced security, which can hit Bluesky's rate limits sooner.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rate-limits">
              <AccordionTrigger>What are rate limits?</AccordionTrigger>
              <AccordionContent>
                Bluesky limits how quickly you can perform actions like blocking. This is a platform-wide protection, not something BlockSky controls. If you hit the limit, BlockSky automatically pauses and shows a countdown. When the limit resets, blocking resumes automatically - just keep the page open.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="safety">
              <AccordionTrigger>Is this safe to use? Will my account get banned?</AccordionTrigger>
              <AccordionContent>
                BlockSky uses Bluesky's official authentication methods (OAuth and App Passwords) and respects their rate limits. We don't do anything that violates Bluesky's terms of service. Blocking accounts is a standard feature that Bluesky provides to all users.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="credentials">
              <AccordionTrigger>Do you store my password or credentials?</AccordionTrigger>
              <AccordionContent>
                No. We never store your password. Session tokens are kept in secure HTTP-only cookies and are only used to communicate with Bluesky on your behalf.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mutuals">
              <AccordionTrigger>What are mutuals and why aren't they blocked?</AccordionTrigger>
              <AccordionContent>
                Mutuals are accounts that you follow who also follow you back. BlockSky automatically protects these relationships by never blocking your mutuals, even if they follow the account you're targeting.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="undo">
              <AccordionTrigger>Can I undo or unblock everyone?</AccordionTrigger>
              <AccordionContent>
                Currently, BlockSky only handles blocking. To unblock accounts, you'll need to do so through Bluesky directly in your Settings &gt; Moderation &gt; Blocked accounts. We may add bulk unblocking in a future update.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="skipped">
              <AccordionTrigger>Why are some accounts skipped?</AccordionTrigger>
              <AccordionContent>
                Accounts are skipped if they're your mutuals, if you've already blocked them, or if they're official Bluesky accounts (like @bsky.app). This prevents accidentally blocking important accounts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data">
              <AccordionTrigger>What data do you collect?</AccordionTrigger>
              <AccordionContent>
                We collect minimal anonymous analytics to improve the service. We don't track who you block or store your block list. Your Bluesky profile information is only used during your session and isn't permanently stored.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}
