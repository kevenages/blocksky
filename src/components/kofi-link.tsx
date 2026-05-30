import { Heart } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'

interface KofiLinkProps {
  className?: string
  size?: 'sm' | 'base'
  label?: string
}

// Shared Ko-fi support link. Used in the post-completion footer and
// inline during blocking to give a contextual donation prompt while
// the user is actively engaged.
export function KofiLink({ className, size = 'base', label = 'Support BlockSky on Ko-fi' }: KofiLinkProps) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <a
      href="https://ko-fi.com/blockskyapp"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-center gap-2 text-muted-foreground hover:text-pink-500 transition-colors',
        textSize,
        className
      )}
      onClick={() => analytics.clickExternalLink('https://ko-fi.com/blockskyapp')}
    >
      <Heart className={iconSize} />
      {label}
    </a>
  )
}
