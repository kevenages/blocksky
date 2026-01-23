import { defineEventHandler, readBody, setCookie } from 'h3'

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export default defineEventHandler(async (event) => {
  console.log('[Server] login-app-password endpoint called')

  try {
    const body = await readBody(event)
    console.log('[Server] Body received:', { identifier: body?.identifier })

    const identifier = body?.identifier?.trim() || ''
    const appPassword = body?.appPassword?.trim() || ''

    if (!identifier) {
      return { success: false, user: null, error: 'Handle is required' }
    }
    if (!appPassword) {
      return { success: false, user: null, error: 'App password is required' }
    }

    // Login with app password - use AtpAgent for password auth
    console.log('[Server] Attempting login...')
    const { AtpAgent } = await import('@atproto/api')
    const agent = new AtpAgent({ service: 'https://bsky.social' })
    await agent.login({ identifier, password: appPassword })
    console.log('[Server] Login successful, session:', !!agent.session)

    if (!agent.session) {
      return { success: false, user: null, error: 'Login failed - no session' }
    }

    const { did, handle: sessionHandle, accessJwt, refreshJwt } = agent.session
    const handle = sessionHandle || identifier

    // Get profile info
    let displayName = ''
    let avatar = ''
    let profileHandle = handle

    try {
      const profile = await agent.getProfile({ actor: did })
      if (profile?.data) {
        profileHandle = profile.data.handle || handle
        displayName = profile.data.displayName || ''
        avatar = profile.data.avatar || ''
      }
    } catch (profileError) {
      console.log('[Server] Failed to fetch profile, using session data')
    }

    // Set auth cookies
    setCookie(event, 'bsky_did', did, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    setCookie(event, 'bsky_handle', profileHandle, {
      httpOnly: false,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    setCookie(event, 'bsky_display_name', displayName, {
      httpOnly: false,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    setCookie(event, 'bsky_avatar', avatar, {
      httpOnly: false,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    setCookie(event, 'auth_method', 'app_password', {
      httpOnly: false, // Needs to be readable by JS for client-side blocking
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

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

    console.log('[Server] Login successful, returning user')
    return {
      success: true,
      user: {
        did,
        handle: profileHandle,
        displayName,
        avatar,
      },
      error: null,
    }
  } catch (error) {
    console.log('[Server] Login error:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return { success: false, user: null, error: message }
  }
})
