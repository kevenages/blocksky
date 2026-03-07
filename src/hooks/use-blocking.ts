import { useState, useCallback } from 'react'
import { getProfile, getFollowers, getFollowing } from '@/lib/auth.server'
import { toast } from 'sonner'
import { useBlockingEngine, isWhitelisted, formatCountdown, estimateTime } from '@/hooks/use-blocking-engine'
import type { User } from '@/hooks/use-auth'
import type { SelectedProfile } from '@/lib/types'

export function useBlocking(user: User | null) {
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
  const [showFollowingConfirm, setShowFollowingConfirm] = useState(false)
  const [blockTarget, setBlockTarget] = useState(true)
  const [targetAlreadyBlocked, setTargetAlreadyBlocked] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const engine = useBlockingEngine(user)

  const handleProfileSelect = useCallback(async (profile: SelectedProfile) => {
    if (!user?.handle) return

    setIsLoadingProfile(true)
    try {
      // Fetch full profile and blocked DIDs in parallel
      const blockedDids = await engine.ensureBlockedCache()

      const result = await getProfile({ data: { handle: profile.handle } })

      const selectedProf = result.success && result.profile ? result.profile : profile
      if (!result.success) {
        toast.error('Could not load full profile details')
      }

      setSelectedProfile(selectedProf)

      // Check if target is already blocked or is self
      const isSelf = selectedProf.handle === user.handle
      const alreadyBlocked = blockedDids.has(selectedProf.did)
      setTargetAlreadyBlocked(alreadyBlocked)
      setBlockTarget(!alreadyBlocked && !isSelf)
    } catch {
      setSelectedProfile(profile)
      setTargetAlreadyBlocked(false)
      setBlockTarget(true)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [user?.handle, engine])

  const clearSelection = useCallback(() => {
    engine.reset()
    setSelectedProfile(null)
    setBlockTarget(true)
    setTargetAlreadyBlocked(false)
  }, [engine])

  const performBlocking = useCallback(async (type: 'followers' | 'following') => {
    if (!selectedProfile || !user?.handle) return

    engine.setBlockingState((prev) => ({
      ...prev,
      isBlocking: true,
      type,
      total: 0,
      blocked: 0,
      skipped: 0,
      failed: 0,
      current: 'Fetching your mutuals and blocked accounts...',
    }))

    try {
      // Ensure caches are populated
      const { mutualDids, blockedDids } = await engine.ensureCaches()
      if (!engine.mountedRef.current) return

      engine.setBlockingState((prev) => ({
        ...prev,
        current: `Fetching ${type}...`,
      }))

      // Fetch all followers/following
      const allUsers: Array<{ did: string; handle: string }> = []
      let cursor: string | undefined

      let pageCount = 0
      do {
        if (!engine.mountedRef.current) return
        pageCount++

        if (type === 'followers') {
          const result = await getFollowers({ data: { targetDid: selectedProfile.did, cursor } })
          if (!engine.mountedRef.current) return
          if (!result.success) {
            console.error('Failed to fetch followers:', result.error, { page: pageCount, fetched: allUsers.length })
            if (allUsers.length === 0) {
              toast.error('Failed to fetch followers. Please try again.')
              engine.setBlockingState((prev) => ({ ...prev, isBlocking: false, current: 'Error fetching followers' }))
              return
            }
            break
          }
          console.log(`Followers page ${pageCount}: got ${result.followers.length}, cursor: ${result.cursor ? 'yes' : 'no'}`)
          allUsers.push(...result.followers)
          cursor = result.cursor
        } else {
          const result = await getFollowing({ data: { targetDid: selectedProfile.did, cursor } })
          if (!engine.mountedRef.current) return
          if (!result.success) {
            console.error('Failed to fetch following:', result.error, { page: pageCount, fetched: allUsers.length })
            if (allUsers.length === 0) {
              toast.error('Failed to fetch following. Please try again.')
              engine.setBlockingState((prev) => ({ ...prev, isBlocking: false, current: 'Error fetching following' }))
              return
            }
            break
          }
          console.log(`Following page ${pageCount}: got ${result.following.length}, cursor: ${result.cursor ? 'yes' : 'no'}`)
          allUsers.push(...result.following)
          cursor = result.cursor
        }

        if (!engine.mountedRef.current) return
        engine.setBlockingState((prev) => ({
          ...prev,
          current: `Found ${allUsers.length.toLocaleString()} ${type}...`,
        }))
      } while (cursor)

      // Log count comparison for debugging
      const expectedCount = type === 'followers' ? selectedProfile.followersCount : selectedProfile.followsCount
      if (expectedCount && Math.abs(allUsers.length - expectedCount) > 10) {
        console.warn(`Count mismatch for ${type}: profile says ${expectedCount}, but fetched ${allUsers.length} (diff: ${expectedCount - allUsers.length})`)
      }

      if (!engine.mountedRef.current) return

      // Count skipped by reason
      let skippedMutuals = 0
      let skippedBlocked = 0
      let skippedOther = 0

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

      // Build final list of DIDs to block
      const targetDids = toBlock.map((u) => u.did)

      // Prepend the target account if user opted to block them too
      const shouldBlockTarget = blockTarget && !targetAlreadyBlocked && selectedProfile.did && !isWhitelisted(selectedProfile.handle)
      if (shouldBlockTarget) {
        targetDids.unshift(selectedProfile.did)
      }

      if (!engine.mountedRef.current) return
      engine.setBlockingState((prev) => ({
        ...prev,
        total: targetDids.length,
        skipped: skippedCount,
        skippedMutuals,
        skippedBlocked,
        current: `Blocking ${targetDids.length.toLocaleString()} users (${skippedCount.toLocaleString()} skipped)...`,
      }))

      if (targetDids.length === 0) {
        if (!engine.mountedRef.current) return
        const reason = skippedBlocked === allUsers.length
          ? 'All already blocked'
          : skippedMutuals === allUsers.length
            ? 'All are your mutuals'
            : `All ${type} already blocked or protected`
        engine.setBlockingState((prev) => ({
          ...prev,
          isBlocking: false,
          blocked: 0,
          skippedMutuals,
          skippedBlocked,
          current: reason,
          completedTypes: prev.completedTypes.includes(type)
            ? prev.completedTypes
            : [...prev.completedTypes, type],
        }))
        toast.info(`Nothing to do — ${reason.toLowerCase()}`)
        return
      }

      // Delegate to engine for actual blocking
      await engine.startBlocking(targetDids, type, { mutuals: skippedMutuals, blocked: skippedBlocked })
    } catch (error) {
      // Ignore abort errors (user navigated away or started new operation)
      if (error instanceof Error && error.name === 'AbortError') return

      toast.error('An error occurred while blocking')
      engine.setBlockingState((prev) => ({
        ...prev,
        isBlocking: false,
        current: 'Error occurred',
      }))
    }
  }, [selectedProfile, user?.handle, blockTarget, targetAlreadyBlocked, engine])

  const handleBlockFollowers = useCallback(async () => {
    if (!selectedProfile || !user?.handle) return
    await performBlocking('followers')
  }, [selectedProfile, user?.handle, performBlocking])

  const handleBlockFollowing = useCallback(async () => {
    if (!selectedProfile || !user?.handle) return
    await performBlocking('following')
  }, [selectedProfile, user?.handle, performBlocking])

  return {
    selectedProfile,
    showFollowingConfirm,
    setShowFollowingConfirm,
    blockTarget,
    setBlockTarget,
    targetAlreadyBlocked,
    isLoadingProfile,
    blockingState: engine.blockingState,
    isAppPasswordAuth: engine.isAppPasswordAuth,
    handleProfileSelect,
    clearSelection,
    handleBlockFollowers,
    handleBlockFollowing,
    formatCountdown,
    estimateTime,
  }
}
