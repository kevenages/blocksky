import { createFileRoute, redirect } from '@tanstack/react-router'
import { handleOAuthCallback } from '@/lib/auth.server'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: search.code as string | undefined,
    state: search.state as string | undefined,
    error: search.error as string | undefined,
    iss: search.iss as string | undefined,
  }),

  loaderDeps: ({ search }) => ({ search }),

  loader: async ({ deps }) => {
    const { code, state, error, iss } = deps.search

    if (error) {
      return { success: false, error }
    }

    if (!code || !state) {
      return { success: false, error: 'Missing code or state' }
    }

    try {
      const result = await handleOAuthCallback({
        data: { code, state, iss },
      })

      if (result.success) {
        // Redirect immediately to prevent client-side re-execution
        // Include login=oauth param so home page can track login_success
        throw redirect({ to: '/', search: { login: 'oauth' } })
      }

      return result
    } catch (err) {
      // Re-throw redirects
      if (err instanceof Response || (err && typeof err === 'object' && 'to' in err)) {
        throw err
      }
      return { success: false, error: 'Authentication failed' }
    }
  },

  component: CallbackPage,
})

function CallbackPage() {
  const data = Route.useLoaderData()

  // Successful logins redirect from the loader, so if we're here it's an error
  const errorMessage = 'error' in data ? data.error : 'An error occurred during authentication'
  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive">Authentication Failed</h1>
        <p className="mt-2 text-muted-foreground">
          {errorMessage}
        </p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">
          Return to home
        </a>
      </div>
    </div>
  )
}
