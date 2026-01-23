import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  console.log('[Server] oauth-start endpoint called')

  try {
    const query = getQuery(event)
    const handle = (query.handle as string)?.trim() || ''
    console.log('[Server] Handle:', handle)

    if (!handle) {
      return { success: false, error: 'Handle is required', url: null }
    }

    // Validate handle format
    const HANDLE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    if (!HANDLE_REGEX.test(handle)) {
      return { success: false, error: 'Invalid handle format', url: null }
    }

    // Dynamic import to ensure it only loads on server
    const { getOAuthClient } = await import('../../src/lib/oauth')

    const client = await getOAuthClient()
    const url = await client.authorize(handle, {
      scope: 'atproto transition:generic',
    })

    console.log('[Server] OAuth URL generated:', url.toString())
    return { success: true, url: url.toString(), error: null }
  } catch (error) {
    console.error('[Server] OAuth start error:', error)
    const message = error instanceof Error ? error.message : 'Failed to start OAuth'
    return { success: false, error: message, url: null }
  }
})
