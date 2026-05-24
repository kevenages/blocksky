import { defineEventHandler, setCookie } from 'h3'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Server-side logout: clears all auth cookies including httpOnly ones
// that the client can't touch directly. Called from useAuth.logout() and
// also automatically when the blocking engine detects a dead session.
export default defineEventHandler((event) => {
  const cookies = [
    'bsky_did',
    'bsky_handle',
    'bsky_display_name',
    'bsky_avatar',
    'auth_method',
    'bsky_access_jwt',
    'bsky_refresh_jwt',
  ]

  for (const name of cookies) {
    setCookie(event, name, '', {
      httpOnly: name.endsWith('_jwt') || name === 'bsky_did',
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })
  }

  return { success: true }
})
