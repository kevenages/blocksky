import { createServerFn } from '@tanstack/react-start'
import { Agent } from '@atproto/api'
import { setCookie, getCookie } from '@tanstack/start-server-core'

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
      console.error('[OAuth] Authorize failed')
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
      console.error('[OAuth Callback] Authentication failed')
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
      console.error('[Search] Search failed')
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
      console.error('[GetProfile] Failed to fetch profile')
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
      console.error('[GetFollowers] Failed to fetch followers')
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
      console.error('[GetFollowing] Failed to fetch following')
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
      console.error('[GetMutuals] Failed to fetch mutuals')
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
      console.error('[GetBlockedDids] Failed to fetch blocked users')
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

      return { success: true }
    } catch (error) {
      console.error('[BlockUser] Failed to block user')
      return { success: false }
    }
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const blockUsersBatch = createServerFn({ method: 'POST' })
  .inputValidator((data: { targetDids: string[] }) => data)
  .handler(async ({ data }) => {
    // Get authenticated user from httpOnly cookie - prevents DID spoofing
    const userDid = getAuthenticatedDid()
    if (!userDid) {
      return { success: false, blocked: 0, error: 'Not authenticated' }
    }

    // Validate all targetDids
    const invalidDids = data.targetDids.filter((did) => !isValidDid(did))
    if (invalidDids.length > 0) {
      return { success: false, blocked: 0, error: `Invalid DIDs: ${invalidDids.length} invalid` }
    }

    const { getOAuthClient } = await import('./oauth')
    const client = await getOAuthClient()

    const session = await client.restore(userDid)
    const agent = new Agent(session)

    const createdAt = new Date().toISOString()

    const writes = data.targetDids.map((did) => ({
      $type: 'com.atproto.repo.applyWrites#create' as const,
      collection: 'app.bsky.graph.block',
      value: {
        subject: did,
        createdAt,
        $type: 'app.bsky.graph.block',
      },
    }))

    // Retry logic for rate limits and upstream failures
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await agent.com.atproto.repo.applyWrites({
          repo: userDid,
          writes,
        })

        return { success: true, blocked: data.targetDids.length }
      } catch (error: unknown) {
        const err = error as {
          status?: number
          message?: string
          error?: string
          headers?: Record<string, string>
        }

        // Rate limit - check if we should wait or give up
        if (err.status === 429 || err.message?.includes('Rate Limit')) {
          if (attempt === 2) {
            // Try to get the reset time from headers
            const resetTimestamp = err.headers?.['ratelimit-reset']
            let resetMessage = 'Rate limit exceeded.'

            if (resetTimestamp) {
              const resetDate = new Date(parseInt(resetTimestamp) * 1000)
              const now = new Date()
              const diffMs = resetDate.getTime() - now.getTime()
              const diffMins = Math.ceil(diffMs / 60000)

              if (diffMins > 0) {
                resetMessage = `Rate limit exceeded. Try again in ${diffMins} minute${diffMins === 1 ? '' : 's'} (resets at ${resetDate.toLocaleTimeString()}).`
              } else {
                resetMessage = 'Rate limit exceeded. It should reset any moment now - try again.'
              }
            } else {
              resetMessage = 'Rate limit exceeded. Please wait ~1 hour for your Bluesky rate limit to reset.'
            }

            return {
              success: false,
              blocked: 0,
              error: resetMessage
            }
          }
          await sleep(10000)
          continue
        }

        // Upstream failure - wait 1 second and retry
        if (err.status === 502 || err.message === 'UpstreamFailure') {
          await sleep(1000)
          continue
        }

        // Socket error - usually means server closed connection (often due to rate limiting)
        if (err.message?.includes('UND_ERR_SOCKET') || err.message?.includes('socket')) {
          await sleep(5000)
          continue
        }

        // Other error - don't retry
        return { success: false, blocked: 0, error: 'Block operation failed' }
      }
    }

    // All retries exhausted
    return { success: false, blocked: 0, error: 'Max retries exceeded' }
  })
