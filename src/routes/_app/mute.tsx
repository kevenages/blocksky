import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/coming-soon-page'
import { features } from '@/lib/feature-registry'

export const Route = createFileRoute('/_app/mute')({
  component: MutePage,
})

function MutePage() {
  const feature = features.find((f) => f.id === 'mute')!
  return <ComingSoonPage feature={feature} />
}
