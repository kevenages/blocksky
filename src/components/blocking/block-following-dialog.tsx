import { Button } from '@/components/ui/button'
import { analytics } from '@/lib/analytics'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SelectedProfile } from '@/lib/types'

interface BlockFollowingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProfile: SelectedProfile | null
  onConfirm: () => void
}

export function BlockFollowingDialog({
  open,
  onOpenChange,
  selectedProfile,
  onConfirm,
}: BlockFollowingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block @{selectedProfile?.handle}'s follows?</DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              This will block the accounts that <strong>@{selectedProfile?.handle} follows</strong> — not their followers. These may include popular accounts, news outlets, or people unrelated to why you want to block.
            </p>
            {selectedProfile?.followsCount && selectedProfile.followsCount > 0 && (
              <p className="font-medium tabular-nums text-foreground">
                {selectedProfile.followsCount.toLocaleString()} accounts
              </p>
            )}
            <p>
              Your mutuals will be protected and won't be blocked.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { analytics.blockFollowingCancel(selectedProfile?.handle || ''); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              analytics.blockFollowingConfirm(selectedProfile?.handle || '', selectedProfile?.followsCount || 0)
              onOpenChange(false)
              onConfirm()
            }}
          >
            Block Following
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
