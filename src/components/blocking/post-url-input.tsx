import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Link as LinkIcon } from 'lucide-react'

const POST_URL_REGEX = /^https?:\/\/(bsky\.app|staging\.bsky\.dev)\/profile\/[^/]+\/post\/[a-zA-Z0-9]+\/?$/

interface PostUrlInputProps {
  postUrl: string
  isResolving: boolean
  error: string | null
  onUrlChange: (url: string) => void
  onResolve: (url: string) => void
}

export function PostUrlInput({ postUrl, isResolving, error, onUrlChange, onResolve }: PostUrlInputProps) {
  const isValid = POST_URL_REGEX.test(postUrl.trim())

  const handleSubmit = useCallback(() => {
    const url = postUrl.trim()
    if (POST_URL_REGEX.test(url)) {
      onResolve(url)
    }
  }, [postUrl, onResolve])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim()
    if (POST_URL_REGEX.test(pasted)) {
      // Set the value and auto-submit
      onUrlChange(pasted)
      setTimeout(() => onResolve(pasted), 0)
    }
  }, [onUrlChange, onResolve])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid) {
      handleSubmit()
    }
  }, [isValid, handleSubmit])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={postUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Paste a Bluesky post URL"
            className="pl-9"
            disabled={isResolving}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isResolving}
        >
          {isResolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Look up'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Example: https://bsky.app/profile/handle.bsky.social/post/abc123
      </p>
    </div>
  )
}
