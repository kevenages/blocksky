import { Button } from '@/components/ui/button'
import { Users, Heart } from 'lucide-react'
import { FaRegCircleCheck, FaRegCircleXmark } from 'react-icons/fa6'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SelectedProfile, BlockingState } from '@/lib/types'

interface BlockingActionsProps {
  selectedProfile: SelectedProfile
  blockingState: BlockingState
  isAppPasswordAuth: boolean
  blockTarget: boolean
  targetAlreadyBlocked: boolean
  setBlockTarget: React.Dispatch<React.SetStateAction<boolean>>
  setShowFollowingConfirm: (show: boolean) => void
  onBlockFollowers: () => void
  onClearSelection: () => void
  estimateTime: (count: number, isAppPassword: boolean) => string
}

export function BlockingActions({
  selectedProfile,
  blockingState,
  isAppPasswordAuth,
  blockTarget,
  targetAlreadyBlocked,
  setBlockTarget,
  setShowFollowingConfirm,
  onBlockFollowers,
  onClearSelection,
  estimateTime,
}: BlockingActionsProps) {
  // Initial state — show block options
  if (!blockingState.isBlocking && blockingState.completedTypes.length === 0 && !blockingState.rateLimitedUntil) {
    return (
      <>
        {/* Time Estimates */}
        <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
          <p className="font-medium text-foreground">
            {isAppPasswordAuth ? 'Estimated time' : 'Estimated time (due to Bluesky rate limits)'}
          </p>
          <div className="flex justify-center gap-6 tabular-nums">
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

        {/* Block target account toggle */}
        {targetAlreadyBlocked ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground px-1 cursor-default">
                  <FaRegCircleCheck className="h-4 w-4 text-green-600 shrink-0" />
                  <span>@{selectedProfile.handle} already blocked</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>You've already blocked this account</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div
            role="checkbox"
            aria-checked={blockTarget}
            tabIndex={0}
            className="flex items-center gap-2 text-sm px-1 cursor-pointer select-none"
            onClick={() => setBlockTarget((prev) => { analytics.blockAlsoTargetToggle(!prev); return !prev })}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setBlockTarget((prev) => { analytics.blockAlsoTargetToggle(!prev); return !prev }) } }}
          >
            {blockTarget ? (
              <FaRegCircleCheck className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <FaRegCircleXmark className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={blockTarget ? 'text-foreground' : 'text-muted-foreground'}>
              Also block @{selectedProfile.handle}
            </span>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="w-full h-auto py-3"
            variant="destructive"
            onClick={onBlockFollowers}
          >
            <div className="flex flex-col items-center min-w-0 w-full">
              <span className="flex items-center">
                <Users className="mr-2 h-4 w-4 shrink-0" />
                Block Followers
              </span>
              <span className="text-xs font-normal opacity-80 mt-0.5 truncate max-w-full">
                People who follow @{selectedProfile.handle}
              </span>
            </div>
          </Button>
          <Button
            className="w-full h-auto py-3"
            variant="outline"
            onClick={() => setShowFollowingConfirm(true)}
          >
            <div className="flex flex-col items-center min-w-0 w-full">
              <span className="flex items-center">
                <Users className="mr-2 h-4 w-4 shrink-0" />
                Block Following
              </span>
              <span className="text-xs font-normal opacity-60 mt-0.5 truncate max-w-full">
                Accounts followed by @{selectedProfile.handle}
              </span>
            </div>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your mutuals will never be blocked
        </p>

        {/* Rate limit info */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          <p>Blocking may be rate-limited by Bluesky.</p>
          {blockingState.sessionBlocks > 0 && (
            <p className="mt-1 tabular-nums">
              Session: <strong>{blockingState.sessionBlocks.toLocaleString()}</strong> blocked
            </p>
          )}
        </div>
      </>
    )
  }

  // Completed state — show remaining type buttons + block another
  if (!blockingState.isBlocking && blockingState.completedTypes.length > 0 && !blockingState.rateLimitedUntil) {
    return (
      <div className="space-y-3">
        {/* Show buttons for remaining types */}
        <div className="grid gap-2 sm:grid-cols-2">
          {!blockingState.completedTypes.includes('followers') && (
            <Button
              className="w-full h-auto py-3"
              variant="destructive"
              onClick={onBlockFollowers}
            >
              <div className="flex flex-col items-center min-w-0 w-full">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4 shrink-0" />
                  Block Followers
                </span>
                <span className="text-xs font-normal opacity-80 mt-0.5 truncate max-w-full">
                  People who follow @{selectedProfile.handle}
                </span>
              </div>
            </Button>
          )}
          {!blockingState.completedTypes.includes('following') && (
            <Button
              className="w-full h-auto py-3"
              variant="outline"
              onClick={() => setShowFollowingConfirm(true)}
            >
              <div className="flex flex-col items-center min-w-0 w-full">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4 shrink-0" />
                  Block Following
                </span>
                <span className="text-xs font-normal opacity-60 mt-0.5 truncate max-w-full">
                  Accounts followed by @{selectedProfile.handle}
                </span>
              </div>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full"
          onClick={onClearSelection}
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
