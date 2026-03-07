import { createServerFn } from '@tanstack/react-start'
import { Agent } from '@atproto/api'
import { getCookie } from '@tanstack/start-server-core'
import { logger } from './logger'
import type { PostPreview } from './types'

const DID_REGEX = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/
const POST_URL_REGEX = /^https?:\/\/(bsky\.app|staging\.bsky\.dev)\/profile\/([^/]+)\/post\/([a-zA-Z0-9]+)\/?$/

function isValidDid(did: string): boolean {
  return DID_REGEX.test(did)
}

function getAuthenticatedDid(): string | null {
  const did = getCookie('bsky_did')
  if (!did || !isValidDid(did)) return null
  return did
}

export const resolvePostUrl = createServerFn({ method: 'GET' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean; post: PostPreview | null; error?: string }> => {
    try {
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, post: null, error: 'Not authenticated' }
      }

      const url = data.url?.trim() || ''
      const match = url.match(POST_URL_REGEX)
      if (!match) {
        return { success: false, post: null, error: 'Invalid Bluesky post URL' }
      }

      const [, , handleOrDid, rkey] = match

      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      // Resolve handle to DID if needed
      let did: string
      if (handleOrDid.startsWith('did:')) {
        did = handleOrDid
      } else {
        const resolved = await publicAgent.resolveHandle({ handle: handleOrDid })
        did = resolved.data.did
      }

      // Construct AT-URI
      const uri = `at://${did}/app.bsky.feed.post/${rkey}`

      // Fetch the post
      const result = await publicAgent.getPosts({ uris: [uri] })
      if (!result.data.posts || result.data.posts.length === 0) {
        return { success: false, post: null, error: 'Post not found' }
      }

      const post = result.data.posts[0]

      return {
        success: true,
        post: {
          uri: post.uri,
          cid: post.cid,
          author: {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName || '',
            avatar: post.author.avatar || '',
          },
          text: (post.record as { text?: string })?.text || '',
          likeCount: post.likeCount || 0,
          repostCount: post.repostCount || 0,
          quoteCount: post.quoteCount || 0,
          replyCount: post.replyCount || 0,
          indexedAt: post.indexedAt,
        },
      }
    } catch (error) {
      logger.error('Failed to resolve post URL', error, { action: 'resolve_post', url: data.url })
      return { success: false, post: null, error: 'Failed to resolve post. Check the URL and try again.' }
    }
  })

export const getPostLikes = createServerFn({ method: 'GET' })
  .inputValidator((data: { uri: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, users: [], cursor: undefined, error: 'Not authenticated' }
      }

      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getLikes({
        uri: data.uri,
        limit: 100,
        cursor: data.cursor,
      })

      return {
        success: true,
        users: result.data.likes.map((l) => ({
          did: l.actor.did,
          handle: l.actor.handle,
        })),
        cursor: result.data.cursor,
      }
    } catch (error) {
      logger.error('Failed to fetch post likes', error, { action: 'get_post_likes', uri: data.uri })
      return { success: false, users: [], cursor: undefined, error: 'Failed to fetch likes' }
    }
  })

export const getPostReposts = createServerFn({ method: 'GET' })
  .inputValidator((data: { uri: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, users: [], cursor: undefined, error: 'Not authenticated' }
      }

      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getRepostedBy({
        uri: data.uri,
        limit: 100,
        cursor: data.cursor,
      })

      return {
        success: true,
        users: result.data.repostedBy.map((u) => ({
          did: u.did,
          handle: u.handle,
        })),
        cursor: result.data.cursor,
      }
    } catch (error) {
      logger.error('Failed to fetch post reposts', error, { action: 'get_post_reposts', uri: data.uri })
      return { success: false, users: [], cursor: undefined, error: 'Failed to fetch reposts' }
    }
  })

export const getPostQuotes = createServerFn({ method: 'GET' })
  .inputValidator((data: { uri: string; cursor?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, users: [], cursor: undefined, error: 'Not authenticated' }
      }

      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.app.bsky.feed.getQuotes({
        uri: data.uri,
        limit: 100,
        cursor: data.cursor,
      })

      return {
        success: true,
        users: result.data.posts.map((p) => ({
          did: p.author.did,
          handle: p.author.handle,
        })),
        cursor: result.data.cursor,
      }
    } catch (error) {
      logger.error('Failed to fetch post quotes', error, { action: 'get_post_quotes', uri: data.uri })
      return { success: false, users: [], cursor: undefined, error: 'Failed to fetch quotes' }
    }
  })

export const getPostReplies = createServerFn({ method: 'GET' })
  .inputValidator((data: { uri: string }) => data)
  .handler(async ({ data }) => {
    try {
      const userDid = getAuthenticatedDid()
      if (!userDid) {
        return { success: false, users: [], error: 'Not authenticated' }
      }

      const publicAgent = new Agent({ service: 'https://public.api.bsky.app' })

      const result = await publicAgent.getPostThread({
        uri: data.uri,
        depth: 100,
      })

      // Recursively walk the thread tree to collect all reply authors
      const users = new Map<string, string>()

      function walkReplies(node: unknown) {
        if (!node || typeof node !== 'object') return
        const threadNode = node as { post?: { author?: { did: string; handle: string } }; replies?: unknown[] }

        if (threadNode.post?.author) {
          users.set(threadNode.post.author.did, threadNode.post.author.handle)
        }

        if (Array.isArray(threadNode.replies)) {
          for (const reply of threadNode.replies) {
            walkReplies(reply)
          }
        }
      }

      // Walk replies (skip the root post author — they're the OP, not a replier)
      const thread = result.data.thread as { replies?: unknown[] }
      if (Array.isArray(thread.replies)) {
        for (const reply of thread.replies) {
          walkReplies(reply)
        }
      }

      return {
        success: true,
        users: [...users.entries()].map(([did, handle]) => ({ did, handle })),
      }
    } catch (error) {
      logger.error('Failed to fetch post replies', error, { action: 'get_post_replies', uri: data.uri })
      return { success: false, users: [], error: 'Failed to fetch replies' }
    }
  })
