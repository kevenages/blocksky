import { Users, MessageCircle, VolumeX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type FeatureStatus = 'available' | 'coming-soon' | 'premium'

export interface Feature {
  id: string
  title: string
  description: string
  icon: LucideIcon
  route: string
  status: FeatureStatus
  badge?: string
}

export const features: Feature[] = [
  {
    id: 'block-followers',
    title: 'Block Followers',
    description: 'Mass block followers or following of any account. Your mutuals are always protected.',
    icon: Users,
    route: '/block-followers',
    status: 'available',
  },
  {
    id: 'block-interactions',
    title: 'Block Post Interactions',
    description: 'Block users who liked, reposted, or replied to a specific post.',
    icon: MessageCircle,
    route: '/block-interactions',
    status: 'available',
  },
  {
    id: 'mute',
    title: 'Mute',
    description: 'Mute accounts instead of blocking. They won\'t know and you won\'t see their content.',
    icon: VolumeX,
    route: '/mute',
    status: 'coming-soon',
    badge: 'Coming Soon',
  },
]
