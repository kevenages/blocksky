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
      return { profiles: [] }
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
      return { success: false, profile: null }
    }
  })

export const getFollowers = createServerFn({ method: 'GET' })
  .inputValidator((data: { targetDid: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Get authenticated user from httpOnly cookie - prevents DID spoofing
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, followers: [], cursor: undefined, error: 'Not authenticated' }
      }

      // Validate targetDid
      if (!isValidDid(data.targetDid)) {
        return { success: false, followers: [], cursor: undefined, error: 'Invalid target DID' }
      }

      // Use authenticated API - uses user's rate limit and auto-filters already-blocked users
      const { getOAuthClient } = await import('./oauth')
      const client = await getOAuthClient()

      const session = await client.restore(userDid)
      const agent = new Agent(session)

      const result = await agent.getFollowers({
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
      return { success: false, followers: [], cursor: undefined }
    }
  })

export const getFollowing = createServerFn({ method: 'GET' })
  .inputValidator((data: { targetDid: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Get authenticated user from httpOnly cookie - prevents DID spoofing
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, following: [], cursor: undefined, error: 'Not authenticated' }
      }

      // Validate targetDid
      if (!isValidDid(data.targetDid)) {
        return { success: false, following: [], cursor: undefined, error: 'Invalid target DID' }
      }

      // Use authenticated API - uses user's rate limit and auto-filters already-blocked users
      const { getOAuthClient } = await import('./oauth')
      const client = await getOAuthClient()

      const session = await client.restore(userDid)
      const agent = new Agent(session)

      const result = await agent.getFollows({
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
      return { success: false, following: [], cursor: undefined }
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
      return { success: false, mutualDids: [] }
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
      return { success: false, blockedDids: [] }
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
      return { success: false }
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
          const err = error as {
            status?: number
            message?: string
            headers?: Record<string, string>
          }

          // Rate limit - return partial progress with error
          if (err.status === 429 || err.message?.includes('Rate Limit')) {
            const resetTimestamp = err.headers?.['ratelimit-reset']
            let resetMessage = 'Rate limit exceeded.'

            if (resetTimestamp) {
              const resetDate = new Date(parseInt(resetTimestamp) * 1000)
              const now = new Date()
              const diffMs = resetDate.getTime() - now.getTime()
              const diffMins = Math.ceil(diffMs / 60000)

              if (diffMins > 0) {
                resetMessage = `Rate limit exceeded. Try again in ${diffMins} minute${diffMins === 1 ? '' : 's'}.`
              } else {
                resetMessage = 'Rate limit exceeded. It should reset any moment now - try again.'
              }
            }

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
          if (err.status === 502 || err.message === 'UpstreamFailure') {
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
