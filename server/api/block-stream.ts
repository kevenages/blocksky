import { defineEventHandler, readBody, createEventStream, getCookie } from 'h3'
import { Agent } from '@atproto/api'

const DID_REGEX = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/

function isValidDid(did: string): boolean {
  return DID_REGEX.test(did)
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
            const err = error as {
              status?: number
              message?: string
            }

            // Rate limit - send error and stop
            if (err.status === 429 || err.message?.includes('Rate Limit')) {
              await eventStream.push(JSON.stringify({
                type: 'rate_limit',
                blocked,
                failed,
                total,
              }))
              await eventStream.close()
              return
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
        await eventStream.push(JSON.stringify({
          type: 'progress',
          blocked,
          failed,
          total,
        }))

        // Small delay between blocks
        await sleep(10)
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
