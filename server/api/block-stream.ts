import { defineEventHandler, readBody, createEventStream, getCookie } from 'h3'
import { Agent } from '@atproto/api'
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
  // Get authenticated user from cookie
  const userDid = getCookie(event, 'bsky_did')
  if (!userDid || !isValidDid(userDid)) {
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

  // Get OAuth session and create agent
  const { getOAuthClient } = await import('../../src/lib/oauth')
  const client = await getOAuthClient()
  const session = await client.restore(userDid)
  const agent = new Agent(session)

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

        // Small delay between blocks
        await sleep(25)
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
