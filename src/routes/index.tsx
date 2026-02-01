import { useState, useRef, useEffect } from 'react'
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Zap, Lock, X, Loader2, Heart, Clock, Wand2, MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { LoginDialog } from '@/components/auth/login-dialog'
import { ProfileSearch } from '@/components/profile-search'
import { getProfile, getFollowers, getFollowing, getMutuals, getBlockedDids } from '@/lib/auth.server'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { blockUsersClientSide, getBlockingTokens } from '@/lib/client-blocker'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SelectedProfile {
  did: string
  handle: string
  displayName: string
  avatar: string
  description: string
  followersCount?: number
  followsCount?: number
}

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => ({
    error: search.error as string | undefined,
  }),
})

// Get auth method from cookie
function getAuthMethod(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const cookies = Object.fromEntries(
    document.cookie.split(';').map((cookie) => {
      const [key, ...value] = cookie.trim().split('=')
      return [key, decodeURIComponent(value.join('='))]
    })
  )
  return cookies['auth_method']
}

// Bluesky rate limits blocking operations

interface BlockingState {
  isBlocking: boolean
  type: 'followers' | 'following' | null
  total: number
  blocked: number
  skipped: number
  skippedMutuals: number
  skippedBlocked: number
  current: string
  completedTypes: Array<'followers' | 'following'>
  rateLimitedUntil: number | null
  rateLimitRemaining: number | null
  sessionBlocks: number // Total blocks this session
}

function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { error } = useSearch({ from: '/' })
  const navigate = useNavigate()
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [blockingState, setBlockingState] = useState<BlockingState>({
    isBlocking: false,
    type: null,
    total: 0,
    blocked: 0,
    skipped: 0,
    skippedMutuals: 0,
    skippedBlocked: 0,
    current: '',
    completedTypes: [],
    rateLimitedUntil: null,
    rateLimitRemaining: null,
    sessionBlocks: 0,
  })

  // Handle URL error parameters (e.g., from failed OAuth)
  useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        invalid_handle: 'Invalid Bluesky handle. Please check and try again.',
        login_failed: 'Login failed. Please try again.',
        oauth_error: 'Authentication error. Please try again.',
      }
      const message = errorMessages[error] || 'An error occurred. Please try again.'
      toast.error(message)
      // Clear the error from URL
      navigate({ to: '/', search: { error: undefined }, replace: true })
    }
  }, [error, navigate])

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
  }, [blockingState.rateLimitedUntil])

  // Cache for mutuals - only fetch once per session
  const mutualDidsCache = useRef<Set<string> | null>(null)

  // Cache for already-blocked DIDs - only fetch once per session
  const blockedDidsCache = useRef<Set<string> | null>(null)

  // Store pending DIDs for auto-resume after rate limit
  const pendingDidsRef = useRef<string[]>([])
  const blockingTypeRef = useRef<'followers' | 'following' | null>(null)

  // Store temporary tokens for client-side blocking (only during active blocking)
  const tempTokensRef = useRef<{ userDid: string; accessJwt: string; refreshJwt: string } | null>(null)

  // AbortController for cancelling async operations on unmount
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount - abort any pending operations
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleProfileSelect = async (profile: SelectedProfile) => {
    if (!user?.handle) return

    setIsLoadingProfile(true)
    try {
      // Fetch full profile with follower counts
      const result = await getProfile({ data: { handle: profile.handle } })
      if (result.success && result.profile) {
        setSelectedProfile(result.profile)
      } else {
        setSelectedProfile(profile)
        toast.error('Could not load full profile details')
      }
    } catch {
      setSelectedProfile(profile)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const clearSelection = () => {
    // Abort any ongoing operations
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    // Clear pending state
    pendingDidsRef.current = []
    blockingTypeRef.current = null
    tempTokensRef.current = null

    setSelectedProfile(null)
    setBlockingState({
      isBlocking: false,
      type: null,
      total: 0,
      blocked: 0,
      skipped: 0,
      skippedMutuals: 0,
      skippedBlocked: 0,
      current: '',
      completedTypes: [],
      rateLimitedUntil: null,
      rateLimitRemaining: null,
      sessionBlocks: 0,
    })
  }

  const handleBlockFollowers = async () => {
    if (!selectedProfile || !user?.handle) return
    await performBlocking('followers')
  }

  const handleBlockFollowing = async () => {
    if (!selectedProfile || !user?.handle) return
    await performBlocking('following')
  }

// Format milliseconds to human-readable countdown
  const formatCountdown = (ms: number): string => {
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
  // App password: ~50ms delay = ~72 blocks/min = ~4,320/hour (client-side)
  // OAuth: ~5ms delay but rate limited to ~1,666 blocks/hour (server-side)
  const estimateTime = (count: number, isAppPassword: boolean): string => {
    const BLOCKS_PER_MINUTE = isAppPassword ? 72 : 28 // 72 for app password, 28 for OAuth
    const totalMinutes = Math.ceil(count / BLOCKS_PER_MINUTE)

    if (totalMinutes <= 1) {
      return '~1 min'
    }
    if (totalMinutes < 5) {
      return `~${totalMinutes} mins`
    }
    if (totalMinutes < 60) {
      // Round to nearest 5 minutes
      const rounded = Math.round(totalMinutes / 5) * 5
      return `~${rounded} mins`
    }
    // Over an hour - show hours and minutes
    const hours = Math.floor(totalMinutes / 60)
    const mins = Math.round((totalMinutes % 60) / 5) * 5
    if (mins === 0) {
      return `~${hours}h`
    }
    return `~${hours}h ${mins}m`
  }

  // Check if user is logged in with app password
  const isAppPasswordAuth = getAuthMethod() === 'app_password'

  const isWhitelisted = (handle: string): boolean => {
    return handle.endsWith('.bsky.app') || handle.endsWith('.bsky.team') || handle === 'bsky.app'
  }

  // Stream blocks to the server and handle responses
  const streamBlocks = async (targetDids: string[], type: 'followers' | 'following', baseBlocked: number = 0, skipCounts?: { mutuals: number; blocked: number }) => {
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

    if (!response.ok || !response.body) {
      throw new Error('Failed to start blocking')
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

              setBlockingState((prev) => {
                const mutualsCount = skipCounts?.mutuals ?? prev.skippedMutuals
                const blockedCount = skipCounts?.blocked ?? prev.skippedBlocked
                // Dopamine hit - celebratory toast!
                toast.success(`Done! Blocked ${(baseBlocked + data.blocked).toLocaleString()} ${type}`)
                return {
                  ...prev,
                  isBlocking: false,
                  blocked: baseBlocked + data.blocked,
                  skippedMutuals: mutualsCount,
                  skippedBlocked: blockedCount,
                  sessionBlocks: prev.sessionBlocks + (baseBlocked + data.blocked - prev.blocked),
                  current: 'Complete!',
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
  }

  // Resume blocking after rate limit
  const resumeBlocking = async () => {
    const remainingDids = pendingDidsRef.current
    const type = blockingTypeRef.current

    if (remainingDids.length === 0 || !type) return

    try {
      const currentBlocked = blockingState.blocked
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

            setBlockingState((prev) => {
              // Dopamine hit - celebratory toast!
              toast.success(`Done! Blocked ${(currentBlocked + progress.blocked).toLocaleString()} ${type} total`)
              return {
                ...prev,
                isBlocking: false,
                blocked: currentBlocked + progress.blocked,
                sessionBlocks: prev.sessionBlocks + (currentBlocked + progress.blocked - prev.blocked),
                current: 'Complete!',
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
  }

  const performBlocking = async (type: 'followers' | 'following') => {
    if (!selectedProfile || !user?.handle) return

    setBlockingState((prev) => ({
      ...prev,
      isBlocking: true,
      type,
      total: 0,
      blocked: 0,
      skipped: 0,
      current: (mutualDidsCache.current && blockedDidsCache.current) ? `Fetching ${type}...` : 'Fetching your mutuals and blocked accounts...',
    }))

    try {
      // Fetch mutuals and blocked DIDs in parallel if not cached
      if (!mutualDidsCache.current || !blockedDidsCache.current) {
        const [mutualsResult, blockedResult] = await Promise.all([
          mutualDidsCache.current ? Promise.resolve({ mutualDids: [...mutualDidsCache.current] }) : getMutuals({ data: {} }),
          blockedDidsCache.current ? Promise.resolve({ blockedDids: [...blockedDidsCache.current] }) : getBlockedDids({ data: {} }),
        ])
        if (!mountedRef.current) return
        if (!mutualDidsCache.current) {
          mutualDidsCache.current = new Set(mutualsResult.mutualDids || [])
        }
        if (!blockedDidsCache.current) {
          blockedDidsCache.current = new Set(blockedResult.blockedDids || [])
        }
      }

      const mutualDids = mutualDidsCache.current
      const blockedDids = blockedDidsCache.current

      if (!mountedRef.current) return
      setBlockingState((prev) => ({
        ...prev,
        current: `Fetching ${type}...`,
      }))

      // Fetch all followers/following
      const allUsers: Array<{ did: string; handle: string }> = []
      let cursor: string | undefined

      let pageCount = 0
      do {
        if (!mountedRef.current) return
        pageCount++

        if (type === 'followers') {
          const result = await getFollowers({ data: { targetDid: selectedProfile.did, cursor } })
          if (!mountedRef.current) return
          if (!result.success) {
            console.error('Failed to fetch followers:', result.error, { page: pageCount, fetched: allUsers.length })
            if (allUsers.length === 0) {
              toast.error('Failed to fetch followers. Please try again.')
              setBlockingState((prev) => ({ ...prev, isBlocking: false, current: 'Error fetching followers' }))
              return
            }
            // Continue with what we have if we got some
            break
          }
          console.log(`Followers page ${pageCount}: got ${result.followers.length}, cursor: ${result.cursor ? 'yes' : 'no'}`)
          allUsers.push(...result.followers)
          cursor = result.cursor
        } else {
          const result = await getFollowing({ data: { targetDid: selectedProfile.did, cursor } })
          if (!mountedRef.current) return
          if (!result.success) {
            console.error('Failed to fetch following:', result.error, { page: pageCount, fetched: allUsers.length })
            if (allUsers.length === 0) {
              toast.error('Failed to fetch following. Please try again.')
              setBlockingState((prev) => ({ ...prev, isBlocking: false, current: 'Error fetching following' }))
              return
            }
            // Continue with what we have if we got some
            break
          }
          console.log(`Following page ${pageCount}: got ${result.following.length}, cursor: ${result.cursor ? 'yes' : 'no'}`)
          allUsers.push(...result.following)
          cursor = result.cursor
        }

        if (!mountedRef.current) return
        setBlockingState((prev) => ({
          ...prev,
          current: `Found ${allUsers.length.toLocaleString()} ${type}...`,
        }))
      } while (cursor)

      // Log count comparison for debugging
      const expectedCount = type === 'followers' ? selectedProfile.followersCount : selectedProfile.followsCount
      if (expectedCount && Math.abs(allUsers.length - expectedCount) > 10) {
        console.warn(`Count mismatch for ${type}: profile says ${expectedCount}, but fetched ${allUsers.length} (diff: ${expectedCount - allUsers.length})`)
      }

      if (!mountedRef.current) return

      // Count skipped by reason
      let skippedMutuals = 0
      let skippedBlocked = 0
      let skippedOther = 0 // self + whitelisted

      // Filter out mutuals, self, whitelisted, and already-blocked
      const toBlock = allUsers.filter((u) => {
        if (mutualDids.has(u.did)) {
          skippedMutuals++
          return false
        }
        if (blockedDids.has(u.did)) {
          skippedBlocked++
          return false
        }
        if (u.handle === user.handle || isWhitelisted(u.handle)) {
          skippedOther++
          return false
        }
        return true
      })

      const skippedCount = skippedMutuals + skippedBlocked + skippedOther

      if (!mountedRef.current) return
      setBlockingState((prev) => ({
        ...prev,
        total: toBlock.length,
        skipped: skippedCount,
        skippedMutuals,
        skippedBlocked,
        current: `Blocking ${toBlock.length.toLocaleString()} users (${skippedCount.toLocaleString()} skipped)...`,
      }))

      if (toBlock.length === 0) {
        if (!mountedRef.current) return
        setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          blocked: 0,
          current: `No new ${type} to block`,
          completedTypes: prev.completedTypes.includes(type)
            ? prev.completedTypes
            : [...prev.completedTypes, type],
        }))
        return
      }

      // Stream blocking progress in real-time
      const targetDids = toBlock.map((u) => u.did)

      // Store type for potential auto-resume
      blockingTypeRef.current = type

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

        await blockUsersClientSide(targetDids, tokens, (progress) => {
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
            const remainingDids = targetDids.slice(progress.blocked + progress.failed)

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
            if (blockedDidsCache.current) {
              targetDids.forEach(did => blockedDidsCache.current!.add(did))
            }

            setBlockingState((prev) => ({
              ...prev,
              isBlocking: false,
              blocked: progress.blocked,
              sessionBlocks: prev.sessionBlocks + (progress.blocked - prev.blocked),
              current: 'Complete!',
              completedTypes: prev.completedTypes.includes(type)
                ? prev.completedTypes
                : [...prev.completedTypes, type],
            }))
            // Dopamine hit - celebratory toast!
            toast.success(`Done! Blocked ${progress.blocked.toLocaleString()} ${type}`)
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
        await streamBlocks(targetDids, type, 0, { mutuals: skippedMutuals, blocked: skippedBlocked })
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
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex flex-col items-center space-y-3">
            <img src="/logo.png" alt="BlockSky" className="h-24 w-auto" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Block<span className="text-blue-500">Sky</span>
            </h1>
          </div>
          <p className="max-w-[600px] text-lg text-muted-foreground">
            Protect yourself on Bluesky. Mass block followers of problematic accounts with one click.
          </p>
        </div>

        {/* Main Action Card */}
        <Card className="w-full max-w-lg">
          {!selectedProfile && (
            <CardHeader>
              <CardTitle>Find an Account to Block</CardTitle>
              <CardDescription>
                Search for a Bluesky account to block their followers or who they follow.
              </CardDescription>
            </CardHeader>
          )}
          {selectedProfile && (
            <CardHeader>
              <CardTitle>Block @{selectedProfile.handle}'s network</CardTitle>
              <CardDescription>
                Choose to block their followers, who they follow, or both.
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <div className="mb-3 h-4 w-3/4 mx-auto animate-pulse rounded bg-blue-500/20" />
                <div className="h-10 w-40 mx-auto animate-pulse rounded bg-blue-500/30" />
              </div>
            )}

            {!isAuthenticated && !isLoading && (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="mb-3 text-sm text-muted-foreground">
                  Sign in with your Bluesky account to start blocking
                </p>
                <LoginDialog
                  trigger={
                    <Button variant="default">
                      Sign in with Bluesky
                    </Button>
                  }
                />
              </div>
            )}

            {isAuthenticated && !selectedProfile && !isLoadingProfile && (
              <ProfileSearch
                onSelect={handleProfileSelect}
                placeholder="Search by name or handle..."
              />
            )}

            {isLoadingProfile && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {isAuthenticated && selectedProfile && (
              <div className="space-y-4">
                {/* Selected Profile Card */}
                <div className="flex items-start gap-4 rounded-lg border p-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedProfile.avatar} alt={selectedProfile.handle} />
                    <AvatarFallback>
                      {selectedProfile.handle.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">
                          {selectedProfile.displayName || selectedProfile.handle}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{selectedProfile.handle}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 -mt-1 -mr-2"
                        onClick={clearSelection}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedProfile.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {selectedProfile.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>
                        <strong>{selectedProfile.followersCount?.toLocaleString() || '—'}</strong>{' '}
                        <span className="text-muted-foreground">followers</span>
                      </span>
                      <span>
                        <strong>{selectedProfile.followsCount?.toLocaleString() || '—'}</strong>{' '}
                        <span className="text-muted-foreground">following</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Block Options */}
                {!blockingState.isBlocking && blockingState.completedTypes.length === 0 && !blockingState.rateLimitedUntil && (
                  <>
                    {/* Time Estimates */}
                    <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
                      <p className="font-medium text-foreground">
                        {isAppPasswordAuth ? 'Estimated time' : 'Estimated time (due to Bluesky rate limits)'}
                      </p>
                      <div className="flex justify-center gap-6">
                        {selectedProfile.followersCount && selectedProfile.followersCount > 0 && (
                          <span>Followers: <strong>{estimateTime(selectedProfile.followersCount, isAppPasswordAuth)}</strong></span>
                        )}
                        {selectedProfile.followsCount && selectedProfile.followsCount > 0 && (
                          <span>Following: <strong>{estimateTime(selectedProfile.followsCount, isAppPasswordAuth)}</strong></span>
                        )}
                      </div>
                      <p className="text-muted-foreground/70 pt-1">
                        Keep this page open until complete.{' '}
                        <button
                          className="underline hover:text-foreground transition-colors"
                          onClick={() => toast.info('Premium features coming soon! Background blocking will let you close the page.')}
                        >
                          Want to close the page instead?
                        </button>
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={handleBlockFollowers}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Block Followers
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleBlockFollowing}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Block Following
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      Your mutuals will never be blocked
                    </p>

                    {/* Rate limit info */}
                    <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                      <p>Blocking may be rate-limited by Bluesky.</p>
                      {blockingState.sessionBlocks > 0 && (
                        <p className="mt-1">
                          Session: <strong>{blockingState.sessionBlocks.toLocaleString()}</strong> blocked
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Rate Limit Warning */}
                {blockingState.rateLimitedUntil && blockingState.rateLimitRemaining && (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Bluesky rate limit reached</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Bluesky limits how fast you can block accounts. This is enforced by Bluesky's API, not BlockSky.
                    </p>
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCountdown(blockingState.rateLimitRemaining)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        until you can continue blocking
                      </p>
                      {blockingState.total - blockingState.blocked > 0 && (
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-2">
                          {(blockingState.total - blockingState.blocked).toLocaleString()} accounts remaining
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Blocked {blockingState.blocked.toLocaleString()} of {blockingState.total.toLocaleString()} so far. Will auto-resume when ready.
                    </p>
                    {blockingState.sessionBlocks > 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Session total: {blockingState.sessionBlocks.toLocaleString()} blocked
                      </p>
                    )}
                  </div>
                )}

                {/* Blocking Progress */}
                {(blockingState.isBlocking || blockingState.completedTypes.length > 0) && !blockingState.rateLimitedUntil && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">
                      {blockingState.isBlocking ? blockingState.current : 'Complete!'}
                    </div>

                    {blockingState.total > 0 && blockingState.isBlocking && (
                      <Progress
                        value={(blockingState.blocked / blockingState.total) * 100}
                        className="h-2"
                      />
                    )}

                    {blockingState.isBlocking && blockingState.total > 0 && (
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">
                          {blockingState.blocked.toLocaleString()} blocked
                        </span>
                        <span className="text-muted-foreground">
                          {blockingState.skipped.toLocaleString()} skipped
                        </span>
                      </div>
                    )}

                    {!blockingState.isBlocking && (
                      <div className="space-y-3">
                        {/* Summary - stacked vertically */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
                          <div className={blockingState.blocked > 0 ? 'text-green-600 font-semibold' : 'text-muted-foreground/70'}>
                            {blockingState.blocked.toLocaleString()} blocked
                          </div>
                          <div className={blockingState.skippedMutuals > 0 ? 'text-blue-600 font-semibold' : 'text-muted-foreground/70'}>
                            {blockingState.skippedMutuals.toLocaleString()} mutuals protected
                          </div>
                          <div className={blockingState.skippedBlocked > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}>
                            {blockingState.skippedBlocked.toLocaleString()} already blocked
                          </div>
                        </div>

                        {/* Show buttons for remaining types */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {!blockingState.completedTypes.includes('followers') && (
                            <Button
                              className="w-full"
                              variant="destructive"
                              onClick={handleBlockFollowers}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Block Followers
                            </Button>
                          )}
                          {!blockingState.completedTypes.includes('following') && (
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={handleBlockFollowing}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Block Following
                            </Button>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={clearSelection}
                        >
                          Block another account
                        </Button>

                        {/* Ko-fi donation link */}
                        <div className="pt-2 border-t">
                          <a
                            href="https://ko-fi.com/blockskyapp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-pink-500 transition-colors"
                          >
                            <Heart className="h-4 w-4" />
                            Support BlockSky on Ko-fi
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
          <Card>
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Mutual Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We never block your mutuals - people you follow who also follow you back.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Zap className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Real-time Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Watch as accounts are blocked in real-time with detailed progress updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Lock className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Secure OAuth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your credentials are never stored. We use Bluesky's official OAuth.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Wand2 className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Automatic Blocking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Block thousands of accounts automatically while you wait.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Links Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-8 w-full max-w-4xl bg-muted/30 rounded-lg px-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://bsky.app/profile/blocksky.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 600 530" fill="currentColor">
                    <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"/>
                  </svg>
                  @blocksky.app
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Follow us on Bluesky for updates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://ko-fi.com/blockskyapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-pink-500 transition-colors"
                >
                  <Heart className="h-5 w-5" />
                  Support us on Ko-fi
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help keep BlockSky free for everyone</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://forms.gle/2AEBdooVL12AjgLN8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-green-500 transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  Send Feedback
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help us improve BlockSky</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="close-page">
              <AccordionTrigger>Can I close the page while blocking?</AccordionTrigger>
              <AccordionContent>
                No, you need to keep the page open until blocking completes. If you close or navigate away, blocking will stop. Any accounts already blocked will stay blocked, but remaining accounts won't be processed. If you hit a rate limit, BlockSky will automatically resume when the limit resets - just keep the page open.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="speed">
              <AccordionTrigger>Why does blocking take so long?</AccordionTrigger>
              <AccordionContent>
                Bluesky limits how fast you can perform actions like blocking through their API. This rate limit is enforced by Bluesky, not BlockSky. If you hit the limit, BlockSky will automatically pause and resume when the limit resets.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="login-methods">
              <AccordionTrigger>What's the difference between Quick Login and App Password?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2"><strong>Quick Login (OAuth)</strong> is more secure. Your credentials are never shared with BlockSky - you authenticate directly with Bluesky. However, blocking runs through our server, which may hit rate limits faster.</p>
                <p><strong>App Password</strong> allows faster blocking because requests go directly from your browser to Bluesky (like the original BlockSky). The tradeoff is that your session tokens are temporarily accessible to JavaScript during active blocking. You can revoke app passwords anytime in Bluesky Settings → Privacy → App Passwords.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="old-version">
              <AccordionTrigger>Why did the older version of BlockSky seem faster?</AccordionTrigger>
              <AccordionContent>
                The older version ran blocking directly in your browser. If you sign in with an App Password, BlockSky uses this same faster approach. OAuth users get enhanced security but may hit rate limits sooner.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="safety">
              <AccordionTrigger>Is this safe to use? Will my account get banned?</AccordionTrigger>
              <AccordionContent>
                BlockSky uses Bluesky's official authentication methods (OAuth and App Passwords) and respects their rate limits. We don't do anything that violates Bluesky's terms of service. Blocking accounts is a standard feature that Bluesky provides to all users.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="credentials">
              <AccordionTrigger>Do you store my password or credentials?</AccordionTrigger>
              <AccordionContent>
                No. With OAuth (Quick Login), you authenticate directly with Bluesky - we never see your password. With App Password, the password is sent to Bluesky's servers to create a session, but we don't store it. Session tokens are kept in secure HTTP-only cookies. For App Password users, tokens are only made available to JavaScript temporarily during active blocking operations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mutuals">
              <AccordionTrigger>What are mutuals and why aren't they blocked?</AccordionTrigger>
              <AccordionContent>
                Mutuals are accounts that you follow who also follow you back. BlockSky automatically protects these relationships by never blocking your mutuals, even if they follow the account you're targeting.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="undo">
              <AccordionTrigger>Can I undo or unblock everyone?</AccordionTrigger>
              <AccordionContent>
                Currently, BlockSky only handles blocking. To unblock accounts, you'll need to do so through Bluesky directly in your Settings &gt; Moderation &gt; Blocked accounts. We may add bulk unblocking in a future update.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="skipped">
              <AccordionTrigger>Why are some accounts skipped?</AccordionTrigger>
              <AccordionContent>
                Accounts are skipped if they're your mutuals, if you've already blocked them, or if they're official Bluesky accounts (like @bsky.app). This prevents accidentally blocking important accounts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data">
              <AccordionTrigger>What data do you collect?</AccordionTrigger>
              <AccordionContent>
                We collect minimal anonymous analytics to improve the service. We don't track who you block or store your block list. Your Bluesky profile information is only used during your session and isn't permanently stored.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}
