export type BlockingType = 'followers' | 'following' | 'interactions'
export type InteractionType = 'likes' | 'reposts' | 'quotes' | 'replies'

export interface SelectedProfile {
  did: string
  handle: string
  displayName: string
  avatar: string
  description: string
  followersCount?: number
  followsCount?: number
}

export interface PostPreview {
  uri: string
  cid: string
  author: {
    did: string
    handle: string
    displayName: string
    avatar: string
  }
  text: string
  likeCount: number
  repostCount: number
  quoteCount: number
  replyCount: number
  indexedAt: string
}

export interface BlockingState {
  isBlocking: boolean
  type: BlockingType | null
  total: number
  blocked: number
  skipped: number
  skippedMutuals: number
  skippedBlocked: number
  failed: number
  current: string
  completedTypes: BlockingType[]
  rateLimitedUntil: number | null
  rateLimitRemaining: number | null
  sessionBlocks: number
}
