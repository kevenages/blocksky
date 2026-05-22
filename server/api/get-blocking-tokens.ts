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

  const backoffsMs = [500, 1000, 2000]
  let refreshed = false

  for (let attempt = 0; attempt <= backoffsMs.length && !refreshed; attempt++) {
    try {
      const response: Response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshJwt}` },
      })

      if (response.ok) {
        const data: { accessJwt: string; refreshJwt: string } = await response.json()
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
        refreshed = true
        break
      }

      // 4xx (except 429) means the refresh token itself is dead - re-login required
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, error: 'Session expired. Please log in again.' }
      }

      console.warn(`[get-blocking-tokens] Refresh transient failure (status ${response.status}), attempt ${attempt + 1}`)
    } catch (error) {
      console.warn(`[get-blocking-tokens] Refresh network error, attempt ${attempt + 1}:`, error)
    }

    if (attempt < backoffsMs.length) {
      await new Promise((resolve) => setTimeout(resolve, backoffsMs[attempt]))
    }
  }

  // If we exhausted retries, fall through with the existing tokens.
  // The client's 401 handler will retry; if those tokens still don't work, user will see "Session expired."

  return {
    success: true,
    tokens: {
      userDid,
      accessJwt,
      refreshJwt,
    },
  }
})
