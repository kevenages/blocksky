import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useBlocking } from '@/hooks/use-blocking'
import { ProfileSelector } from '@/components/blocking/profile-selector'
import { BlockingProgress } from '@/components/blocking/blocking-progress'
import { BlockingActions } from '@/components/blocking/blocking-actions'
import { BlockFollowingDialog } from '@/components/blocking/block-following-dialog'

export const Route = createFileRoute('/_app/block-followers')({
  component: BlockFollowersPage,
})

function BlockFollowersPage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  const {
    selectedProfile,
    showFollowingConfirm,
    setShowFollowingConfirm,
    blockTarget,
    setBlockTarget,
    targetAlreadyBlocked,
    isLoadingProfile,
    blockingState,
    isAppPasswordAuth,
    handleProfileSelect,
    clearSelection,
    handleBlockFollowers,
    handleBlockFollowing,
    formatCountdown,
    estimateTime,
  } = useBlocking(user)

  return (
    <>
      <Card className="w-full">
        {/* TODO: Card header should be dynamic per app — e.g. "Find an Account to Mute" for /mute,
            "Find an Account to Block" for /block-followers, etc. Consider moving to feature-registry.ts
            or passing as props from the layout/route. */}
        {!selectedProfile && (
          <CardHeader>
            <CardTitle>Find an Account to Block</CardTitle>
            <CardDescription>
              Search for a Bluesky account to block their followers or who they follow.
            </CardDescription>
          </CardHeader>
        )}
        {selectedProfile && selectedProfile.handle !== user?.handle && (
          <CardHeader>
            <CardTitle>Block @{selectedProfile.handle}'s network</CardTitle>
            <CardDescription>
              Choose to block their followers, who they follow, or both.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          <ProfileSelector
            selectedProfile={selectedProfile}
            isLoadingProfile={isLoadingProfile}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            userHandle={user?.handle}
            onSelect={handleProfileSelect}
            onClear={clearSelection}
          />

          {isAuthenticated && selectedProfile && selectedProfile.handle !== user?.handle && (
            <div className="space-y-4">
              <BlockingActions
                selectedProfile={selectedProfile}
                blockingState={blockingState}
                isAppPasswordAuth={isAppPasswordAuth}
                blockTarget={blockTarget}
                targetAlreadyBlocked={targetAlreadyBlocked}
                setBlockTarget={setBlockTarget}
                setShowFollowingConfirm={setShowFollowingConfirm}
                onBlockFollowers={handleBlockFollowers}
                onClearSelection={clearSelection}
                estimateTime={estimateTime}
              />

              <BlockingProgress
                blockingState={blockingState}
                formatCountdown={formatCountdown}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <BlockFollowingDialog
        open={showFollowingConfirm}
        onOpenChange={setShowFollowingConfirm}
        selectedProfile={selectedProfile}
        onConfirm={handleBlockFollowing}
      />
    </>
  )
}
