import { useState, useRef, useEffect, useCallback } from 'react'
import { getMutuals, getBlockedDids } from '@/lib/auth.server'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import { blockUsersClientSide, getBlockingTokens } from '@/lib/client-blocker'
import type { User } from '@/hooks/use-auth'
import type { BlockingState, BlockingType } from '@/lib/types'

export const initialBlockingState: BlockingState = {
  isBlocking: false,
  type: null,
  total: 0,
  blocked: 0,
  skipped: 0,
  skippedMutuals: 0,
  skippedBlocked: 0,
  failed: 0,
  current: '',
  completedTypes: [],
  rateLimitedUntil: null,
  rateLimitRemaining: null,
  sessionBlocks: 0,
}

// Get auth method from cookie
export function getAuthMethod(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const cookies = Object.fromEntries(
    document.cookie.split(';').map((cookie) => {
      const [key, ...value] = cookie.trim().split('=')
      return [key, decodeURIComponent(value.join('='))]
    })
  )
  return cookies['auth_method']
}

export function isWhitelisted(handle: string): boolean {
  return handle.endsWith('.bsky.app') || handle.endsWith('.bsky.team') || handle === 'bsky.app'
}

// Format milliseconds to human-readable countdown
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Estimate total time based on blocking speed
export function estimateTime(count: number, isAppPassword: boolean): string {
  const BLOCKS_PER_MINUTE = isAppPassword ? 72 : 28
  const totalMinutes = Math.ceil(count / BLOCKS_PER_MINUTE)

  if (totalMinutes <= 1) {
    return '~1 min'
  }
  if (totalMinutes < 5) {
    return `~${totalMinutes} mins`
  }
  if (totalMinutes < 60) {
    const rounded = Math.round(totalMinutes / 5) * 5
    return `~${rounded} mins`
  }
  const hours = Math.floor(totalMinutes / 60)
  const mins = Math.round((totalMinutes % 60) / 5) * 5
  if (mins === 0) {
    return `~${hours}h`
  }
  return `~${hours}h ${mins}m`
}

export function useBlockingEngine(_user: User | null) {
  const [blockingState, setBlockingState] = useState<BlockingState>(initialBlockingState)

  // Cache for mutuals - only fetch once per session
  const mutualDidsCache = useRef<Set<string> | null>(null)
  // Cache for already-blocked DIDs - only fetch once per session
  const blockedDidsCache = useRef<Set<string> | null>(null)
  // Store pending DIDs for auto-resume after rate limit
  const pendingDidsRef = useRef<string[]>([])
  const blockingTypeRef = useRef<BlockingType | null>(null)
  // Store temporary tokens for client-side blocking (only during active blocking)
  const tempTokensRef = useRef<{ userDid: string; accessJwt: string; refreshJwt: string } | null>(null)
  // AbortController for cancelling async operations on unmount
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Use a ref to always read latest blockingState in callbacks
  const blockingStateRef = useRef(blockingState)
  blockingStateRef.current = blockingState

  // Cleanup on unmount - abort any pending operations
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const isAppPasswordAuth = getAuthMethod() === 'app_password'

  // Stream blocks to the server and handle responses
  const streamBlocks = useCallback(async (targetDids: string[], type: BlockingType, baseBlocked: number = 0, skipCounts?: { mutuals: number; blocked: number }) => {
    // Create new AbortController for this operation
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const response = await fetch('/api/block-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDids }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to start blocking (${response.status})`)
    }
    if (!response.body) {
      throw new Error('No response body from server')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              setBlockingState((prev) => ({
                ...prev,
                blocked: baseBlocked + data.blocked,
                failed: data.failed || 0,
                sessionBlocks: prev.sessionBlocks + (baseBlocked + data.blocked - prev.blocked),
                current: `Blocked ${(baseBlocked + data.blocked).toLocaleString()} of ${prev.total.toLocaleString()} users...`,
              }))
            } else if (data.type === 'rate_limit') {
              const rateLimitedUntil = data.resetAt || Date.now() + 5 * 60 * 1000
              const processedCount = data.blocked + (data.failed || 0)
              const remainingDids = targetDids.slice(processedCount)

              // Store remaining DIDs for auto-resume
              pendingDidsRef.current = remainingDids
              blockingTypeRef.current = type

              setBlockingState((prev) => ({
                ...prev,
                isBlocking: false,
                blocked: baseBlocked + data.blocked,
                sessionBlocks: prev.sessionBlocks + (baseBlocked + data.blocked - prev.blocked),
                current: remainingDids.length > 0
                  ? `Rate limited - ${remainingDids.length.toLocaleString()} accounts remaining`
                  : 'Rate limit exceeded',
                rateLimitedUntil,
                rateLimitRemaining: rateLimitedUntil - Date.now(),
                completedTypes: remainingDids.length === 0 && (baseBlocked + data.blocked) > 0 && !prev.completedTypes.includes(type)
                  ? [...prev.completedTypes, type]
                  : prev.completedTypes,
              }))
              if (data.blocked > 0) {
                toast.success(`Blocked ${data.blocked.toLocaleString()} users before rate limit! ${remainingDids.length > 0 ? `${remainingDids.length.toLocaleString()} remaining - will auto-resume.` : ''}`)
                analytics.blockingRateLimit(data.blocked)
              }
              return
            } else if (data.type === 'complete') {
              // Clear pending DIDs on complete
              pendingDidsRef.current = []
              blockingTypeRef.current = null

              // Add blocked DIDs to cache to prevent re-blocking (Bluesky API has eventual consistency)
              if (blockedDidsCache.current) {
                targetDids.forEach(did => blockedDidsCache.current!.add(did))
              }

              const totalBlocked = baseBlocked + data.blocked
              const totalFailed = data.failed || 0

              setBlockingState((prev) => {
                const mutualsCount = skipCounts?.mutuals ?? prev.skippedMutuals
                const blockedCount = skipCounts?.blocked ?? prev.skippedBlocked

                if (totalBlocked > 0) {
                  toast.success(`Done! Blocked ${totalBlocked.toLocaleString()} users`)
                } else if (totalFailed > 0) {
                  toast.warning(`All ${totalFailed.toLocaleString()} accounts failed to block — they may already be blocked`)
                }
                analytics.blockingComplete(type, totalBlocked)
                return {
                  ...prev,
                  isBlocking: false,
                  blocked: totalBlocked,
                  failed: totalFailed,
                  skippedMutuals: mutualsCount,
                  skippedBlocked: blockedCount,
                  sessionBlocks: prev.sessionBlocks + (totalBlocked - prev.blocked),
                  current: totalBlocked > 0 ? 'Complete!' : totalFailed > 0 ? 'All failed — likely already blocked' : 'Complete!',
                  completedTypes: prev.completedTypes.includes(type)
                    ? prev.completedTypes
                    : [...prev.completedTypes, type],
                }
              })
              return
            } else if (data.type === 'error') {
              throw new Error(data.message || 'Unknown error')
            }
          } catch {
            // Ignore parse errors for incomplete messages
          }
        }
      }
    }
  }, [])

  // Resume blocking after rate limit
  const resumeBlocking = useCallback(async () => {
    const remainingDids = pendingDidsRef.current
    const type = blockingTypeRef.current

    if (remainingDids.length === 0 || !type) return

    // Track that user waited for rate limit and resumed
    analytics.blockingResume(remainingDids.length)

    try {
      const currentBlocked = blockingStateRef.current.blocked
      const authMethod = getAuthMethod()

      // Use client-side blocking for app password users
      if (authMethod === 'app_password' && tempTokensRef.current) {
        await blockUsersClientSide(remainingDids, tempTokensRef.current, (progress) => {
          if (!mountedRef.current) return

          if (progress.type === 'progress') {
            setBlockingState((prev) => ({
              ...prev,
              blocked: currentBlocked + progress.blocked,
              sessionBlocks: prev.sessionBlocks + (currentBlocked + progress.blocked - prev.blocked),
              current: `Blocked ${(currentBlocked + progress.blocked).toLocaleString()} of ${prev.total.toLocaleString()} users...`,
            }))
          } else if (progress.type === 'rate_limit') {
            const rateLimitedUntil = progress.resetAt || Date.now() + 5 * 60 * 1000
            const newRemainingDids = remainingDids.slice(progress.blocked + progress.failed)

            pendingDidsRef.current = newRemainingDids

            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              blocked: currentBlocked + progress.blocked,
              sessionBlocks: prev.sessionBlocks + (currentBlocked + progress.blocked - prev.blocked),
              current: newRemainingDids.length > 0
                ? `Rate limited - ${newRemainingDids.length.toLocaleString()} accounts remaining`
                : 'Rate limit exceeded',
              rateLimitedUntil,
              rateLimitRemaining: rateLimitedUntil - Date.now(),
              completedTypes: newRemainingDids.length === 0 && (currentBlocked + progress.blocked) > 0 && !prev.completedTypes.includes(type)
                ? [...prev.completedTypes, type]
                : prev.completedTypes,
            }))
            if (progress.blocked > 0) {
              toast.success(`Blocked ${progress.blocked.toLocaleString()} more users! ${newRemainingDids.length > 0 ? `${newRemainingDids.length.toLocaleString()} remaining.` : ''}`)
            }
          } else if (progress.type === 'complete') {
            // Clear temporary tokens and pending DIDs
            tempTokensRef.current = null
            pendingDidsRef.current = []
            blockingTypeRef.current = null

            // Add blocked DIDs to cache to prevent re-blocking
            if (blockedDidsCache.current) {
              remainingDids.forEach(did => blockedDidsCache.current!.add(did))
            }

            const totalBlocked = currentBlocked + progress.blocked
            const totalFailed = progress.failed || 0

            setBlockingState((prev) => {
              if (totalBlocked > 0) {
                toast.success(`Done! Blocked ${totalBlocked.toLocaleString()} users total`)
              } else if (totalFailed > 0) {
                toast.warning(`All ${totalFailed.toLocaleString()} accounts failed to block — they may already be blocked`)
              }
              analytics.blockingComplete(type, totalBlocked)
              return {
                ...prev,
                isBlocking: false,
                blocked: totalBlocked,
                failed: totalFailed,
                sessionBlocks: prev.sessionBlocks + (totalBlocked - prev.blocked),
                current: totalBlocked > 0 ? 'Complete!' : totalFailed > 0 ? 'All failed — likely already blocked' : 'Complete!',
                completedTypes: prev.completedTypes.includes(type)
                  ? prev.completedTypes
                  : [...prev.completedTypes, type],
              }
            })
          } else if (progress.type === 'error') {
            tempTokensRef.current = null
            toast.error(progress.error || 'An error occurred while resuming')
            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              current: progress.error || 'Error occurred',
            }))
          }
        })
      } else {
        // Use server-side blocking for OAuth
        await streamBlocks(remainingDids, type, currentBlocked)
      }
    } catch (error) {
      // Ignore abort errors (user navigated away or started new operation)
      if (error instanceof Error && error.name === 'AbortError') return

      tempTokensRef.current = null
      toast.error('An error occurred while resuming')
      setBlockingState((prev) => ({
        ...prev,
        isBlocking: false,
        current: 'Error occurred',
      }))
    }
  }, [streamBlocks])

  // Countdown timer for rate limit
  useEffect(() => {
    if (!blockingState.rateLimitedUntil) return

    const updateRemaining = () => {
      const remaining = Math.max(0, blockingState.rateLimitedUntil! - Date.now())
      setBlockingState(prev => ({ ...prev, rateLimitRemaining: remaining }))

      if (remaining <= 0) {
        // Auto-resume if there are pending DIDs
        if (pendingDidsRef.current.length > 0) {
          setBlockingState(prev => ({
            ...prev,
            rateLimitedUntil: null,
            rateLimitRemaining: null,
            isBlocking: true,
            current: `Resuming - ${pendingDidsRef.current.length} accounts remaining...`
          }))
          // Trigger auto-resume
          resumeBlocking()
        } else {
          setBlockingState(prev => ({
            ...prev,
            rateLimitedUntil: null,
            rateLimitRemaining: null,
            current: 'Ready to continue'
          }))
        }
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [blockingState.rateLimitedUntil, resumeBlocking])

  // Ensure mutuals + blocked caches are populated
  const ensureCaches = useCallback(async (): Promise<{ mutualDids: Set<string>; blockedDids: Set<string> }> => {
    if (!mutualDidsCache.current || !blockedDidsCache.current) {
      const [mutualsResult, blockedResult] = await Promise.all([
        mutualDidsCache.current ? Promise.resolve({ mutualDids: [...mutualDidsCache.current] }) : getMutuals({ data: {} }),
        blockedDidsCache.current ? Promise.resolve({ blockedDids: [...blockedDidsCache.current] }) : getBlockedDids({ data: {} }),
      ])
      if (!mountedRef.current) return { mutualDids: new Set(), blockedDids: new Set() }
      if (!mutualDidsCache.current) {
        mutualDidsCache.current = new Set(mutualsResult.mutualDids || [])
      }
      if (!blockedDidsCache.current) {
        const blockedDids = blockedResult.blockedDids || []
        blockedDidsCache.current = new Set(blockedDids)
        if ('success' in blockedResult && !blockedResult.success) {
          console.warn('[useBlockingEngine] getBlockedDids failed, using empty set')
        } else {
          console.log(`[useBlockingEngine] Cached ${blockedDids.length} blocked DIDs`)
        }
      }
    }
    return { mutualDids: mutualDidsCache.current!, blockedDids: blockedDidsCache.current! }
  }, [])

  // Pre-populate blocked cache (for checking if specific users are already blocked)
  const ensureBlockedCache = useCallback(async (): Promise<Set<string>> => {
    if (!blockedDidsCache.current) {
      const blockedResult = await getBlockedDids({ data: {} })
      if (!mountedRef.current) return new Set()
      const blockedDids = blockedResult.blockedDids || []
      blockedDidsCache.current = new Set(blockedDids)
      if ('success' in blockedResult && !blockedResult.success) {
        console.warn('[useBlockingEngine] getBlockedDids failed, using empty set')
      } else {
        console.log(`[useBlockingEngine] Cached ${blockedDids.length} blocked DIDs`)
      }
    }
    return blockedDidsCache.current
  }, [])

  // Add DIDs to blocked cache (after blocking completes)
  const addToBlockedCache = useCallback((dids: string[]) => {
    if (blockedDidsCache.current) {
      dids.forEach(did => blockedDidsCache.current!.add(did))
    }
  }, [])

  // Start blocking a list of DIDs
  const startBlocking = useCallback(async (
    dids: string[],
    type: BlockingType,
    skipCounts?: { mutuals: number; blocked: number }
  ) => {
    if (dids.length === 0) return

    setBlockingState((prev) => ({
      ...prev,
      isBlocking: true,
      type,
      total: dids.length,
      blocked: 0,
      skipped: 0,
      skippedMutuals: skipCounts?.mutuals ?? 0,
      skippedBlocked: skipCounts?.blocked ?? 0,
      failed: 0,
      current: `Blocking ${dids.length.toLocaleString()} users...`,
    }))

    // Track blocking start
    analytics.blockingStart(type, dids.length)

    // Store type for potential auto-resume
    blockingTypeRef.current = type

    try {
      // Use client-side blocking for app password (faster, avoids server rate limits)
      const authMethod = getAuthMethod()
      if (authMethod === 'app_password') {
        // Fetch tokens on-demand (temporary exposure only during blocking)
        const tokens = await getBlockingTokens()
        if (!tokens) {
          toast.error('Failed to get session tokens. Please log in again.')
          setBlockingState((prev) => ({
            ...prev,
            isBlocking: false,
            current: 'Session error',
          }))
          return
        }

        // Store tokens temporarily for potential auto-resume
        tempTokensRef.current = tokens

        await blockUsersClientSide(dids, tokens, (progress) => {
          if (!mountedRef.current) return

          if (progress.type === 'progress') {
            setBlockingState((prev) => ({
              ...prev,
              blocked: progress.blocked,
              sessionBlocks: prev.sessionBlocks + (progress.blocked - prev.blocked),
              current: `Blocked ${progress.blocked.toLocaleString()} of ${prev.total.toLocaleString()} users...`,
            }))
          } else if (progress.type === 'rate_limit') {
            const rateLimitedUntil = progress.resetAt || Date.now() + 5 * 60 * 1000
            const remainingDids = dids.slice(progress.blocked + progress.failed)

            // Store remaining DIDs for auto-resume (tokens already stored)
            pendingDidsRef.current = remainingDids

            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              blocked: progress.blocked,
              sessionBlocks: prev.sessionBlocks + (progress.blocked - prev.blocked),
              current: remainingDids.length > 0
                ? `Rate limited - ${remainingDids.length.toLocaleString()} accounts remaining`
                : 'Rate limit exceeded',
              rateLimitedUntil,
              rateLimitRemaining: rateLimitedUntil - Date.now(),
              completedTypes: remainingDids.length === 0 && progress.blocked > 0 && !prev.completedTypes.includes(type)
                ? [...prev.completedTypes, type]
                : prev.completedTypes,
            }))
            if (progress.blocked > 0) {
              toast.success(`Blocked ${progress.blocked.toLocaleString()} users before rate limit! ${remainingDids.length > 0 ? `${remainingDids.length.toLocaleString()} remaining - will auto-resume.` : ''}`)
            }
          } else if (progress.type === 'complete') {
            // Clear temporary tokens and pending DIDs
            tempTokensRef.current = null
            pendingDidsRef.current = []
            blockingTypeRef.current = null

            // Add blocked DIDs to cache to prevent re-blocking (Bluesky API has eventual consistency)
            addToBlockedCache(dids)

            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              blocked: progress.blocked,
              failed: progress.failed || 0,
              sessionBlocks: prev.sessionBlocks + (progress.blocked - prev.blocked),
              current: progress.blocked > 0 ? 'Complete!' : (progress.failed || 0) > 0 ? 'All failed — likely already blocked' : 'Complete!',
              completedTypes: prev.completedTypes.includes(type)
                ? prev.completedTypes
                : [...prev.completedTypes, type],
            }))
            if (progress.blocked > 0) {
              toast.success(`Done! Blocked ${progress.blocked.toLocaleString()} users`)
            } else if ((progress.failed || 0) > 0) {
              toast.warning(`All ${(progress.failed || 0).toLocaleString()} accounts failed to block — they may already be blocked`)
            }
            analytics.blockingComplete(type, progress.blocked)
          } else if (progress.type === 'error') {
            tempTokensRef.current = null
            toast.error(progress.error || 'An error occurred while blocking')
            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              current: progress.error || 'Error occurred',
            }))
          }
        })
      } else {
        // Use server-side blocking for OAuth users
        await streamBlocks(dids, type, 0, skipCounts)
      }
    } catch (error) {
      // Ignore abort errors (user navigated away or started new operation)
      if (error instanceof Error && error.name === 'AbortError') return

      tempTokensRef.current = null
      toast.error('An error occurred while blocking')
      setBlockingState((prev) => ({
        ...prev,
        isBlocking: false,
        current: 'Error occurred',
      }))
    }
  }, [streamBlocks, addToBlockedCache])

  // Reset engine state
  const reset = useCallback(() => {
    // Abort any ongoing operations
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    // Clear pending state
    pendingDidsRef.current = []
    blockingTypeRef.current = null
    tempTokensRef.current = null

    setBlockingState(initialBlockingState)
  }, [])

  return {
    blockingState,
    setBlockingState,
    isAppPasswordAuth,
    startBlocking,
    reset,
    ensureCaches,
    ensureBlockedCache,
    addToBlockedCache,
    mountedRef,
    formatCountdown,
    estimateTime,
  }
}
