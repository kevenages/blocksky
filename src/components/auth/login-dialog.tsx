import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface LoginDialogProps {
  trigger?: React.ReactNode
}

export function LoginDialog({ trigger }: LoginDialogProps) {
  const [handle, setHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!handle.trim()) {
      toast.error('Please enter your Bluesky handle')
      return
    }

    setIsLoading(true)

    try {
      await login(handle.trim())
      // The login function will redirect to Bluesky OAuth
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to start login. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign in with Bluesky
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to BlockSky</DialogTitle>
          <DialogDescription>
            Enter your Bluesky handle to sign in securely using Bluesky's official OAuth.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="yourname.bsky.social"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You can use your full handle (e.g., user.bsky.social) or just your username if you're on bsky.social
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Bluesky...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Continue with Bluesky
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
