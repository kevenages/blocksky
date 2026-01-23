import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    handle: search.handle as string | undefined,
  }),

  loaderDeps: ({ search }) => ({ search }),

  loader: async ({ deps }) => {
    const { handle } = deps.search
    console.log('[OAuth Login] Starting with handle:', handle)

    if (!handle) {
      console.log('[OAuth Login] No handle, redirecting to /')
      throw redirect({ to: '/' })
    }

    try {
      // Validate handle format
      const HANDLE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
      if (!HANDLE_REGEX.test(handle)) {
        console.error('[OAuth Login] Invalid handle format')
        throw redirect({ to: '/', search: { error: 'invalid_handle' } })
      }

      console.log('[OAuth Login] Getting OAuth client...')
      // Call OAuth logic directly instead of via fetch
      const { getOAuthClient } = await import('@/lib/oauth')
      const client = await getOAuthClient()

      console.log('[OAuth Login] Authorizing...')
      const url = await client.authorize(handle, {
        scope: 'atproto transition:generic',
      })

      console.log('[OAuth Login] Got URL:', url.toString())
      // Redirect to Bluesky OAuth
      throw redirect({ href: url.toString() })
    } catch (error) {
      // If it's already a redirect, rethrow it
      if (error instanceof Response || (error as any)?.redirect || (error as any)?.href) {
        console.log('[OAuth Login] Rethrowing redirect')
        throw error
      }

      console.error('[OAuth Login] Error:', error)
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
