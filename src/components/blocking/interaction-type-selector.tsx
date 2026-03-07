import { Heart, Repeat2, Quote, MessageCircle } from 'lucide-react'
import { FaRegCircleCheck, FaRegCircleXmark } from 'react-icons/fa6'
import type { InteractionType, PostPreview } from '@/lib/types'

interface InteractionTypeSelectorProps {
  selectedTypes: Set<InteractionType>
  post: PostPreview
  onToggle: (type: InteractionType) => void
  disabled?: boolean
}

const interactionOptions: Array<{
  type: InteractionType
  label: string
  icon: typeof Heart
  countKey: keyof PostPreview
}> = [
  { type: 'likes', label: 'Likes', icon: Heart, countKey: 'likeCount' },
  { type: 'reposts', label: 'Reposts', icon: Repeat2, countKey: 'repostCount' },
  { type: 'quotes', label: 'Quotes', icon: Quote, countKey: 'quoteCount' },
  { type: 'replies', label: 'Replies', icon: MessageCircle, countKey: 'replyCount' },
]

export function InteractionTypeSelector({ selectedTypes, post, onToggle, disabled }: InteractionTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Block users who:</p>
      <div className="grid grid-cols-2 gap-2">
        {interactionOptions.map(({ type, label, icon: Icon, countKey }) => {
          const isSelected = selectedTypes.has(type)
          const count = post[countKey] as number

          return (
            <div
              key={type}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : 0}
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-transparent bg-muted/30'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onToggle(type)}
              onKeyDown={(e) => {
                if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                  e.preventDefault()
                  onToggle(type)
                }
              }}
            >
              {isSelected ? (
                <FaRegCircleCheck className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <FaRegCircleXmark className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>
                {label}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                {count.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
