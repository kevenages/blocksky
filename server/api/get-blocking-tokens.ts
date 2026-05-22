import { defineEventHandler, getCookie, setCookie } from 'h3'

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// This endpoint provides tokens temporarily for client-side blocking
// Only works for app password auth - OAuth tokens remain httpOnly
// Refreshes the access token before returning so a stale cookie doesn't break blocking
export default defineEventHandler(async (event) => {
  const authMethod = getCookie(event, 'auth_method')

  if (authMethod !== 'app_password') {
    return { success: false, error: 'Client-side blocking only available with app password' }
  }

  const userDid = getCookie(event, 'bsky_did')
  let accessJwt = getCookie(event, 'bsky_access_jwt')
  let refreshJwt = getCookie(event, 'bsky_refresh_jwt')

  if (!userDid || !accessJwt || !refreshJwt) {
    return { success: false, error: 'Session expired. Please log in again.' }
  }

  try {
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshJwt}` },
    })

    if (response.ok) {
      const data = await response.json()
      accessJwt = data.accessJwt
      refreshJwt = data.refreshJwt

      setCookie(event, 'bsky_access_jwt', accessJwt!, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      setCookie(event, 'bsky_refresh_jwt', refreshJwt!, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
    } else if (response.status === 400 || response.status === 401) {
      // Refresh token itself is invalid/expired - user must log in again
      return { success: false, error: 'Session expired. Please log in again.' }
    }
    // Other refresh errors (5xx, network): fall through and return current tokens.
    // If they happen to still be valid we proceed; if not the client's 401 handler will retry.
  } catch (error) {
    console.error('[get-blocking-tokens] Refresh failed, returning existing tokens:', error)
  }

  return {
    success: true,
    tokens: {
      userDid,
      accessJwt,
      refreshJwt,
    },
  }
})
