import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { usePostBlocking } from '@/hooks/use-post-blocking'
import { LoginDialog } from '@/components/auth/login-dialog'
import { PostUrlInput } from '@/components/blocking/post-url-input'
import { PostPreviewCard } from '@/components/blocking/post-preview-card'
import { InteractionTypeSelector } from '@/components/blocking/interaction-type-selector'
import { PostBlockingActions } from '@/components/blocking/post-blocking-actions'
import { BlockingProgress } from '@/components/blocking/blocking-progress'

export const Route = createFileRoute('/_app/block-interactions')({
  component: BlockInteractionsPage,
})

function BlockInteractionsPage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  const {
    postUrl,
    setPostUrl,
    postPreview,
    isResolvingPost,
    resolveError,
    selectedTypes,
    isFetchingInteractions,
    fetchProgress,
    blockingState,
    isAppPasswordAuth,
    resolvePost,
    toggleInteractionType,
    handleBlock,
    clearPost,
    formatCountdown,
    estimateTime,
  } = usePostBlocking(user)

  const isBlockingActive = blockingState.isBlocking || isFetchingInteractions

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {postPreview ? 'Block Post Interactions' : 'Find a Post'}
        </CardTitle>
        <CardDescription>
          {postPreview
            ? 'Block users who interacted with this post.'
            : 'Paste a Bluesky post URL to block users who liked, reposted, quoted, or replied.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth gate */}
        {isLoading ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <div className="mb-3 h-4 w-3/4 mx-auto animate-pulse rounded bg-blue-500/20" />
            <div className="h-10 w-40 mx-auto animate-pulse rounded bg-blue-500/30" />
          </div>
        ) : !isAuthenticated ? (
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
        ) : (
          <>
            {/* URL Input (hidden when post is resolved) */}
            {!postPreview && (
              <PostUrlInput
                postUrl={postUrl}
                isResolving={isResolvingPost}
                error={resolveError}
                onUrlChange={setPostUrl}
                onResolve={resolvePost}
              />
            )}

            {/* Post Preview */}
            {postPreview && (
              <>
                <PostPreviewCard
                  post={postPreview}
                  onClear={clearPost}
                  disabled={isBlockingActive}
                />

                <InteractionTypeSelector
                  selectedTypes={selectedTypes}
                  post={postPreview}
                  onToggle={toggleInteractionType}
                  disabled={isBlockingActive}
                />

                <PostBlockingActions
                  post={postPreview}
                  blockingState={blockingState}
                  isAppPasswordAuth={isAppPasswordAuth}
                  selectedTypes={selectedTypes}
                  isFetchingInteractions={isFetchingInteractions}
                  fetchProgress={fetchProgress}
                  onBlock={handleBlock}
                  onClearPost={clearPost}
                  estimateTime={estimateTime}
                />

                <BlockingProgress
                  blockingState={blockingState}
                  formatCountdown={formatCountdown}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
