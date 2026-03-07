import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import type { BlockingState, InteractionType, PostPreview } from '@/lib/types'

interface PostBlockingActionsProps {
  post: PostPreview
  blockingState: BlockingState
  isAppPasswordAuth: boolean
  selectedTypes: Set<InteractionType>
  isFetchingInteractions: boolean
  fetchProgress: string
  onBlock: () => void
  onClearPost: () => void
  estimateTime: (count: number, isAppPassword: boolean) => string
}

export function PostBlockingActions({
  post,
  blockingState,
  isAppPasswordAuth,
  selectedTypes,
  isFetchingInteractions,
  fetchProgress,
  onBlock,
  onClearPost,
  estimateTime,
}: PostBlockingActionsProps) {
  // Fetching interactions state
  if (isFetchingInteractions) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>{fetchProgress || 'Fetching interactions...'}</span>
      </div>
    )
  }

  // Initial state — show block button
  if (!blockingState.isBlocking && blockingState.completedTypes.length === 0 && !blockingState.rateLimitedUntil) {
    // Estimate total users based on selected interaction counts
    const estimatedTotal =
      (selectedTypes.has('likes') ? post.likeCount : 0) +
      (selectedTypes.has('reposts') ? post.repostCount : 0) +
      (selectedTypes.has('quotes') ? post.quoteCount : 0) +
      (selectedTypes.has('replies') ? post.replyCount : 0)

    return (
      <div className="space-y-3">
        {estimatedTotal > 0 && (
          <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="font-medium text-foreground">
              {isAppPasswordAuth ? 'Estimated time' : 'Estimated time (due to Bluesky rate limits)'}
            </p>
            <p className="tabular-nums">
              Up to ~{estimatedTotal.toLocaleString()} users: <strong>{estimateTime(estimatedTotal, isAppPasswordAuth)}</strong>
            </p>
            <p className="text-muted-foreground/70 pt-1">
              Actual count may differ after deduplication and filtering.
            </p>
          </div>
        )}

        <Button
          className="w-full h-auto py-3"
          variant="destructive"
          onClick={onBlock}
          disabled={selectedTypes.size === 0}
        >
          Block {selectedTypes.size > 0 ? [...selectedTypes].join(', ') : 'interactions'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your mutuals will never be blocked
        </p>

        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          <p>Blocking may be rate-limited by Bluesky.</p>
          {blockingState.sessionBlocks > 0 && (
            <p className="mt-1 tabular-nums">
              Session: <strong>{blockingState.sessionBlocks.toLocaleString()}</strong> blocked
            </p>
          )}
        </div>
      </div>
    )
  }

  // Completed state
  if (!blockingState.isBlocking && blockingState.completedTypes.includes('interactions') && !blockingState.rateLimitedUntil) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          className="w-full"
          onClick={onClearPost}
        >
          Block another post
        </Button>

        {/* Ko-fi donation link */}
        <div className="pt-2 border-t">
          <a
            href="https://ko-fi.com/blockskyapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-pink-500 transition-colors"
            onClick={() => analytics.clickExternalLink('https://ko-fi.com/blockskyapp')}
          >
            <Heart className="h-4 w-4" />
            Support BlockSky on Ko-fi
          </a>
        </div>
      </div>
    )
  }

  return null
}
