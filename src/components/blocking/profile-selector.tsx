import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Loader2 } from 'lucide-react'
import { LoginDialog } from '@/components/auth/login-dialog'
import { ProfileSearch } from '@/components/profile-search'
import { DigDugGame } from '@/components/dig-dug-game'
import { analytics } from '@/lib/analytics'
import type { SelectedProfile } from '@/lib/types'

interface ProfileSelectorProps {
  selectedProfile: SelectedProfile | null
  isLoadingProfile: boolean
  isAuthenticated: boolean
  isLoading: boolean
  userHandle: string | undefined
  onSelect: (profile: SelectedProfile) => void
  onClear: () => void
}

export function ProfileSelector({
  selectedProfile,
  isLoadingProfile,
  isAuthenticated,
  isLoading,
  userHandle,
  onSelect,
  onClear,
}: ProfileSelectorProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <div className="mb-3 h-4 w-3/4 mx-auto animate-pulse rounded bg-blue-500/20" />
        <div className="h-10 w-40 mx-auto animate-pulse rounded bg-blue-500/30" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
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
    )
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!selectedProfile) {
    return (
      <ProfileSearch
        onSelect={onSelect}
        placeholder="Search by name or handle..."
      />
    )
  }

  // Easter egg - searching for yourself
  if (selectedProfile.handle === userHandle) {
    return (
      <div className="space-y-4" ref={(el) => { if (el && !el.dataset.tracked) { el.dataset.tracked = '1'; analytics.easterEggFound() } }}>
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <p className="font-mono font-bold text-base tracking-widest text-blue-500">
              PLAYER 1 READY
            </p>
            <p className="font-mono text-sm text-black dark:text-white">
              Swipe or arrow keys to dig &bull; Avoid the blobs
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -mt-1 -mr-2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <DigDugGame />
      </div>
    )
  }

  // Selected profile card
  return (
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
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {selectedProfile.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {selectedProfile.description}
          </p>
        )}
        <div className="mt-2 flex gap-4 text-sm tabular-nums">
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
  )
}
