import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Heart, Repeat2, Quote, MessageCircle } from 'lucide-react'
import type { PostPreview } from '@/lib/types'

interface PostPreviewCardProps {
  post: PostPreview
  onClear: () => void
  disabled?: boolean
}

export function PostPreviewCard({ post, onClear, disabled }: PostPreviewCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={post.author.avatar} alt={post.author.handle} />
          <AvatarFallback>
            {post.author.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold text-sm truncate block">
                {post.author.displayName || post.author.handle}
              </span>
              <span className="text-xs text-muted-foreground truncate block">
                @{post.author.handle}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-1 -mr-2 h-8 w-8"
              onClick={onClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {post.text && (
        <p className="text-sm line-clamp-3 whitespace-pre-wrap">{post.text}</p>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          {post.likeCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="h-3.5 w-3.5" />
          {post.repostCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Quote className="h-3.5 w-3.5" />
          {post.quoteCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.replyCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
