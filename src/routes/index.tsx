import { useState, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, Users, Zap, Lock, X, Loader2, Heart, Clock, Wand2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { LoginDialog } from '@/components/auth/login-dialog'
import { ProfileSearch } from '@/components/profile-search'
import { getProfile, getFollowers, getFollowing, getMutuals } from '@/lib/auth.server'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

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
})

interface BlockingState {
  isBlocking: boolean
  type: 'followers' | 'following' | null
  total: number
  blocked: number
  skipped: number
  current: string
  completedTypes: Array<'followers' | 'following'>
  rateLimitedUntil: number | null
  rateLimitRemaining: number | null
}

function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [blockingState, setBlockingState] = useState<BlockingState>({
    isBlocking: false,
    type: null,
    total: 0,
    blocked: 0,
    skipped: 0,
    current: '',
    completedTypes: [],
    rateLimitedUntil: null,
    rateLimitRemaining: null,
  })

  // Countdown timer for rate limit
  useEffect(() => {
    if (!blockingState.rateLimitedUntil) return

    const updateRemaining = () => {
      const remaining = Math.max(0, blockingState.rateLimitedUntil! - Date.now())
      setBlockingState(prev => ({ ...prev, rateLimitRemaining: remaining }))

      if (remaining <= 0) {
        // Check if there are still accounts to block
        const accountsRemaining = blockingState.total - blockingState.blocked
        setBlockingState(prev => ({
          ...prev,
          rateLimitedUntil: null,
          rateLimitRemaining: null,
          current: accountsRemaining > 0
            ? `Ready to continue - ${accountsRemaining} accounts remaining`
            : 'Ready to continue'
        }))
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [blockingState.rateLimitedUntil, blockingState.total, blockingState.blocked, blockingState.skipped])

  // Cache for mutuals - only fetch once per session
  const mutualDidsCache = useRef<Set<string> | null>(null)

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
    setSelectedProfile(null)
    setBlockingState({
      isBlocking: false,
      type: null,
      total: 0,
      blocked: 0,
      skipped: 0,
      current: '',
      completedTypes: [],
      rateLimitedUntil: null,
      rateLimitRemaining: null,
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

// Format milliseconds to MM:SS
  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isWhitelisted = (handle: string): boolean => {
    return handle.endsWith('.bsky.app') || handle.endsWith('.bsky.team') || handle === 'bsky.app'
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
      current: mutualDidsCache.current ? `Fetching ${type}...` : 'Fetching your mutuals...',
    }))

    try {
      // Use cached mutuals if available, otherwise fetch
      // Note: We don't need to fetch blocked users - the authenticated API
      // for getFollowers/getFollowing already filters them out automatically
      if (!mutualDidsCache.current) {
        const mutualsResult = await getMutuals({ data: {} })
        mutualDidsCache.current = new Set(mutualsResult.mutualDids || [])
      }

      const mutualDids = mutualDidsCache.current

      setBlockingState((prev) => ({
        ...prev,
        current: `Fetching ${type}...`,
      }))

      // Fetch all followers/following
      const allUsers: Array<{ did: string; handle: string }> = []
      let cursor: string | undefined

      do {
        if (type === 'followers') {
          const result = await getFollowers({ data: { targetDid: selectedProfile.did, cursor } })
          if (!result.success) break
          allUsers.push(...result.followers)
          cursor = result.cursor
        } else {
          const result = await getFollowing({ data: { targetDid: selectedProfile.did, cursor } })
          if (!result.success) break
          allUsers.push(...result.following)
          cursor = result.cursor
        }

        setBlockingState((prev) => ({
          ...prev,
          current: `Found ${allUsers.length} ${type}...`,
        }))
      } while (cursor)

      // Filter out mutuals, self, and whitelisted
      // Note: Already blocked users are automatically filtered by the authenticated API
      const toBlock = allUsers.filter(
        (u) =>
          !mutualDids.has(u.did) &&
          u.handle !== user.handle &&
          !isWhitelisted(u.handle)
      )

      const skippedCount = allUsers.length - toBlock.length

      setBlockingState((prev) => ({
        ...prev,
        total: toBlock.length,
        skipped: skippedCount,
        current: `Blocking ${toBlock.length} users (${skippedCount} skipped)...`,
      }))

      if (toBlock.length === 0) {
        setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          current: `No ${type} to block (${skippedCount} skipped - mutuals or already blocked)`,
        }))
        toast.info(`No new ${type} to block!`)
        return
      }

      // Stream blocking progress in real-time
      const targetDids = toBlock.map((u) => u.did)

      const response = await fetch('/api/block-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDids }),
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

        // Process complete messages (SSE format: "event: message\ndata: {...}\n\n")
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setBlockingState((prev) => ({
                  ...prev,
                  blocked: data.blocked,
                  current: `Blocked ${data.blocked} of ${data.total} users...`,
                }))
              } else if (data.type === 'rate_limit') {
                // Use reset time from server headers, or fallback to 5 minutes
                const rateLimitedUntil = data.resetAt || Date.now() + 5 * 60 * 1000
                const remaining = data.remaining || 0
                setBlockingState((prev) => ({
                  ...prev,
                  isBlocking: false,
                  blocked: data.blocked,
                  total: data.total,
                  current: remaining > 0
                    ? `Rate limited - ${remaining} accounts remaining`
                    : 'Rate limit exceeded',
                  rateLimitedUntil,
                  rateLimitRemaining: rateLimitedUntil - Date.now(),
                  // Don't mark as completed if there are remaining accounts
                  completedTypes: remaining === 0 && data.blocked > 0 && !prev.completedTypes.includes(type)
                    ? [...prev.completedTypes, type]
                    : prev.completedTypes,
                }))
                if (data.blocked > 0) {
                  toast.success(`Blocked ${data.blocked} users before rate limit! ${remaining > 0 ? `${remaining} remaining.` : ''}`)
                }
                return
              } else if (data.type === 'complete') {
                setBlockingState((prev) => ({
                  ...prev,
                  isBlocking: false,
                  blocked: data.blocked,
                  current: 'Complete!',
                  completedTypes: prev.completedTypes.includes(type)
                    ? prev.completedTypes
                    : [...prev.completedTypes, type],
                }))
                toast.success(`Blocked ${data.blocked} users!`)
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
    } catch {
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
                      <div>
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
                        className="shrink-0"
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
                  </>
                )}

                {/* Rate Limit Warning */}
                {blockingState.rateLimitedUntil && blockingState.rateLimitRemaining && (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Rate limit reached</span>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCountdown(blockingState.rateLimitRemaining)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        until you can continue blocking
                      </p>
                      {blockingState.total - blockingState.blocked > 0 && (
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-2">
                          {blockingState.total - blockingState.blocked} accounts remaining
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Blocked {blockingState.blocked} of {blockingState.total} so far. Rate limits are set by Bluesky.
                    </p>
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
                          {blockingState.blocked} blocked
                        </span>
                        <span className="text-muted-foreground">
                          {blockingState.skipped} skipped
                        </span>
                      </div>
                    )}

                    {!blockingState.isBlocking && (
                      <div className="space-y-2">
                        {/* Show which types have been completed */}
                        <div className="flex flex-wrap gap-2 text-sm">
                          {blockingState.completedTypes.includes('followers') && (
                            <span className="text-green-600">✓ Followers blocked</span>
                          )}
                          {blockingState.completedTypes.includes('following') && (
                            <span className="text-green-600">✓ Following blocked</span>
                          )}
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
      </div>
    </div>
  )
}
