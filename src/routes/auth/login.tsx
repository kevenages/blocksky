import { createFileRoute, redirect } from '@tanstack/react-router'
import { getOAuthUrl } from '@/lib/auth.server'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    handle: search.handle as string | undefined,
  }),

  loaderDeps: ({ search }) => ({ search }),

  loader: async ({ deps }) => {
    const { handle } = deps.search

    if (!handle) {
      throw redirect({ to: '/' })
    }

    try {
      const result = await getOAuthUrl({ data: { handle } })

      // Redirect to Bluesky OAuth
      throw redirect({ href: result.url })
    } catch (error) {
      // If it's already a redirect, rethrow it
      if (error instanceof Response || (error as any)?.redirect) {
        throw error
      }

      console.error('OAuth login error:', error)
      throw redirect({ to: '/', search: { error: 'login_failed' } })
    }
  },

  component: () => {
    // This shouldn't render as we always redirect
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-muted-foreground">Redirecting to Bluesky...</p>
      </div>
    )
  },
})
