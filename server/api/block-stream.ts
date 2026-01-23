import { defineEventHandler, readBody, createEventStream, getCookie } from 'h3'
import { Agent, AtpAgent } from '@atproto/api'
import { XRPCError } from '@atproto/xrpc'

const DID_REGEX = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/
const MAX_BATCH_SIZE = 50000 // Maximum DIDs per request

function isValidDid(did: string): boolean {
  return DID_REGEX.test(did)
}

// Type guard for error objects with status/message
function isErrorWithStatus(error: unknown): error is { status?: number; message?: string } {
  if (typeof error !== 'object' || error === null) return false
  const obj = error as Record<string, unknown>
  return (
    (obj.status === undefined || typeof obj.status === 'number') &&
    (obj.message === undefined || typeof obj.message === 'string')
  )
}

// Validate and sanitize timestamp from external source
// Returns a safe timestamp within reasonable bounds (now to 24 hours from now)
function sanitizeResetTimestamp(headerValue: string | undefined): number {
  const DEFAULT_RESET = Date.now() + 5 * 60 * 1000 // 5 minutes from now
  const MAX_WAIT = 24 * 60 * 60 * 1000 // 24 hours max wait

  if (!headerValue) return DEFAULT_RESET

  const parsed = parseInt(headerValue, 10)
  if (isNaN(parsed) || parsed <= 0) return DEFAULT_RESET

  const resetMs = parsed * 1000 // Convert Unix timestamp (seconds) to milliseconds
  const now = Date.now()

  // If reset time is in the past, use default
  if (resetMs <= now) return DEFAULT_RESET

  // If reset time is more than 24 hours away, cap it
  if (resetMs > now + MAX_WAIT) return now + MAX_WAIT

  return resetMs
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default defineEventHandler(async (event) => {
  console.log('[block-stream] Starting...')

  // Get authenticated user from cookie
  const userDid = getCookie(event, 'bsky_did')
  console.log('[block-stream] userDid:', userDid)
  if (!userDid || !isValidDid(userDid)) {
    console.log('[block-stream] Not authenticated')
    return { error: 'Not authenticated' }
  }

  // Read the request body
  const body = await readBody<{ targetDids?: string[] }>(event)
  const targetDids: string[] = body?.targetDids || []

  if (!targetDids.length) {
    return { error: 'No targets provided' }
  }

  // Enforce batch size limit to prevent abuse
  if (targetDids.length > MAX_BATCH_SIZE) {
    return { error: `Too many targets. Maximum is ${MAX_BATCH_SIZE}` }
  }

  // Validate all DIDs
  const invalidDids = targetDids.filter((did) => !isValidDid(did))
  if (invalidDids.length > 0) {
    return { error: `Invalid DIDs: ${invalidDids.length}` }
  }

  // Create agent based on auth method
  let agent: Agent | AtpAgent
  const authMethod = getCookie(event, 'auth_method')
  console.log('[block-stream] authMethod:', authMethod)

  try {
    if (authMethod === 'app_password') {
      // Use stored session tokens for app password auth
      const accessJwt = getCookie(event, 'bsky_access_jwt')
      const refreshJwt = getCookie(event, 'bsky_refresh_jwt')
      console.log('[block-stream] App password auth, has tokens:', !!accessJwt, !!refreshJwt)

      if (!accessJwt || !refreshJwt) {
        return { error: 'Session expired. Please log in again.' }
      }

      const atpAgent = new AtpAgent({ service: 'https://bsky.social' })
      await atpAgent.resumeSession({
        did: userDid,
        handle: getCookie(event, 'bsky_handle') || '',
        accessJwt,
        refreshJwt,
        active: true,
      })
      agent = atpAgent
      console.log('[block-stream] App password agent created')
    } else {
      // Default to OAuth
      console.log('[block-stream] OAuth auth')
      const { getOAuthClient } = await import('../../src/lib/oauth')
      const client = await getOAuthClient()
      const session = await client.restore(userDid)
      agent = new Agent(session)
      console.log('[block-stream] OAuth agent created')
    }
  } catch (authError) {
    console.error('[block-stream] Auth error:', authError)
    return { error: 'Failed to authenticate. Please log in again.' }
  }

  // Create event stream
  const eventStream = createEventStream(event)

  const total = targetDids.length
  let blocked = 0
  let failed = 0

  // Process blocks in the background
  ;(async () => {
    try {
      for (const targetDid of targetDids) {
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
            // Check if it's an XRPCError with headers
            const xrpcError = error instanceof XRPCError ? error : null

            // Safely extract status and message using type guard
            const status = isErrorWithStatus(error) ? error.status : undefined
            const message = isErrorWithStatus(error) ? error.message : undefined

            // Rate limit - send error with reset time from headers
            if (status === 429 || message?.includes('Rate Limit')) {
              // Extract and validate reset timestamp from headers
              const resetHeader = xrpcError?.headers?.['ratelimit-reset']
              const resetAt = sanitizeResetTimestamp(resetHeader)

              await eventStream.push(JSON.stringify({
                type: 'rate_limit',
                blocked,
                failed,
                total,
                resetAt,
                remaining: total - blocked - failed,
              }))
              await eventStream.close()
              return
            }

            // Upstream failure - wait and retry
            if (status === 502 || message === 'UpstreamFailure') {
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
        await eventStream.push(JSON.stringify({
          type: 'progress',
          blocked,
          failed,
          total,
        }))

        // Minimal delay - we'll hit rate limit at 1,666 regardless of speed
        await sleep(5)
      }

      // Send completion
      await eventStream.push(JSON.stringify({
        type: 'complete',
        blocked,
        failed,
        total,
      }))
    } catch (error) {
      await eventStream.push(JSON.stringify({
        type: 'error',
        message: 'An error occurred',
        blocked,
        failed,
        total,
      }))
    } finally {
      await eventStream.close()
    }
  })()

  return eventStream.send()
})
