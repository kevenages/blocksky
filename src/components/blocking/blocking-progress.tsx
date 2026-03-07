import { Clock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { BlockingState } from '@/lib/types'

interface BlockingProgressProps {
  blockingState: BlockingState
  formatCountdown: (ms: number) => string
}

export function BlockingProgress({ blockingState, formatCountdown }: BlockingProgressProps) {
  // Rate Limit Warning
  if (blockingState.rateLimitedUntil && blockingState.rateLimitRemaining) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Bluesky rate limit reached</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Bluesky limits how fast you can block accounts. This is enforced by Bluesky's API, not BlockSky.
        </p>
        <div className="text-center">
          <div className="text-3xl font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {formatCountdown(blockingState.rateLimitRemaining)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            until you can continue blocking
          </p>
          {blockingState.total - blockingState.blocked > 0 && (
            <p className="text-sm font-medium tabular-nums text-amber-600 dark:text-amber-400 mt-2">
              {(blockingState.total - blockingState.blocked).toLocaleString()} accounts remaining
            </p>
          )}
        </div>
        <p className="text-xs tabular-nums text-muted-foreground text-center">
          Blocked {blockingState.blocked.toLocaleString()} of {blockingState.total.toLocaleString()} so far. Will auto-resume when ready.
        </p>
        {blockingState.sessionBlocks > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground text-center mt-2">
            Session total: {blockingState.sessionBlocks.toLocaleString()} blocked
          </p>
        )}
      </div>
    )
  }

  // Blocking Progress (active or completed)
  if (!blockingState.isBlocking && blockingState.completedTypes.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {blockingState.isBlocking ? blockingState.current : blockingState.blocked > 0 ? 'Complete!' : blockingState.current || 'Complete!'}
      </div>

      {blockingState.total > 0 && blockingState.isBlocking && (
        <Progress
          value={(blockingState.blocked / blockingState.total) * 100}
          className="h-2"
        />
      )}

      {blockingState.isBlocking && blockingState.total > 0 && (
        <div className="flex gap-4 text-sm tabular-nums">
          <span className="text-green-600">
            {blockingState.blocked.toLocaleString()} blocked
          </span>
          <span className="text-muted-foreground">
            {blockingState.skipped.toLocaleString()} skipped
          </span>
        </div>
      )}

      {!blockingState.isBlocking && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm tabular-nums">
          <div className={blockingState.blocked > 0 ? 'text-green-600 font-semibold' : 'text-muted-foreground/70'}>
            {blockingState.blocked.toLocaleString()} blocked
          </div>
          {blockingState.failed > 0 && (
            <div className="text-amber-600 font-semibold">
              {blockingState.failed.toLocaleString()} failed (likely already blocked)
            </div>
          )}
          <div className={blockingState.skippedMutuals > 0 ? 'text-blue-600 font-semibold' : 'text-muted-foreground/70'}>
            {blockingState.skippedMutuals.toLocaleString()} mutuals protected
          </div>
          <div className={blockingState.skippedBlocked > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}>
            {blockingState.skippedBlocked.toLocaleString()} already blocked
          </div>
        </div>
      )}
    </div>
  )
}
