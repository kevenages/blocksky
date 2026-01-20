import { useState, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, Users, Zap, Lock, X, Loader2, Heart } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { LoginDialog } from '@/components/auth/login-dialog'
import { ProfileSearch } from '@/components/profile-search'
import { getProfile, getFollowers, getFollowing, getMutuals, blockUsersBatch } from '@/lib/auth.server'
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
  })

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

  const BATCH_SIZE = 200 // Same as old app - larger batches = fewer API calls
  const MAX_BLOCKS_PER_HOUR = 1666 // Bluesky rate limit: 5000 points/hr ÷ 3 points/block

  const formatEstimatedTime = (count: number): string => {
    if (!count || count === 0) return ''
    const hours = count / MAX_BLOCKS_PER_HOUR
    if (hours < 1) {
      const minutes = Math.ceil(hours * 60)
      return `~${minutes} min`
    } else if (hours < 24) {
      const wholeHours = Math.floor(hours)
      const minutes = Math.round((hours - wholeHours) * 60)
      if (minutes === 0) return `~${wholeHours} hr`
      return `~${wholeHours} hr ${minutes} min`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      if (remainingHours === 0) return `~${days} day${days > 1 ? 's' : ''}`
      return `~${days} day${days > 1 ? 's' : ''} ${remainingHours} hr`
    }
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

      // Block in batches
      let blocked = 0
      let failed = 0

      for (let i = 0; i < toBlock.length; i += BATCH_SIZE) {
        const batch = toBlock.slice(i, i + BATCH_SIZE)
        const batchDids = batch.map((u) => u.did)

        try {
          const result = await blockUsersBatch({ data: { targetDids: batchDids } })

          if (result.success) {
            blocked += result.blocked
          } else {
            failed += batchDids.length
            toast.error(`Failed to block batch: ${(result as { error?: string }).error || 'Unknown error'}`)
          }
        } catch {
          failed += batchDids.length
          toast.error('Failed to block batch')
        }

        setBlockingState((prev) => ({
          ...prev,
          blocked,
          current: `Blocked ${blocked} of ${toBlock.length} users...`,
        }))

        // Delay between batches to avoid rate limits
        // Bluesky: ~5000 points/5min, applyWrites ~3 points/write
        // 200 writes = 600 points per batch
        // Using 5 sec delay - can tune based on actual rate limit behavior
        if (i + BATCH_SIZE < toBlock.length) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }

      // Only mark as completed if we actually blocked some users
      if (blocked > 0) {
        setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          current: 'Complete!',
          completedTypes: prev.completedTypes.includes(type)
            ? prev.completedTypes
            : [...prev.completedTypes, type],
        }))
        toast.success(`Blocked ${blocked} users!`)
      } else {
        setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          current: failed > 0 ? 'Failed - rate limit exceeded' : 'No users to block',
        }))
        if (failed > 0) {
          toast.error('Rate limit exceeded. Please wait ~1 hour and try again.')
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
                {!blockingState.isBlocking && blockingState.completedTypes.length === 0 && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={handleBlockFollowers}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Block Followers
                        </Button>
                        {selectedProfile.followersCount && selectedProfile.followersCount > 0 && (
                          <p className="text-xs text-center text-muted-foreground">
                            {formatEstimatedTime(selectedProfile.followersCount)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleBlockFollowing}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Block Following
                        </Button>
                        {selectedProfile.followsCount && selectedProfile.followsCount > 0 && (
                          <p className="text-xs text-center text-muted-foreground">
                            {formatEstimatedTime(selectedProfile.followsCount)}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      Your mutuals will never be blocked
                    </p>
                  </>
                )}

                {/* Blocking Progress */}
                {(blockingState.isBlocking || blockingState.completedTypes.length > 0) && (
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
              <Shield className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Batch Blocking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Block hundreds of accounts efficiently with our optimized batch processing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
