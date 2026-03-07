import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import { resolvePostUrl, getPostLikes, getPostReposts, getPostQuotes, getPostReplies } from '@/lib/post-interactions.server'
import { useBlockingEngine, isWhitelisted, formatCountdown, estimateTime } from '@/hooks/use-blocking-engine'
import type { User } from '@/hooks/use-auth'
import type { PostPreview, InteractionType } from '@/lib/types'

export function usePostBlocking(user: User | null) {
  const [postUrl, setPostUrl] = useState('')
  const [postPreview, setPostPreview] = useState<PostPreview | null>(null)
  const [isResolvingPost, setIsResolvingPost] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<InteractionType>>(
    new Set(['likes', 'reposts', 'quotes', 'replies'])
  )
  const [isFetchingInteractions, setIsFetchingInteractions] = useState(false)
  const [fetchProgress, setFetchProgress] = useState('')

  const engine = useBlockingEngine(user)

  const resolvePost = useCallback(async (url: string) => {
    setIsResolvingPost(true)
    setResolveError(null)
    setPostPreview(null)

    try {
      const result = await resolvePostUrl({ data: { url } })

      if (!result.success || !result.post) {
        const errorMsg = result.error || 'Failed to resolve post'
        setResolveError(errorMsg)
        analytics.postResolveError(errorMsg)
        return
      }

      setPostPreview(result.post)
      analytics.postResolve(url)
    } catch {
      setResolveError('Failed to resolve post. Check the URL and try again.')
      analytics.postResolveError('Failed to resolve post')
    } finally {
      setIsResolvingPost(false)
    }
  }, [])

  const toggleInteractionType = useCallback((type: InteractionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        // Don't allow deselecting all types
        if (next.size <= 1) return prev
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const handleBlock = useCallback(async () => {
    if (!postPreview || !user?.handle || selectedTypes.size === 0) return

    setIsFetchingInteractions(true)

    try {
      // Ensure caches are populated first
      setFetchProgress('Loading mutuals and blocked accounts...')
      const { mutualDids, blockedDids } = await engine.ensureCaches()
      if (!engine.mountedRef.current) return

      // Collect all users from selected interaction types
      const allUsers = new Map<string, string>() // did → handle

      // Fetch each selected type (paginate fully)
      const types = [...selectedTypes]

      for (const type of types) {
        if (!engine.mountedRef.current) return

        if (type === 'likes') {
          setFetchProgress('Fetching likes...')
          let cursor: string | undefined
          let count = 0
          do {
            const result = await getPostLikes({ data: { uri: postPreview.uri, cursor } })
            if (!result.success) break
            for (const u of result.users) {
              allUsers.set(u.did, u.handle)
            }
            count += result.users.length
            cursor = result.cursor
            setFetchProgress(`Fetching likes... ${count.toLocaleString()} found`)
          } while (cursor)
        }

        if (type === 'reposts') {
          setFetchProgress('Fetching reposts...')
          let cursor: string | undefined
          let count = 0
          do {
            const result = await getPostReposts({ data: { uri: postPreview.uri, cursor } })
            if (!result.success) break
            for (const u of result.users) {
              allUsers.set(u.did, u.handle)
            }
            count += result.users.length
            cursor = result.cursor
            setFetchProgress(`Fetching reposts... ${count.toLocaleString()} found`)
          } while (cursor)
        }

        if (type === 'quotes') {
          setFetchProgress('Fetching quotes...')
          let cursor: string | undefined
          let count = 0
          do {
            const result = await getPostQuotes({ data: { uri: postPreview.uri, cursor } })
            if (!result.success) break
            for (const u of result.users) {
              allUsers.set(u.did, u.handle)
            }
            count += result.users.length
            cursor = result.cursor
            setFetchProgress(`Fetching quotes... ${count.toLocaleString()} found`)
          } while (cursor)
        }

        if (type === 'replies') {
          setFetchProgress('Fetching replies...')
          const result = await getPostReplies({ data: { uri: postPreview.uri } })
          if (result.success) {
            for (const u of result.users) {
              allUsers.set(u.did, u.handle)
            }
            setFetchProgress(`Fetching replies... ${result.users.length.toLocaleString()} found`)
          }
        }
      }

      if (!engine.mountedRef.current) return

      setFetchProgress(`Found ${allUsers.size.toLocaleString()} unique users. Filtering...`)

      analytics.interactionBlockingStart(types, allUsers.size)

      // Filter: skip mutuals, already-blocked, self, whitelisted, and the post author
      let skippedMutuals = 0
      let skippedBlocked = 0

      const toBlock: string[] = []
      for (const [did, handle] of allUsers) {
        if (mutualDids.has(did)) {
          skippedMutuals++
          continue
        }
        if (blockedDids.has(did)) {
          skippedBlocked++
          continue
        }
        if (did === user.did || isWhitelisted(handle)) {
          continue
        }
        // Skip the post author
        if (did === postPreview.author.did) {
          continue
        }
        toBlock.push(did)
      }

      setIsFetchingInteractions(false)
      setFetchProgress('')

      if (toBlock.length === 0) {
        const reason = skippedBlocked === allUsers.size
          ? 'All already blocked'
          : skippedMutuals === allUsers.size
            ? 'All are your mutuals'
            : 'All users already blocked or protected'
        engine.setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          blocked: 0,
          skippedMutuals,
          skippedBlocked,
          current: reason,
          completedTypes: [...prev.completedTypes, 'interactions'],
        }))
        toast.info(`Nothing to do — ${reason.toLowerCase()}`)
        return
      }

      // Hand off to engine
      await engine.startBlocking(toBlock, 'interactions', { mutuals: skippedMutuals, blocked: skippedBlocked })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return

      setIsFetchingInteractions(false)
      setFetchProgress('')
      toast.error('An error occurred while fetching interactions')
    }
  }, [postPreview, user, selectedTypes, engine])

  const clearPost = useCallback(() => {
    engine.reset()
    setPostUrl('')
    setPostPreview(null)
    setResolveError(null)
    setIsFetchingInteractions(false)
    setFetchProgress('')
    setSelectedTypes(new Set(['likes', 'reposts', 'quotes', 'replies']))
  }, [engine])

  return {
    postUrl,
    setPostUrl,
    postPreview,
    isResolvingPost,
    resolveError,
    selectedTypes,
    isFetchingInteractions,
    fetchProgress,
    blockingState: engine.blockingState,
    isAppPasswordAuth: engine.isAppPasswordAuth,
    resolvePost,
    toggleInteractionType,
    handleBlock,
    clearPost,
    formatCountdown,
    estimateTime,
  }
}
