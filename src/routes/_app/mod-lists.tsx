import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/coming-soon-page'
import { features } from '@/lib/feature-registry'

export const Route = createFileRoute('/_app/mod-lists')({
  component: ModListsPage,
})

function ModListsPage() {
  const feature = features.find((f) => f.id === 'mod-lists')!
  return <ComingSoonPage feature={feature} />
}
