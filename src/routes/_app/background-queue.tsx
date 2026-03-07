import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/coming-soon-page'
import { features } from '@/lib/feature-registry'

export const Route = createFileRoute('/_app/background-queue')({
  component: BackgroundQueuePage,
})

function BackgroundQueuePage() {
  const feature = features.find((f) => f.id === 'background-queue')!
  return <ComingSoonPage feature={feature} />
}
