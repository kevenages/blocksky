import { defineEventHandler, readBody, getCookie, setCookie, createError } from 'h3'

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Persist refreshed app-password tokens back to httpOnly cookies after the
// client-side blocker rotates them. Without this, the next /api/get-blocking-tokens
// call (e.g. after a page reload) would hand out the stale tokens again.
export default defineEventHandler(async (event) => {
  const authMethod = getCookie(event, 'auth_method')

  if (authMethod !== 'app_password') {
    throw createError({ statusCode: 403, message: 'Only available for app password auth' })
  }

  const body = await readBody<{ accessJwt?: string; refreshJwt?: string }>(event)
  const accessJwt = body?.accessJwt?.trim()
  const refreshJwt = body?.refreshJwt?.trim()

  if (!accessJwt || !refreshJwt) {
    throw createError({ statusCode: 400, message: 'Missing tokens' })
  }

  setCookie(event, 'bsky_access_jwt', accessJwt, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  setCookie(event, 'bsky_refresh_jwt', refreshJwt, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true }
})
