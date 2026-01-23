// Client-side blocking - runs directly in the browser like the old app
// This avoids server-side rate limit issues
// Tokens are passed in temporarily and cleared after use

import { AtpAgent } from '@atproto/api'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface BlockProgress {
  type: 'progress' | 'rate_limit' | 'complete' | 'error'
  blocked: number
  failed: number
  total: number
  resetAt?: number
  error?: string
}

interface BlockingTokens {
  userDid: string
  accessJwt: string
  refreshJwt: string
}

/**
 * Fetch blocking tokens from server (only for app password auth)
 * Tokens are fetched on-demand and should be cleared after use
 */
export async function getBlockingTokens(): Promise<BlockingTokens | null> {
  try {
    const response = await fetch('/api/get-blocking-tokens')
    const data = await response.json()

    if (!data.success || !data.tokens) {
      console.error('Failed to get blocking tokens:', data.error)
      return null
    }

    return data.tokens
  } catch (error) {
    console.error('Error fetching blocking tokens:', error)
    return null
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessJwt: string; refreshJwt: string } | null> {
  try {
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    })

    if (!response.ok) {
      console.error('Token refresh failed:', response.status)
      return null
    }

    const data = await response.json()
    return { accessJwt: data.accessJwt, refreshJwt: data.refreshJwt }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Block users client-side (like the old app)
 * This runs directly in the browser, making requests to bsky.social
 * Tokens are passed in and used only for this operation
 */
export async function blockUsersClientSide(
  targetDids: string[],
  tokens: BlockingTokens,
  onProgress: (progress: BlockProgress) => void
): Promise<void> {
  let { accessJwt, refreshJwt } = tokens
  const { userDid } = tokens

  // Create agent for authenticated requests
  const agent = new AtpAgent({ service: 'https://bsky.social' })
  agent.setHeader('Authorization', `Bearer ${accessJwt}`)

  const total = targetDids.length
  let blocked = 0
  let failed = 0

  for (let i = 0; i < targetDids.length; i++) {
    const targetDid = targetDids[i]

    // Refresh token every 50 blocks (like old app)
    if (i > 0 && i % 50 === 0) {
      const newTokens = await refreshAccessToken(refreshJwt)
      if (newTokens) {
        accessJwt = newTokens.accessJwt
        refreshJwt = newTokens.refreshJwt
        agent.setHeader('Authorization', `Bearer ${accessJwt}`)
      }
    }

    let success = false
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
        success = true
        break
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string; headers?: Record<string, string> }

        // Rate limit
        if (err.status === 429 || err.message?.includes('Rate Limit')) {
          const resetHeader = err.headers?.['ratelimit-reset']
          const resetAt = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 5 * 60 * 1000

          onProgress({
            type: 'rate_limit',
            blocked,
            failed,
            total,
            resetAt,
          })
          return
        }

        // Auth error - try refreshing token
        if (err.status === 401 && attempt < 2) {
          const newTokens = await refreshAccessToken(refreshJwt)
          if (newTokens) {
            accessJwt = newTokens.accessJwt
            refreshJwt = newTokens.refreshJwt
            agent.setHeader('Authorization', `Bearer ${accessJwt}`)
            continue
          }
        }

        // Upstream failure - wait and retry
        if (err.status === 502 || err.message === 'UpstreamFailure') {
          await sleep(500)
          continue
        }

        // Other error - retry
        if (attempt < 2) {
          await sleep(100)
        }
      }
    }

    if (!success) {
      failed++
    }

    // Send progress update
    onProgress({
      type: 'progress',
      blocked,
      failed,
      total,
    })

    // 50ms delay like old app
    await sleep(50)
  }

  // Complete
  onProgress({
    type: 'complete',
    blocked,
    failed,
    total,
  })
}
