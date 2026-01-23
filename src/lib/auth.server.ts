import { createServerFn } from '@tanstack/react-start'
import { Agent } from '@atproto/api'
import { setCookie, getCookie } from '@tanstack/start-server-core'
import { logger } from './logger'

// Validation helpers
const DID_REGEX = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/
const HANDLE_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

function isValidDid(did: string): boolean {
  return DID_REGEX.test(did)
}

function isValidHandle(handle: string): boolean {
  return HANDLE_REGEX.test(handle)
}

// Type guard for error objects with status/message/headers
function isErrorWithStatus(error: unknown): error is { status?: number; message?: string; headers?: Record<string, string> } {
  if (typeof error !== 'object' || error === null) return false
  const obj = error as Record<string, unknown>
  return (
    (obj.status === undefined || typeof obj.status === 'number') &&
    (obj.message === undefined || typeof obj.message === 'string') &&
    (obj.headers === undefined || typeof obj.headers === 'object')
  )
}

// Maximum batch size for blocking operations
const MAX_BATCH_SIZE = 50000

// Validate and format reset time message from external timestamp
function formatResetMessage(headerValue: string | undefined): string {
  if (!headerValue) return 'Rate limit exceeded.'

  const parsed = parseInt(headerValue, 10)
  if (isNaN(parsed) || parsed <= 0) return 'Rate limit exceeded.'

  const resetDate = new Date(parsed * 1000)
  const now = new Date()
  const diffMs = resetDate.getTime() - now.getTime()
  const diffMins = Math.ceil(diffMs / 60000)

  // Validate the time is reasonable (not in past, not more than 24 hours)
  if (diffMins <= 0) {
    return 'Rate limit exceeded. It should reset any moment now - try again.'
  }
  if (diffMins > 24 * 60) {
    return 'Rate limit exceeded. Please try again later.'
  }

  return `Rate limit exceeded. Try again in ${diffMins} minute${diffMins === 1 ? '' : 's'}.`
}

// Cookie configuration
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function setAuthCookies(user: { did: string; handle: string; displayName: string; avatar: string }) {
  // DID cookie - httpOnly for security (server-side only)
  setCookie('bsky_did', user.did, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  // Display cookies - not httpOnly so frontend can read for UI
  // These are not sensitive - just for display purposes
  setCookie('bsky_handle', user.handle, {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  setCookie('bsky_display_name', user.displayName || '', {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  setCookie('bsky_avatar', user.avatar || '', {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

// Get the authenticated user's DID from httpOnly cookie (server-side only)
function getAuthenticatedDid(): string | null {
  const did = getCookie('bsky_did')
  if (!did || !isValidDid(did)) return null
  return did
}

export const getOAuthUrl = createServerFn({ method: 'GET' })
  .inputValidator((data: { handle: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Validate handle
      const handle = data.handle?.trim() || ''
      if (!handle || !isValidHandle(handle)) {
        throw new Error('Invalid handle')
      }

      // Dynamic import to ensure it only loads on server
      const { getOAuthClient } = await import('./oauth')

      const client = await getOAuthClient()
      const url = await client.authorize(handle, {
        scope: 'atproto transition:generic',
      })

      return { url: url.toString() }
    } catch (error) {
      logger.error('OAuth authorize failed', error, { action: 'oauth_authorize', userHandle: data.handle })
      throw error
    }
  })

export const handleOAuthCallback = createServerFn({ method: 'GET' })
  .inputValidator((data: { code: string; state: string; iss?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { getOAuthClient } = await import('./oauth')

      const client = await getOAuthClient()

      const params = new URLSearchParams()
      params.set('code', data.code)
      params.set('state', data.state)
      if (data.iss) params.set('iss', data.iss)

      const { session } = await client.callback(params)
      const did = session.did

      // Use the Agent class from @atproto/api with the OAuth session
      const { Agent } = await import('@atproto/api')
      const agent = new Agent(session)

      const profile = await agent.getProfile({ actor: did })

      // Set cookies server-side with proper security flags
      setAuthCookies({
        did,
        handle: profile.data.handle,
        displayName: profile.data.displayName || '',
        avatar: profile.data.avatar || '',
      })

      logger.info('User logged in', { action: 'login', userId: did, userHandle: profile.data.handle })

      return {
        success: true,
        user: {
          did,
          handle: profile.data.handle,
          displayName: profile.data.displayName || '',
          avatar: profile.data.avatar || '',
        },
      }
    } catch (error) {
      logger.error('OAuth callback failed', error, { action: 'oauth_callback' })
      throw error
    }
  })

export const loginWithAppPassword = createServerFn({ method: 'POST' })
  .handler(async ({ data }: { data: { identifier: string; appPassword: string } }) => {
    console.log('[Server] loginWithAppPassword called with identifier:', data?.identifier)

    // TEMPORARY TEST: Return hardcoded response to test serialization
    return { success: false, user: null, error: 'Test error response' }

    try {
      const handle = data?.identifier?.trim() || ''
      const password = data?.appPassword?.trim() || ''

      if (!handle) {
        console.log('[Server] Handle is required')
        return { success: false, user: null, error: 'Handle is required' }
      }
      if (!password) {
        console.log('[Server] Password is required')
        return { success: false, user: null, error: 'Password is required' }
      }

      // Login with app password
      console.log('[Server] Attempting login...')
      const agent = new Agent({ service: 'https://bsky.social' })
      await agent.login({ identifier: handle, password })
      console.log('[Server] Login successful, session:', !!agent.session)

      if (!agent.session) {
        console.log('[Server] No session after login')
        return { success: false, user: null, error: 'Login failed - no session' }
      }

      console.log('[Server] Session data:', { did: agent.session.did, handle: agent.session.handle })
      const { did, accessJwt, refreshJwt } = agent.session
      // Use input handle as fallback since session.handle might be undefined
      const sessionHandle = agent.session.handle || handle

      // Get profile info (with fallback to session data, then input handle)
      let profileHandle = sessionHandle
      console.log('[Server] Using profileHandle:', profileHandle)
      let profileDisplayName = ''
      let profileAvatar = ''

      try {
        const profile = await agent.getProfile({ actor: did })
        if (profile?.data) {
          profileHandle = profile.data.handle || profileHandle
          profileDisplayName = profile.data.displayName || ''
          profileAvatar = profile.data.avatar || ''
        }
      } catch (profileError) {
        // Profile fetch failed, use session handle
        logger.warn('Failed to fetch profile, using session data', { action: 'login_app_password', did })
      }

      // Set auth cookies (same as OAuth)
      setAuthCookies({
        did,
        handle: profileHandle,
        displayName: profileDisplayName,
        avatar: profileAvatar,
      })

      // Set auth method cookie
      setCookie('auth_method', 'app_password', {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      // Store session tokens for app password auth (httpOnly for security)
      setCookie('bsky_access_jwt', accessJwt, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      setCookie('bsky_refresh_jwt', refreshJwt, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })

      logger.info('User logged in with app password', { action: 'login_app_password', userId: did, userHandle: profileHandle })

      const user = {
        did: String(did),
        handle: String(profileHandle),
        displayName: String(profileDisplayName),
        avatar: String(profileAvatar),
      }
      console.log('[Server] Returning success result with user:', user)
      return { success: true, user, error: null }
    } catch (error) {
      console.log('[Server] Login error caught:', error)
      logger.error('App password login failed', error, { action: 'login_app_password' })
      const errorMessage = isErrorWithStatus(error) && error.message ? error.message : 'Login failed'
      return { success: false, user: null, error: errorMessage }
    }
  })

export const searchProfiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    // Validate query - must be at least 2 characters and max 100
    const query = data.query?.trim() || ''
    if (query.length < 2 || query.length > 100) {
      return { profiles: [] }
    }

    try {
      // Use unauthenticated public API for search - this won't filter out blocked users
      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.searchActorsTypeahead({
        q: query,
        limit: 10,
      })

      return {
        profiles: result.data.actors.map((actor) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName || '',
          avatar: actor.avatar || '',
          description: (actor as { description?: string }).description || '',
        })),
      }
    } catch (error) {
      logger.error('Profile search failed', error, { action: 'search' })
      return { profiles: [], error: 'Search failed' }
    }
  })

export const getProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: { handle: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Validate handle - can be a handle or DID
      const actor = data.handle?.trim() || ''
      if (!actor || (!isValidHandle(actor) && !isValidDid(actor))) {
        return { success: false, profile: null, error: 'Invalid handle or DID' }
      }

      // Use public API to get profile - works even for blocked users
      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getProfile({ actor })

      return {
        success: true,
        profile: {
          did: result.data.did,
          handle: result.data.handle,
          displayName: result.data.displayName || '',
          avatar: result.data.avatar || '',
          description: result.data.description || '',
          followersCount: result.data.followersCount || 0,
          followsCount: result.data.followsCount || 0,
        },
      }
    } catch (error) {
      logger.error('Failed to fetch profile', error, { action: 'get_profile', targetHandle: data.handle })
      return { success: false, profile: null, error: 'Failed to fetch profile' }
    }
  })

export const getFollowers = createServerFn({ method: 'GET' })
  .inputValidator((data: { targetDid: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Still require auth to confirm user is logged in
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, followers: [], cursor: undefined, error: 'Not authenticated' }
      }

      // Validate targetDid
      if (!isValidDid(data.targetDid)) {
        return { success: false, followers: [], cursor: undefined, error: 'Invalid target DID' }
      }

      // Use public API - follower lists are public, saves user's rate limit for blocking
      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getFollowers({
        actor: data.targetDid,
        limit: 100,
        cursor: data.cursor,
      })

      return {
        success: true,
        followers: result.data.followers.map((f) => ({
          did: f.did,
          handle: f.handle,
          displayName: f.displayName || '',
          avatar: f.avatar || '',
        })),
        cursor: result.data.cursor,
      }
    } catch (error) {
      logger.error('Failed to fetch followers', error, { action: 'get_followers', targetDid: data.targetDid })
      return { success: false, followers: [], cursor: undefined, error: 'Failed to fetch followers' }
    }
  })

export const getFollowing = createServerFn({ method: 'GET' })
  .inputValidator((data: { targetDid: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Still require auth to confirm user is logged in
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, following: [], cursor: undefined, error: 'Not authenticated' }
      }

      // Validate targetDid
      if (!isValidDid(data.targetDid)) {
        return { success: false, following: [], cursor: undefined, error: 'Invalid target DID' }
      }

      // Use public API - following lists are public, saves user's rate limit for blocking
      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getFollows({
        actor: data.targetDid,
        limit: 100,
        cursor: data.cursor,
      })

      return {
        success: true,
        following: result.data.follows.map((f) => ({
          did: f.did,
          handle: f.handle,
          displayName: f.displayName || '',
          avatar: f.avatar || '',
        })),
        cursor: result.data.cursor,
      }
    } catch (error) {
      logger.error('Failed to fetch following', error, { action: 'get_following', targetDid: data.targetDid })
      return { success: false, following: [], cursor: undefined, error: 'Failed to fetch following' }
    }
  })

export const getMutuals = createServerFn({ method: 'GET' })
  .inputValidator((data: Record<string, never>) => data)
  .handler(async () => {
    try {
      // Get authenticated user from httpOnly cookie - prevents DID spoofing
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, mutualDids: [], error: 'Not authenticated' }
      }

      // Use public API to fetch followers and follows in parallel
      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      // Fetch all followers
      const fetchAllFollowers = async (): Promise<Set<string>> => {
        const followers = new Set<string>()
        let cursor: string | undefined
        do {
          const response = await publicAgent.getFollowers({
            actor: userDid,
            limit: 100,
            cursor,
          })
          response.data.followers.forEach((f) => followers.add(f.did))
          cursor = response.data.cursor
        } while (cursor)
        return followers
      }

      // Fetch all follows
      const fetchAllFollows = async (): Promise<Set<string>> => {
        const follows = new Set<string>()
        let cursor: string | undefined
        do {
          const response = await publicAgent.getFollows({
            actor: userDid,
            limit: 100,
            cursor,
          })
          response.data.follows.forEach((f) => follows.add(f.did))
          cursor = response.data.cursor
        } while (cursor)
        return follows
      }

      // Fetch both in parallel
      const [followers, follows] = await Promise.all([
        fetchAllFollowers(),
        fetchAllFollows(),
      ])

      // Mutuals are people who are in both sets
      const mutualDids = [...follows].filter((did) => followers.has(did))

      return { success: true, mutualDids }
    } catch (error) {
      logger.error('Failed to fetch mutuals', error, { action: 'get_mutuals' })
      return { success: false, mutualDids: [], error: 'Failed to fetch mutuals' }
    }
  })

export const getBlockedDids = createServerFn({ method: 'GET' })
  .inputValidator((data: Record<string, never>) => data)
  .handler(async () => {
    try {
      // Get authenticated user from httpOnly cookie - prevents DID spoofing
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, blockedDids: [], error: 'Not authenticated' }
      }

      const { getOAuthClient } = await import('./oauth')
      const client = await getOAuthClient()

      const session = await client.restore(userDid)
      const agent = new Agent(session)

      const blockedDids = new Set<string>()
      let cursor: string | undefined

      do {
        const response = await agent.app.bsky.graph.getBlocks({
          limit: 100,
          cursor,
        })
        response.data.blocks.forEach((b) => blockedDids.add(b.did))
        cursor = response.data.cursor
      } while (cursor)

      return { success: true, blockedDids: [...blockedDids] }
    } catch (error) {
      logger.error('Failed to fetch blocked users', error, { action: 'get_blocked' })
      return { success: false, blockedDids: [], error: 'Failed to fetch blocked users' }
    }
  })

export const blockUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { targetDid: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Get authenticated user from httpOnly cookie - prevents DID spoofing
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, error: 'Not authenticated' }
      }

      // Validate targetDid
      if (!isValidDid(data.targetDid)) {
        return { success: false, error: 'Invalid target DID' }
      }

      const { getOAuthClient } = await import('./oauth')
      const client = await getOAuthClient()

      const session = await client.restore(userDid)
      const agent = new Agent(session)

      // Create a block record
      await agent.app.bsky.graph.block.create(
        { repo: userDid },
        {
          subject: data.targetDid,
          createdAt: new Date().toISOString(),
        }
      )

      logger.info('User blocked', { action: 'block', userId: userDid, targetDid: data.targetDid })
      return { success: true }
    } catch (error) {
      logger.error('Failed to block user', error, { action: 'block', targetDid: data.targetDid })
      return { success: false, error: 'Failed to block user' }
    }
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Block users one at a time (like old app) - better rate limits than applyWrites batch
export const blockUsersBatch = createServerFn({ method: 'POST' })
  .inputValidator((data: { targetDids: string[] }) => data)
  .handler(async ({ data }) => {
    const timer = logger.time('block_batch')

    // Get authenticated user from httpOnly cookie - prevents DID spoofing
    const userDid = getAuthenticatedDid()
    if (!userDid) {
      logger.warn('Block batch attempted without auth', { action: 'block_batch' })
      return { success: false, blocked: 0, error: 'Not authenticated' }
    }

    // Enforce batch size limit
    if (data.targetDids.length > MAX_BATCH_SIZE) {
      logger.warn('Block batch too large', { action: 'block_batch', userId: userDid, count: data.targetDids.length })
      return { success: false, blocked: 0, error: `Too many targets. Maximum is ${MAX_BATCH_SIZE}` }
    }

    // Validate all targetDids
    const invalidDids = data.targetDids.filter((did) => !isValidDid(did))
    if (invalidDids.length > 0) {
      logger.warn('Block batch with invalid DIDs', { action: 'block_batch', userId: userDid, count: invalidDids.length })
      return { success: false, blocked: 0, error: `Invalid DIDs: ${invalidDids.length} invalid` }
    }

    const { getOAuthClient } = await import('./oauth')
    const client = await getOAuthClient()

    const session = await client.restore(userDid)
    const agent = new Agent(session)

    let blocked = 0

    // Block users individually (like old app) instead of batch applyWrites
    for (const targetDid of data.targetDids) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await agent.app.bsky.graph.block.create(
            { repo: userDid },
            {
              subject: targetDid,
              createdAt: new Date().toISOString(),
            }
          )
          blocked++
          break // Success, move to next user
        } catch (error: unknown) {
          // Safely extract status, message, and headers using type guard
          const status = isErrorWithStatus(error) ? error.status : undefined
          const message = isErrorWithStatus(error) ? error.message : undefined
          const headers = isErrorWithStatus(error) ? error.headers : undefined

          // Rate limit - return partial progress with error
          if (status === 429 || message?.includes('Rate Limit')) {
            const resetMessage = formatResetMessage(headers?.['ratelimit-reset'])

            logger.warn('Rate limit hit during blocking', {
              action: 'block_batch',
              userId: userDid,
              blocked,
              total: data.targetDids.length,
            })

            // Return partial success
            return {
              success: blocked > 0,
              blocked,
              error: resetMessage
            }
          }

          // Upstream failure - wait and retry
          if (status === 502 || message === 'UpstreamFailure') {
            await sleep(500)
            continue
          }

          // Other error - skip this user after retries
          if (attempt === 2) {
            logger.warn('Failed to block user after retries', {
              action: 'block',
              targetDid,
            })
          } else {
            await sleep(100)
          }
        }
      }

      // Small delay between blocks (50ms like old app)
      await sleep(50)
    }

    const duration = timer()
    logger.info('Block batch completed', {
      action: 'block_batch',
      userId: userDid,
      blocked,
      total: data.targetDids.length,
      duration,
    })

    return { success: true, blocked }
  })
